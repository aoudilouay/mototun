using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using mototun.API.Services.Settings;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;

namespace mototun.API.Services.Reminders;

public class StuckDossierReminderHostedService : BackgroundService
{
    private static readonly CarteGriseStatus[] OpenStatuses =
    {
        CarteGriseStatus.PendingDocuments,
        CarteGriseStatus.DocumentsReceived,
        CarteGriseStatus.InProgress,
        CarteGriseStatus.DepotAntt
    };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<StuckDossierReminderOptions> _optionsMonitor;
    private readonly ILogger<StuckDossierReminderHostedService> _logger;

    public StuckDossierReminderHostedService(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<StuckDossierReminderOptions> optionsMonitor,
        ILogger<StuckDossierReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _optionsMonitor.CurrentValue;

            try
            {
                if (options.Enabled)
                {
                    await ProcessStuckDossiersAsync(options, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stuck dossier reminder run failed");
            }

            try
            {
                await Task.Delay(options.GetScanInterval(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task ProcessStuckDossiersAsync(StuckDossierReminderOptions options, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IStuckDossierReminderDispatcher>();

        var now = DateTime.UtcNow;

        var invoices = await context.Invoices
            .Where(i => OpenStatuses.Contains(i.CarteGriseStatus))
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r.User)
            .Include(i => i.AssignedFournisseur)
                .ThenInclude(f => f!.User)
            .OrderBy(i => i.UpdatedAt)
            .Take(options.GetMaxInvoicesPerRun())
            .ToListAsync(cancellationToken);

        if (invoices.Count == 0)
        {
            return;
        }

        var revendeurIds = invoices
            .Select(i => i.RevendeurId)
            .Distinct()
            .ToList();

        var persistedSettingsByRevendeur = revendeurIds.Count == 0
            ? new Dictionary<int, RevendeurSettings>()
            : await context.RevendeurSettings
                .AsNoTracking()
                .Where(s => revendeurIds.Contains(s.RevendeurId))
                .ToDictionaryAsync(s => s.RevendeurId, cancellationToken);

        var invoiceIds = invoices.Select(i => i.Id).ToList();
        var latestDocumentByInvoice = await context.ClientPortalDocuments
            .AsNoTracking()
            .Where(d => invoiceIds.Contains(d.InvoiceId))
            .GroupBy(d => d.InvoiceId)
            .Select(g => new
            {
                InvoiceId = g.Key,
                LastDocumentAt = g.Max(d => d.UpdatedAt)
            })
            .ToDictionaryAsync(x => x.InvoiceId, x => x.LastDocumentAt, cancellationToken);

        var timelineEvents = await context.InvoiceTimelineEvents
            .AsNoTracking()
            .Where(e => invoiceIds.Contains(e.InvoiceId))
            .Select(e => new TimelineEventSnapshot
            {
                InvoiceId = e.InvoiceId,
                EventType = e.EventType,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var timelineByInvoice = timelineEvents
            .GroupBy(e => e.InvoiceId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var pendingTimelineEvents = new List<InvoiceTimelineEvent>();
        var remindersSent = 0;
        var escalationsSent = 0;

        foreach (var invoice in invoices)
        {
            if (!timelineByInvoice.TryGetValue(invoice.Id, out var eventsForInvoice))
            {
                eventsForInvoice = new List<TimelineEventSnapshot>();
                timelineByInvoice[invoice.Id] = eventsForInvoice;
            }

            persistedSettingsByRevendeur.TryGetValue(invoice.RevendeurId, out var settingsForRevendeur);
            var effectiveSettings = RevendeurSettingsPolicy.BuildEffective(settingsForRevendeur);
            var stuckCutoff = now.AddHours(-effectiveSettings.StuckAfterHours);
            var escalationCutoff = now.AddHours(-effectiveSettings.EscalationAfterHours);
            var reminderCooldownCutoff = now.AddHours(-effectiveSettings.RepeatEveryHours);

            latestDocumentByInvoice.TryGetValue(invoice.Id, out var latestDocumentAt);
            var lastActivityAt = ComputeLastActivityAt(invoice, latestDocumentAt, eventsForInvoice);

            if (lastActivityAt > stuckCutoff)
            {
                continue;
            }

            var recipients = BuildRecipients(invoice);
            if (recipients.Count == 0)
            {
                continue;
            }

            if (effectiveSettings.EnableEscalation && lastActivityAt <= escalationCutoff)
            {
                var lastEscalationAt = eventsForInvoice
                    .Where(e => e.EventType == InvoiceTimelineEventType.StuckEscalationTriggered)
                    .Select(e => (DateTime?)e.CreatedAt)
                    .OrderByDescending(v => v)
                    .FirstOrDefault();

                if (!lastEscalationAt.HasValue || lastEscalationAt.Value < reminderCooldownCutoff)
                {
                    var escalationPolicy = BuildDispatchPolicy(options, effectiveSettings, isEscalation: true);
                    var escalationChannels = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (var recipient in recipients)
                    {
                        var dispatchResult = await dispatcher.DispatchAsync(
                            invoice,
                            recipient,
                            now,
                            lastActivityAt,
                            escalationPolicy,
                            cancellationToken);

                        foreach (var channel in dispatchResult.ChannelsSent)
                        {
                            escalationChannels.Add(channel);
                        }
                    }

                    if (escalationChannels.Count > 0)
                    {
                        var inactiveHours = Math.Max(1, (int)Math.Round((now - lastActivityAt).TotalHours, MidpointRounding.AwayFromZero));
                        pendingTimelineEvents.Add(new InvoiceTimelineEvent
                        {
                            InvoiceId = invoice.Id,
                            EventType = InvoiceTimelineEventType.StuckEscalationTriggered,
                            Title = "Escalade dossier bloque",
                            Message = $"Escalade automatique apres {inactiveHours} heure(s) d'inactivite via {string.Join(", ", escalationChannels)}.",
                            CreatedAt = now
                        });

                        eventsForInvoice.Add(new TimelineEventSnapshot
                        {
                            InvoiceId = invoice.Id,
                            EventType = InvoiceTimelineEventType.StuckEscalationTriggered,
                            CreatedAt = now
                        });

                        escalationsSent++;
                        continue;
                    }
                }
            }

            var reminderPolicy = BuildDispatchPolicy(options, effectiveSettings, isEscalation: false);
            foreach (var recipient in recipients)
            {
                var reminderEventType = ResolveReminderEventType(recipient.Role);
                var lastReminderAt = eventsForInvoice
                    .Where(e => e.EventType == reminderEventType)
                    .Select(e => (DateTime?)e.CreatedAt)
                    .OrderByDescending(v => v)
                    .FirstOrDefault();

                if (lastReminderAt.HasValue && lastReminderAt.Value >= reminderCooldownCutoff)
                {
                    continue;
                }

                var dispatchResult = await dispatcher.DispatchAsync(
                    invoice,
                    recipient,
                    now,
                    lastActivityAt,
                    reminderPolicy,
                    cancellationToken);

                if (!dispatchResult.SentAny)
                {
                    continue;
                }

                var channels = string.Join(", ", dispatchResult.ChannelsSent);
                pendingTimelineEvents.Add(new InvoiceTimelineEvent
                {
                    InvoiceId = invoice.Id,
                    EventType = reminderEventType,
                    Title = BuildReminderTitle(recipient.Role),
                    Message = $"Rappel automatique envoye via {channels}. Derniere activite utile: {lastActivityAt:yyyy-MM-dd HH:mm} UTC.",
                    CreatedAt = now
                });

                eventsForInvoice.Add(new TimelineEventSnapshot
                {
                    InvoiceId = invoice.Id,
                    EventType = reminderEventType,
                    CreatedAt = now
                });

                remindersSent++;
            }
        }

        if (pendingTimelineEvents.Count > 0)
        {
            context.InvoiceTimelineEvents.AddRange(pendingTimelineEvents);
            await context.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Stuck dossier reminder run completed. Checked: {InvoiceCount}. Reminders sent: {ReminderCount}. Escalations sent: {EscalationCount}",
            invoices.Count,
            remindersSent,
            escalationsSent);
    }

    private static List<ReminderRecipient> BuildRecipients(Invoice invoice)
    {
        var recipients = new List<ReminderRecipient>();

        if (invoice.Client is not null)
        {
            recipients.Add(new ReminderRecipient
            {
                Role = ReminderRecipientRole.Client,
                DisplayName = invoice.Client.FullName,
                Email = invoice.Client.Email,
                Phone = invoice.Client.Phone
            });
        }

        if (invoice.Revendeur?.User is not null)
        {
            recipients.Add(new ReminderRecipient
            {
                Role = ReminderRecipientRole.Revendeur,
                DisplayName = string.IsNullOrWhiteSpace(invoice.Revendeur.BusinessName)
                    ? invoice.Revendeur.User.FullName
                    : invoice.Revendeur.BusinessName,
                Email = invoice.Revendeur.User.Email,
                Phone = invoice.Revendeur.User.Phone
            });
        }

        if (invoice.AssignedFournisseur?.User is not null)
        {
            recipients.Add(new ReminderRecipient
            {
                Role = ReminderRecipientRole.Fournisseur,
                DisplayName = string.IsNullOrWhiteSpace(invoice.AssignedFournisseur.BusinessName)
                    ? invoice.AssignedFournisseur.User.FullName
                    : invoice.AssignedFournisseur.BusinessName,
                Email = invoice.AssignedFournisseur.User.Email,
                Phone = invoice.AssignedFournisseur.User.Phone
            });
        }

        return recipients;
    }

    private static DateTime ComputeLastActivityAt(
        Invoice invoice,
        DateTime? latestDocumentAt,
        IReadOnlyCollection<TimelineEventSnapshot> eventsForInvoice)
    {
        var latestTimelineBusinessEvent = eventsForInvoice
            .Where(e => !IsReminderEvent(e.EventType))
            .Select(e => (DateTime?)e.CreatedAt)
            .OrderByDescending(v => v)
            .FirstOrDefault();

        var lastActivityAt = invoice.CreatedAt;
        lastActivityAt = Max(lastActivityAt, invoice.UpdatedAt);
        lastActivityAt = Max(lastActivityAt, invoice.CarteGriseStatusUpdatedAt);
        lastActivityAt = Max(lastActivityAt, invoice.DocumentIssueUpdatedAt);
        lastActivityAt = Max(lastActivityAt, invoice.ClientUpdateUpdatedAt);
        lastActivityAt = Max(lastActivityAt, invoice.SentToFournisseurAt);
        lastActivityAt = Max(lastActivityAt, latestDocumentAt);
        lastActivityAt = Max(lastActivityAt, latestTimelineBusinessEvent);

        return lastActivityAt;
    }

    private static DateTime Max(DateTime current, DateTime? candidate)
    {
        if (!candidate.HasValue)
        {
            return current;
        }

        return candidate.Value > current ? candidate.Value : current;
    }

    private static bool IsReminderEvent(InvoiceTimelineEventType eventType)
    {
        return eventType is InvoiceTimelineEventType.StuckReminderSentToClient
            or InvoiceTimelineEventType.StuckReminderSentToRevendeur
            or InvoiceTimelineEventType.StuckReminderSentToFournisseur
            or InvoiceTimelineEventType.StuckEscalationTriggered;
    }

    private static ReminderDispatchPolicy BuildDispatchPolicy(
        StuckDossierReminderOptions options,
        RevendeurSettingsPolicy.EffectiveRevendeurSettings settings,
        bool isEscalation)
    {
        return new ReminderDispatchPolicy
        {
            EnableEmail = settings.EnableEmail && options.EnableEmail,
            EnableSms = settings.EnableSms && options.EnableSms,
            EnableWhatsApp = settings.EnableWhatsApp && options.EnableWhatsApp,
            SmsWebhookUrl = options.SmsWebhookUrl,
            WhatsAppWebhookUrl = options.WhatsAppWebhookUrl,
            IsEscalation = isEscalation
        };
    }

    private static InvoiceTimelineEventType ResolveReminderEventType(ReminderRecipientRole role)
    {
        return role switch
        {
            ReminderRecipientRole.Client => InvoiceTimelineEventType.StuckReminderSentToClient,
            ReminderRecipientRole.Revendeur => InvoiceTimelineEventType.StuckReminderSentToRevendeur,
            ReminderRecipientRole.Fournisseur => InvoiceTimelineEventType.StuckReminderSentToFournisseur,
            _ => InvoiceTimelineEventType.StuckReminderSentToClient
        };
    }

    private static string BuildReminderTitle(ReminderRecipientRole role)
    {
        return role switch
        {
            ReminderRecipientRole.Client => "Rappel auto envoye au client",
            ReminderRecipientRole.Revendeur => "Rappel auto envoye au revendeur",
            ReminderRecipientRole.Fournisseur => "Rappel auto envoye au fournisseur",
            _ => "Rappel auto envoye"
        };
    }

    private sealed class TimelineEventSnapshot
    {
        public int InvoiceId { get; init; }
        public InvoiceTimelineEventType EventType { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
