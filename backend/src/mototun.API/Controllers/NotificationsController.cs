using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.API.Services.Settings;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers;

[Authorize(Roles = "Revendeur,Fournisseur")]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private const int MaxNotificationIdLength = 200;

    private readonly ApplicationDbContext _context;

    public NotificationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<NotificationDto>>>> GetNotifications()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role == UserRole.Revendeur)
        {
            var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
            if (!revendeurId.HasValue)
            {
                return Forbid();
            }

            var generated = await BuildRevendeurNotificationsAsync(revendeurId.Value, currentUserId);
            var notificationIds = generated
                .Select(n => n.NotificationId)
                .Distinct(StringComparer.Ordinal)
                .ToList();

            var states = notificationIds.Count == 0
                ? new Dictionary<string, NotificationState>(StringComparer.Ordinal)
                : (await _context.NotificationStates
                    .AsNoTracking()
                    .Where(s => s.RevendeurId == revendeurId.Value && notificationIds.Contains(s.NotificationId))
                    .ToListAsync())
                    .ToDictionary(s => s.NotificationId, StringComparer.Ordinal);

            var result = generated
                .Where(n => !states.TryGetValue(n.NotificationId, out var state) || !state.IsDismissed)
                .Select(n =>
                {
                    if (states.TryGetValue(n.NotificationId, out var state))
                    {
                        n.IsRead = state.IsRead;
                    }

                    n.CreatedAt = EnsureUtc(n.CreatedAt);
                    return n;
                })
                .OrderByDescending(n => n.CreatedAt)
                .ToList();

            return Ok(new ApiResponse<List<NotificationDto>>
            {
                Success = true,
                Message = "Notifications loaded",
                Data = result
            });
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var fournisseurNotifications = await BuildFournisseurNotificationsAsync(fournisseurId.Value, currentUserId);
        foreach (var notification in fournisseurNotifications)
        {
            notification.CreatedAt = EnsureUtc(notification.CreatedAt);
        }

        return Ok(new ApiResponse<List<NotificationDto>>
        {
            Success = true,
            Message = "Notifications loaded",
            Data = fournisseurNotifications
        });
    }

    [HttpPost("read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAsRead([FromBody] NotificationBulkActionDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var notificationIds = NormalizeNotificationIds(dto.NotificationIds is null ? Array.Empty<string>() : dto.NotificationIds);
        if (notificationIds.Count == 0)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "NotificationIds is required"
            });
        }

        var now = DateTime.UtcNow;
        await UpsertNotificationStatesAsync(revendeurId.Value, notificationIds, state =>
        {
            state.IsRead = true;
            state.ReadAt ??= now;
            state.UpdatedAt = now;
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Notifications marked as read",
            Data = new { updated = notificationIds.Count }
        });
    }

    [HttpPost("dismiss")]
    public async Task<ActionResult<ApiResponse<object>>> DismissNotifications([FromBody] NotificationBulkActionDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var notificationIds = NormalizeNotificationIds(dto.NotificationIds is null ? Array.Empty<string>() : dto.NotificationIds);
        if (notificationIds.Count == 0)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "NotificationIds is required"
            });
        }

        var now = DateTime.UtcNow;
        await UpsertNotificationStatesAsync(revendeurId.Value, notificationIds, state =>
        {
            state.IsRead = true;
            state.ReadAt ??= now;
            state.IsDismissed = true;
            state.DismissedAt = now;
            state.UpdatedAt = now;
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Notifications dismissed",
            Data = new { updated = notificationIds.Count }
        });
    }

    [HttpPost("read-all")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAllAsRead()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var currentNotifications = await BuildRevendeurNotificationsAsync(revendeurId.Value, currentUserId);
        var notificationIds = currentNotifications
            .Select(n => n.NotificationId)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (notificationIds.Count == 0)
        {
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "No notifications to mark as read",
                Data = new { updated = 0 }
            });
        }

        var now = DateTime.UtcNow;
        await UpsertNotificationStatesAsync(revendeurId.Value, notificationIds, state =>
        {
            state.IsRead = true;
            state.ReadAt ??= now;
            state.UpdatedAt = now;
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "All notifications marked as read",
            Data = new { updated = notificationIds.Count }
        });
    }

    private async Task<int?> GetCurrentRevendeurIdAsync(int currentUserId)
    {
        return await _context.Revendeurs
            .Where(r => r.UserId == currentUserId)
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<int?> GetCurrentFournisseurIdAsync(int currentUserId)
    {
        return await _context.Fournisseurs
            .Where(f => f.UserId == currentUserId)
            .Select(f => (int?)f.Id)
            .FirstOrDefaultAsync();
    }

    private async Task UpsertNotificationStatesAsync(int revendeurId, List<string> notificationIds, Action<NotificationState> apply)
    {
        var existingStates = await _context.NotificationStates
            .Where(s => s.RevendeurId == revendeurId && notificationIds.Contains(s.NotificationId))
            .ToListAsync();

        var existingById = existingStates.ToDictionary(s => s.NotificationId, StringComparer.Ordinal);
        var now = DateTime.UtcNow;

        foreach (var notificationId in notificationIds)
        {
            if (!existingById.TryGetValue(notificationId, out var state))
            {
                state = new NotificationState
                {
                    RevendeurId = revendeurId,
                    NotificationId = notificationId,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.NotificationStates.Add(state);
                existingById[notificationId] = state;
            }

            apply(state);
        }
    }

    private async Task<List<NotificationDto>> BuildRevendeurNotificationsAsync(int revendeurId, int currentUserId)
    {
        var now = DateTime.UtcNow;
        var revendeurSettings = await _context.RevendeurSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RevendeurId == revendeurId);
        var effectiveSlaSettings = RevendeurSettingsPolicy.BuildEffective(revendeurSettings);

        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.RevendeurId == revendeurId)
            .Include(i => i.Client)
            .Include(i => i.ClientPortalDocuments)
            .Include(i => i.AssignedFournisseur)
            .OrderByDescending(i => i.UpdatedAt)
            .Take(400)
            .ToListAsync();

        var pendingConnections = await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c =>
                c.RevendeurId == revendeurId
                && c.Status == PartnershipRequestStatus.Pending
                && c.RequestedByRole == UserRole.Fournisseur)
            .Include(c => c.Fournisseur)
            .OrderByDescending(c => c.UpdatedAt)
            .Take(100)
            .ToListAsync();

        var clients = await _context.Clients
            .AsNoTracking()
            .Where(c => c.RevendeurId == revendeurId)
            .OrderByDescending(c => c.CreatedAt)
            .Take(200)
            .ToListAsync();

        var motorcycles = await _context.Motorcycles
            .AsNoTracking()
            .Where(m => m.RevendeurId == revendeurId)
            .OrderByDescending(m => m.UpdatedAt)
            .Take(200)
            .ToListAsync();

        var timelineEvents = await _context.InvoiceTimelineEvents
            .AsNoTracking()
            .Where(e =>
                e.Invoice.RevendeurId == revendeurId
                && e.CreatedAt >= now.AddDays(-45)
                && (e.EventType == InvoiceTimelineEventType.DocumentUploadedByFournisseur
                    || e.EventType == InvoiceTimelineEventType.DocumentIssueUpdated
                    || e.EventType == InvoiceTimelineEventType.CarteGriseStatusUpdated))
            .Include(e => e.Invoice)
                .ThenInclude(i => i.Client)
            .OrderByDescending(e => e.CreatedAt)
            .Take(300)
            .ToListAsync();

        var notifications = new List<NotificationDto>();

        foreach (var connection in pendingConnections)
        {
            var createdAt = connection.UpdatedAt != default ? connection.UpdatedAt : connection.CreatedAt;
            notifications.Add(new NotificationDto
            {
                NotificationId = NormalizeNotificationId($"rv-partnership-pending-{connection.Id}-{BuildDateStamp(createdAt)}"),
                Type = "partnership",
                Title = "Nouvelle demande partenaire",
                Message = $"{connection.Fournisseur.BusinessName} vous a envoye une demande de partenariat",
                Icon = "PRT",
                Color = "cyan",
                Link = "/revendeur/fournisseurs",
                CreatedAt = createdAt
            });
        }

        foreach (var invoice in invoices)
        {
            var invoiceNumber = string.IsNullOrWhiteSpace(invoice.InvoiceNumber) ? invoice.Id.ToString() : invoice.InvoiceNumber;
            var clientName = invoice.Client?.FullName ?? "Client";
            var eventAt = invoice.UpdatedAt != default ? invoice.UpdatedAt : invoice.CreatedAt;
            var stamp = BuildDateStamp(eventAt);
            var lastActivityAt = ComputeLastActivityAtForSla(invoice);
            var inactivityHours = Math.Max(0, (int)Math.Round((now - lastActivityAt).TotalHours, MidpointRounding.AwayFromZero));

            if (IsOpenDossier(invoice.CarteGriseStatus))
            {
                if (inactivityHours >= effectiveSlaSettings.StuckAfterHours)
                {
                    notifications.Add(new NotificationDto
                    {
                        NotificationId = NormalizeNotificationId($"rv-sla-stuck-{invoice.Id}-{effectiveSlaSettings.StuckAfterHours}-{BuildDateStamp(lastActivityAt)}"),
                        Type = "sla",
                        Title = "Dossier bloque (SLA)",
                        Message = $"{invoiceNumber} ({clientName}) inactif depuis {inactivityHours}h (seuil bloque: {effectiveSlaSettings.StuckAfterHours}h)",
                        Icon = "SLA",
                        Color = "red",
                        Link = "/revendeur/carte-grise",
                        CreatedAt = lastActivityAt
                    });
                }
                else if (inactivityHours >= effectiveSlaSettings.WarningAfterHours)
                {
                    notifications.Add(new NotificationDto
                    {
                        NotificationId = NormalizeNotificationId($"rv-sla-risk-{invoice.Id}-{effectiveSlaSettings.WarningAfterHours}-{BuildDateStamp(lastActivityAt)}"),
                        Type = "sla",
                        Title = "Alerte SLA dossier",
                        Message = $"{invoiceNumber} ({clientName}) inactif depuis {inactivityHours}h (seuil alerte: {effectiveSlaSettings.WarningAfterHours}h)",
                        Icon = "SLA",
                        Color = "amber",
                        Link = "/revendeur/carte-grise",
                        CreatedAt = lastActivityAt
                    });
                }
            }

            if (invoice.CarteGriseStatusUpdatedAt.HasValue
                && invoice.CarteGriseStatusUpdatedByUserId.HasValue
                && invoice.CarteGriseStatusUpdatedByUserId.Value != currentUserId
                && invoice.AssignedFournisseurId.HasValue)
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"rv-cg-status-change-{invoice.Id}-{BuildDateStamp(invoice.CarteGriseStatusUpdatedAt.Value)}"),
                    Type = "carte-grise",
                    Title = "Statut dossier mis a jour",
                    Message = $"{invoiceNumber} ({clientName}) - {ToCarteGriseStatusLabel(invoice.CarteGriseStatus)}",
                    Icon = "CG",
                    Color = "indigo",
                    Link = "/revendeur/carte-grise",
                    CreatedAt = invoice.CarteGriseStatusUpdatedAt.Value
                });
            }

            var sanitizedIssueMessage = SanitizeIssueMessage(invoice.DocumentIssueMessage);
            if (invoice.DocumentIssueUpdatedAt.HasValue
                && invoice.DocumentIssueUpdatedByUserId.HasValue
                && invoice.DocumentIssueUpdatedByUserId.Value != currentUserId
                && !string.IsNullOrWhiteSpace(sanitizedIssueMessage)
                && invoice.AssignedFournisseurId.HasValue)
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"rv-cg-issue-{invoice.Id}-{BuildDateStamp(invoice.DocumentIssueUpdatedAt.Value)}"),
                    Type = "carte-grise",
                    Title = "Remarque dossier",
                    Message = $"{invoiceNumber} ({clientName}) - {sanitizedIssueMessage}",
                    Icon = "DOC",
                    Color = "amber",
                    Link = "/revendeur/carte-grise",
                    CreatedAt = invoice.DocumentIssueUpdatedAt.Value
                });
            }

            if (invoice.ClientUpdateUpdatedAt.HasValue
                && invoice.ClientUpdateUpdatedByUserId.HasValue
                && invoice.ClientUpdateUpdatedByUserId.Value != currentUserId
                && !string.IsNullOrWhiteSpace(invoice.ClientUpdateMessage))
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"rv-cg-client-msg-{invoice.Id}-{BuildDateStamp(invoice.ClientUpdateUpdatedAt.Value)}"),
                    Type = "carte-grise",
                    Title = "Message client mis a jour",
                    Message = $"{invoiceNumber} ({clientName})",
                    Icon = "MSG",
                    Color = "blue",
                    Link = "/revendeur/carte-grise",
                    CreatedAt = invoice.ClientUpdateUpdatedAt.Value
                });
            }

            if (invoice.CarteGriseStatus == CarteGriseStatus.Ready)
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"cg-ready-{invoice.Id}-{stamp}"),
                    Type = "carte-grise",
                    Title = "Carte grise prete",
                    Message = $"{clientName} - {invoiceNumber}",
                    Icon = "CG",
                    Color = "blue",
                    Link = "/revendeur/carte-grise",
                    CreatedAt = eventAt
                });
            }

            if (invoice.CarteGriseStatus == CarteGriseStatus.Delivered)
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"cg-delivered-{invoice.Id}-{stamp}"),
                    Type = "carte-grise",
                    Title = "Carte grise livree",
                    Message = $"{clientName} - {invoiceNumber}",
                    Icon = "CG",
                    Color = "emerald",
                    Link = "/revendeur/carte-grise",
                    CreatedAt = eventAt
                });
            }

            if (invoice.CarteGriseStatus is CarteGriseStatus.PendingDocuments or CarteGriseStatus.DocumentsReceived)
            {
                var hasLegacyCin = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
                var hasCinFront = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
                var hasCinBack = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
                var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
                var hasDeclaration = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
                var hasFacture = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);

                var missing = new List<string>();
                if (!hasCin) missing.Add("CIN");
                if (!hasDeclaration) missing.Add("Declaration");
                if (!hasFacture) missing.Add("Facture");

                if (missing.Count > 0)
                {
                    notifications.Add(new NotificationDto
                    {
                        NotificationId = NormalizeNotificationId($"cg-missing-{invoice.Id}-{string.Join("-", missing)}"),
                        Type = "carte-grise",
                        Title = "Documents manquants",
                        Message = $"{invoiceNumber} ({clientName}) - {string.Join(", ", missing)}",
                        Icon = "DOC",
                        Color = "amber",
                        Link = "/revendeur/carte-grise",
                        CreatedAt = eventAt
                    });
                }
            }

            if (invoice.Status == InvoiceStatus.Paid && eventAt >= now.AddDays(-30))
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"invoice-paid-{invoice.Id}-{stamp}"),
                    Type = "invoice",
                    Title = "Facture payee",
                    Message = $"{invoiceNumber} - {clientName}",
                    Icon = "INV",
                    Color = "emerald",
                    Link = "/revendeur/invoices",
                    CreatedAt = eventAt
                });
            }
            else if (invoice.CreatedAt >= now.AddDays(-15))
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"invoice-created-{invoice.Id}-{BuildDateStamp(invoice.CreatedAt)}"),
                    Type = "invoice",
                    Title = "Nouvelle vente",
                    Message = $"Vente enregistree pour {clientName} - suivi carte grise lance",
                    Icon = "INV",
                    Color = "indigo",
                    Link = "/revendeur/carte-grise",
                    CreatedAt = invoice.CreatedAt
                });
            }
        }

        foreach (var timelineEvent in timelineEvents)
        {
            if (timelineEvent.ActorUserId.HasValue && timelineEvent.ActorUserId.Value == currentUserId)
            {
                continue;
            }

            var invoiceNumber = string.IsNullOrWhiteSpace(timelineEvent.Invoice?.InvoiceNumber)
                ? timelineEvent.InvoiceId.ToString()
                : timelineEvent.Invoice.InvoiceNumber;
            var clientName = timelineEvent.Invoice?.Client?.FullName ?? "Client";

            notifications.Add(new NotificationDto
            {
                NotificationId = NormalizeNotificationId($"rv-timeline-{timelineEvent.Id}"),
                Type = "timeline",
                Title = string.Equals(timelineEvent.Title, "Controle automatique OCR", StringComparison.OrdinalIgnoreCase)
                    ? "Controle automatique document"
                    : timelineEvent.Title,
                Message = $"{invoiceNumber} ({clientName}) - {SanitizeIssueMessage(timelineEvent.Message) ?? timelineEvent.Message}",
                Icon = ResolveTimelineIcon(timelineEvent.EventType),
                Color = ResolveTimelineColor(timelineEvent.EventType),
                Link = "/revendeur/carte-grise",
                CreatedAt = timelineEvent.CreatedAt
            });
        }

        foreach (var client in clients.Where(c => c.CreatedAt >= now.AddDays(-30)))
        {
            notifications.Add(new NotificationDto
            {
                NotificationId = NormalizeNotificationId($"client-{client.Id}-{BuildDateStamp(client.CreatedAt)}"),
                Type = "client",
                Title = "Nouveau client",
                Message = $"{client.FullName} ({client.CIN})",
                Icon = "CLI",
                Color = "cyan",
                Link = "/revendeur/clients",
                CreatedAt = client.CreatedAt
            });
        }

        foreach (var motorcycle in motorcycles.Where(m => m.Qty <= 2))
        {
            var eventAt = motorcycle.UpdatedAt != default ? motorcycle.UpdatedAt : motorcycle.CreatedAt;
            notifications.Add(new NotificationDto
            {
                NotificationId = NormalizeNotificationId($"stock-{motorcycle.Id}-{motorcycle.Qty}"),
                Type = "stock",
                Title = motorcycle.Qty <= 0 ? "Rupture de stock" : "Stock faible",
                Message = $"{motorcycle.Company} {motorcycle.Brand} {motorcycle.Model} (qty: {motorcycle.Qty})",
                Icon = "STK",
                Color = motorcycle.Qty <= 0 ? "red" : "amber",
                Link = "/revendeur/motorcycles",
                CreatedAt = eventAt
            });
        }

        return notifications
            .GroupBy(n => n.NotificationId, StringComparer.Ordinal)
            .Select(g => g.First())
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToList();
    }

    private async Task<List<NotificationDto>> BuildFournisseurNotificationsAsync(int fournisseurId, int currentUserId)
    {
        var now = DateTime.UtcNow;
        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.AssignedFournisseurId == fournisseurId)
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
            .Include(i => i.ClientPortalDocuments)
            .OrderByDescending(i => i.UpdatedAt)
            .Take(400)
            .ToListAsync();

        var pendingConnections = await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c =>
                c.FournisseurId == fournisseurId
                && c.Status == PartnershipRequestStatus.Pending
                && c.RequestedByRole == UserRole.Revendeur)
            .Include(c => c.Revendeur)
            .OrderByDescending(c => c.UpdatedAt)
            .Take(100)
            .ToListAsync();

        var timelineEvents = await _context.InvoiceTimelineEvents
            .AsNoTracking()
            .Where(e =>
                e.Invoice.AssignedFournisseurId == fournisseurId
                && e.CreatedAt >= DateTime.UtcNow.AddDays(-45)
                && (e.EventType == InvoiceTimelineEventType.DossierSentToFournisseur
                    || e.EventType == InvoiceTimelineEventType.DocumentUploadedByRevendeur
                    || e.EventType == InvoiceTimelineEventType.DocumentIssueUpdated
                    || e.EventType == InvoiceTimelineEventType.CarteGriseStatusUpdated
                    || e.EventType == InvoiceTimelineEventType.ClientMessageUpdated))
            .Include(e => e.Invoice)
                .ThenInclude(i => i.Client)
            .OrderByDescending(e => e.CreatedAt)
            .Take(300)
            .ToListAsync();

        var notifications = new List<NotificationDto>();
        var revendeurIds = invoices
            .Select(i => i.RevendeurId)
            .Distinct()
            .ToList();
        var persistedSettingsByRevendeur = revendeurIds.Count == 0
            ? new Dictionary<int, RevendeurSettings>()
            : await _context.RevendeurSettings
                .AsNoTracking()
                .Where(s => revendeurIds.Contains(s.RevendeurId))
                .ToDictionaryAsync(s => s.RevendeurId);

        foreach (var connection in pendingConnections)
        {
            var createdAt = connection.UpdatedAt != default ? connection.UpdatedAt : connection.CreatedAt;
            notifications.Add(new NotificationDto
            {
                NotificationId = NormalizeNotificationId($"fr-partnership-pending-{connection.Id}-{BuildDateStamp(createdAt)}"),
                Type = "partnership",
                Title = "Nouvelle demande partenaire",
                Message = $"{connection.Revendeur.BusinessName} a demande un partenariat",
                Icon = "PRT",
                Color = "cyan",
                Link = "/fournisseur/revendeurs",
                CreatedAt = createdAt
            });
        }

        foreach (var invoice in invoices)
        {
            var invoiceNumber = string.IsNullOrWhiteSpace(invoice.InvoiceNumber) ? invoice.Id.ToString() : invoice.InvoiceNumber;
            var clientName = invoice.Client?.FullName ?? "Client";
            var revendeurName = invoice.Revendeur?.BusinessName ?? "Revendeur";
            persistedSettingsByRevendeur.TryGetValue(invoice.RevendeurId, out var revendeurSettings);
            var effectiveSlaSettings = RevendeurSettingsPolicy.BuildEffective(revendeurSettings);
            var lastActivityAt = ComputeLastActivityAtForSla(invoice);
            var inactivityHours = Math.Max(0, (int)Math.Round((now - lastActivityAt).TotalHours, MidpointRounding.AwayFromZero));

            if (IsOpenDossier(invoice.CarteGriseStatus))
            {
                if (inactivityHours >= effectiveSlaSettings.StuckAfterHours)
                {
                    notifications.Add(new NotificationDto
                    {
                        NotificationId = NormalizeNotificationId($"fr-sla-stuck-{invoice.Id}-{effectiveSlaSettings.StuckAfterHours}-{BuildDateStamp(lastActivityAt)}"),
                        Type = "sla",
                        Title = "Dossier bloque (SLA)",
                        Message = $"{invoiceNumber} ({clientName}) - {revendeurName} - inactif {inactivityHours}h (seuil bloque: {effectiveSlaSettings.StuckAfterHours}h)",
                        Icon = "SLA",
                        Color = "red",
                        Link = "/fournisseur/carte-grise",
                        CreatedAt = lastActivityAt
                    });
                }
                else if (inactivityHours >= effectiveSlaSettings.WarningAfterHours)
                {
                    notifications.Add(new NotificationDto
                    {
                        NotificationId = NormalizeNotificationId($"fr-sla-risk-{invoice.Id}-{effectiveSlaSettings.WarningAfterHours}-{BuildDateStamp(lastActivityAt)}"),
                        Type = "sla",
                        Title = "Alerte SLA dossier",
                        Message = $"{invoiceNumber} ({clientName}) - {revendeurName} - inactif {inactivityHours}h (seuil alerte: {effectiveSlaSettings.WarningAfterHours}h)",
                        Icon = "SLA",
                        Color = "amber",
                        Link = "/fournisseur/carte-grise",
                        CreatedAt = lastActivityAt
                    });
                }
            }

            if (invoice.SentToFournisseurAt.HasValue)
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"fr-cg-assigned-{invoice.Id}-{BuildDateStamp(invoice.SentToFournisseurAt.Value)}"),
                    Type = "carte-grise",
                    Title = "Nouveau dossier carte grise",
                    Message = $"{invoiceNumber} ({clientName}) - {revendeurName}",
                    Icon = "CG",
                    Color = "blue",
                    Link = "/fournisseur/carte-grise",
                    CreatedAt = invoice.SentToFournisseurAt.Value
                });
            }

            if (invoice.CarteGriseStatusUpdatedAt.HasValue
                && invoice.CarteGriseStatusUpdatedByUserId.HasValue
                && invoice.CarteGriseStatusUpdatedByUserId.Value != currentUserId)
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"fr-cg-status-change-{invoice.Id}-{BuildDateStamp(invoice.CarteGriseStatusUpdatedAt.Value)}"),
                    Type = "carte-grise",
                    Title = "Statut dossier mis a jour",
                    Message = $"{invoiceNumber} - {ToCarteGriseStatusLabel(invoice.CarteGriseStatus)}",
                    Icon = "CG",
                    Color = "indigo",
                    Link = "/fournisseur/carte-grise",
                    CreatedAt = invoice.CarteGriseStatusUpdatedAt.Value
                });
            }

            var sanitizedIssueMessage = SanitizeIssueMessage(invoice.DocumentIssueMessage);
            if (invoice.DocumentIssueUpdatedAt.HasValue
                && invoice.DocumentIssueUpdatedByUserId.HasValue
                && invoice.DocumentIssueUpdatedByUserId.Value != currentUserId
                && !string.IsNullOrWhiteSpace(sanitizedIssueMessage))
            {
                notifications.Add(new NotificationDto
                {
                    NotificationId = NormalizeNotificationId($"fr-cg-issue-{invoice.Id}-{BuildDateStamp(invoice.DocumentIssueUpdatedAt.Value)}"),
                    Type = "carte-grise",
                    Title = "Remarque dossier",
                    Message = $"{invoiceNumber} - {sanitizedIssueMessage}",
                    Icon = "DOC",
                    Color = "amber",
                    Link = "/fournisseur/carte-grise",
                    CreatedAt = invoice.DocumentIssueUpdatedAt.Value
                });
            }
        }

        foreach (var timelineEvent in timelineEvents)
        {
            if (timelineEvent.ActorUserId.HasValue && timelineEvent.ActorUserId.Value == currentUserId)
            {
                continue;
            }

            var invoiceNumber = string.IsNullOrWhiteSpace(timelineEvent.Invoice?.InvoiceNumber)
                ? timelineEvent.InvoiceId.ToString()
                : timelineEvent.Invoice.InvoiceNumber;
            var clientName = timelineEvent.Invoice?.Client?.FullName ?? "Client";

            notifications.Add(new NotificationDto
            {
                NotificationId = NormalizeNotificationId($"fr-timeline-{timelineEvent.Id}"),
                Type = "timeline",
                Title = string.Equals(timelineEvent.Title, "Controle automatique OCR", StringComparison.OrdinalIgnoreCase)
                    ? "Controle automatique document"
                    : timelineEvent.Title,
                Message = $"{invoiceNumber} ({clientName}) - {SanitizeIssueMessage(timelineEvent.Message) ?? timelineEvent.Message}",
                Icon = ResolveTimelineIcon(timelineEvent.EventType),
                Color = ResolveTimelineColor(timelineEvent.EventType),
                Link = "/fournisseur/carte-grise",
                CreatedAt = timelineEvent.CreatedAt
            });
        }

        return notifications
            .GroupBy(n => n.NotificationId, StringComparer.Ordinal)
            .Select(g => g.First())
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToList();
    }

    private static string? SanitizeIssueMessage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        var keptLines = normalized
            .Split('\n')
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Where(line => !IsAutoValidationNoiseLine(line))
            .ToList();

        if (keptLines.Count == 0)
        {
            return null;
        }

        return string.Join("\n", keptLines);
    }

    private static bool IsAutoValidationNoiseLine(string line)
    {
        var normalized = line.Trim().ToLowerInvariant();
        return normalized.Contains("[auto ocr", StringComparison.Ordinal)
            || normalized.Contains("[verification auto", StringComparison.Ordinal)
            || normalized.Contains("ocr termine", StringComparison.Ordinal)
            || normalized.Contains("zones texte:", StringComparison.Ordinal)
            || normalized.Contains("champs manquants:", StringComparison.Ordinal);
    }

    private static string ToCarteGriseStatusLabel(CarteGriseStatus status)
    {
        return status switch
        {
            CarteGriseStatus.PendingDocuments => "En attente",
            CarteGriseStatus.DocumentsReceived => "Documents recus",
            CarteGriseStatus.InProgress => "Controle qualite",
            CarteGriseStatus.DepotAntt => "Depot ANTT",
            CarteGriseStatus.Ready => "Carte grise prete",
            CarteGriseStatus.Rejected => "Rejete",
            CarteGriseStatus.Delivered => "Livree",
            _ => "Inconnu"
        };
    }

    private static bool IsOpenDossier(CarteGriseStatus status)
    {
        return status is CarteGriseStatus.PendingDocuments
            or CarteGriseStatus.DocumentsReceived
            or CarteGriseStatus.InProgress
            or CarteGriseStatus.DepotAntt;
    }

    private static DateTime ComputeLastActivityAtForSla(Invoice invoice)
    {
        var latestDocumentAt = invoice.ClientPortalDocuments
            .Select(d => (DateTime?)d.UpdatedAt)
            .OrderByDescending(v => v)
            .FirstOrDefault();

        var lastActivity = invoice.CreatedAt;
        lastActivity = MaxDate(lastActivity, invoice.UpdatedAt);
        lastActivity = MaxDate(lastActivity, invoice.CarteGriseStatusUpdatedAt);
        lastActivity = MaxDate(lastActivity, invoice.DocumentIssueUpdatedAt);
        lastActivity = MaxDate(lastActivity, invoice.ClientUpdateUpdatedAt);
        lastActivity = MaxDate(lastActivity, invoice.SentToFournisseurAt);
        lastActivity = MaxDate(lastActivity, latestDocumentAt);
        return lastActivity;
    }

    private static DateTime MaxDate(DateTime current, DateTime? candidate)
    {
        if (!candidate.HasValue)
        {
            return current;
        }

        return candidate.Value > current ? candidate.Value : current;
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static string ResolveTimelineIcon(InvoiceTimelineEventType eventType)
    {
        return eventType switch
        {
            InvoiceTimelineEventType.DocumentUploadedByRevendeur => "DOC",
            InvoiceTimelineEventType.DocumentUploadedByFournisseur => "DOC",
            InvoiceTimelineEventType.DossierSentToFournisseur => "CG",
            InvoiceTimelineEventType.CarteGriseStatusUpdated => "CG",
            InvoiceTimelineEventType.DocumentIssueUpdated => "WARN",
            InvoiceTimelineEventType.ClientMessageUpdated => "MSG",
            InvoiceTimelineEventType.DocumentValidationChecklistUpdated => "WARN",
            InvoiceTimelineEventType.DocumentValidationChecklistPublishedToClient => "MSG",
            InvoiceTimelineEventType.StuckReminderSentToClient => "REM",
            InvoiceTimelineEventType.StuckReminderSentToRevendeur => "REM",
            InvoiceTimelineEventType.StuckReminderSentToFournisseur => "REM",
            InvoiceTimelineEventType.StuckEscalationTriggered => "ALR",
            _ => "EVT"
        };
    }

    private static string ResolveTimelineColor(InvoiceTimelineEventType eventType)
    {
        return eventType switch
        {
            InvoiceTimelineEventType.DocumentUploadedByRevendeur => "emerald",
            InvoiceTimelineEventType.DocumentUploadedByFournisseur => "emerald",
            InvoiceTimelineEventType.DossierSentToFournisseur => "blue",
            InvoiceTimelineEventType.CarteGriseStatusUpdated => "indigo",
            InvoiceTimelineEventType.DocumentIssueUpdated => "amber",
            InvoiceTimelineEventType.ClientMessageUpdated => "cyan",
            InvoiceTimelineEventType.DocumentValidationChecklistUpdated => "amber",
            InvoiceTimelineEventType.DocumentValidationChecklistPublishedToClient => "cyan",
            InvoiceTimelineEventType.StuckReminderSentToClient => "teal",
            InvoiceTimelineEventType.StuckReminderSentToRevendeur => "teal",
            InvoiceTimelineEventType.StuckReminderSentToFournisseur => "teal",
            InvoiceTimelineEventType.StuckEscalationTriggered => "rose",
            _ => "slate"
        };
    }

    private static string BuildDateStamp(DateTime value)
    {
        return value.ToUniversalTime().ToString("yyyyMMddHHmmss");
    }

    private static List<string> NormalizeNotificationIds(IEnumerable<string> rawIds)
    {
        var normalized = rawIds
            .Select(NormalizeNotificationId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        return normalized;
    }

    private static string NormalizeNotificationId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim();
        return normalized.Length <= MaxNotificationIdLength
            ? normalized
            : normalized[..MaxNotificationIdLength];
    }

    private bool TryGetCurrentUser(out int currentUserId, out UserRole role)
    {
        currentUserId = 0;
        role = default;

        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);

        return int.TryParse(idClaim, out currentUserId)
            && Enum.TryParse(roleClaim, ignoreCase: true, out role)
            && role is UserRole.Revendeur or UserRole.Fournisseur;
    }
}
