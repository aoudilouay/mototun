using System.Net.Http.Json;
using mototun.API.Services.Email;
using mototun.Core.Entities;
using mototun.Core.Enums;

namespace mototun.API.Services.Reminders;

public class StuckDossierReminderDispatcher : IStuckDossierReminderDispatcher
{
    private readonly IApplicationEmailService _applicationEmailService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<StuckDossierReminderDispatcher> _logger;

    public StuckDossierReminderDispatcher(
        IApplicationEmailService applicationEmailService,
        IHttpClientFactory httpClientFactory,
        ILogger<StuckDossierReminderDispatcher> logger)
    {
        _applicationEmailService = applicationEmailService;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ReminderDispatchResult> DispatchAsync(
        Invoice invoice,
        ReminderRecipient recipient,
        DateTime nowUtc,
        DateTime lastActivityUtc,
        ReminderDispatchPolicy policy,
        CancellationToken cancellationToken)
    {
        var result = new ReminderDispatchResult(recipient.Role);
        var normalizedEmail = NormalizeValue(recipient.Email);
        var normalizedPhone = NormalizeValue(recipient.Phone);

        if (string.IsNullOrWhiteSpace(normalizedEmail) && string.IsNullOrWhiteSpace(normalizedPhone))
        {
            return result;
        }

        var invoiceNumber = string.IsNullOrWhiteSpace(invoice.InvoiceNumber) ? invoice.Id.ToString() : invoice.InvoiceNumber;
        var clientName = invoice.Client?.FullName ?? "Client";
        var statusLabel = ToCarteGriseStatusLabel(invoice.CarteGriseStatus);
        var inactiveHours = Math.Max(1, (int)Math.Round((nowUtc - lastActivityUtc).TotalHours, MidpointRounding.AwayFromZero));
        var safeRecipientName = string.IsNullOrWhiteSpace(recipient.DisplayName)
            ? ToRecipientLabel(recipient.Role)
            : recipient.DisplayName.Trim();

        var subjectPrefix = policy.IsEscalation ? "Escalade dossier bloque" : "Rappel dossier bloque";
        var subject = $"{subjectPrefix} - {invoiceNumber}";
        var severityLine = policy.IsEscalation
            ? "Ce dossier depasse le seuil d'escalade et requiert une action immediate."
            : "Merci d'effectuer le suivi necessaire.";
        var textBody = $"""
Bonjour {safeRecipientName},

Le dossier carte grise {invoiceNumber} ({clientName}) est en attente depuis {inactiveHours} heure(s).
Statut actuel: {statusLabel}.

{severityLine}
""";

        if (policy.EnableEmail && !string.IsNullOrWhiteSpace(normalizedEmail))
        {
            try
            {
                await _applicationEmailService.SendNotificationAsync(normalizedEmail, safeRecipientName, subject, textBody, cancellationToken);
                result.ChannelsSent.Add("email");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to send stuck reminder email for invoice {InvoiceId} to {Email}",
                    invoice.Id,
                    normalizedEmail);
            }
        }

        if (policy.EnableSms
            && !string.IsNullOrWhiteSpace(normalizedPhone)
            && !string.IsNullOrWhiteSpace(policy.SmsWebhookUrl))
        {
            var sent = await SendWebhookReminderAsync(
                policy.SmsWebhookUrl!,
                "sms",
                invoice,
                recipient,
                subject,
                textBody,
                nowUtc,
                cancellationToken);

            if (sent)
            {
                result.ChannelsSent.Add("sms");
            }
        }

        if (policy.EnableWhatsApp
            && !string.IsNullOrWhiteSpace(normalizedPhone)
            && !string.IsNullOrWhiteSpace(policy.WhatsAppWebhookUrl))
        {
            var sent = await SendWebhookReminderAsync(
                policy.WhatsAppWebhookUrl!,
                "whatsapp",
                invoice,
                recipient,
                subject,
                textBody,
                nowUtc,
                cancellationToken);

            if (sent)
            {
                result.ChannelsSent.Add("whatsapp");
            }
        }

        return result;
    }

    private async Task<bool> SendWebhookReminderAsync(
        string endpoint,
        string channel,
        Invoice invoice,
        ReminderRecipient recipient,
        string subject,
        string message,
        DateTime sentAtUtc,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var payload = new
            {
                channel,
                sentAtUtc,
                invoiceId = invoice.Id,
                invoiceNumber = string.IsNullOrWhiteSpace(invoice.InvoiceNumber) ? invoice.Id.ToString() : invoice.InvoiceNumber,
                carteGriseStatus = invoice.CarteGriseStatus.ToString(),
                recipientRole = recipient.Role.ToString(),
                recipientName = recipient.DisplayName,
                recipientPhone = NormalizeValue(recipient.Phone),
                recipientEmail = NormalizeValue(recipient.Email),
                subject,
                message
            };

            using var response = await client.PostAsJsonAsync(endpoint, payload, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "Reminder {Channel} webhook failed for invoice {InvoiceId}. Status: {StatusCode}. Body: {Body}",
                channel,
                invoice.Id,
                (int)response.StatusCode,
                responseBody);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reminder {Channel} webhook request failed for invoice {InvoiceId}", channel, invoice.Id);
        }

        return false;
    }

    private static string? NormalizeValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
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

    private static string ToRecipientLabel(ReminderRecipientRole role)
    {
        return role switch
        {
            ReminderRecipientRole.Client => "client",
            ReminderRecipientRole.Revendeur => "revendeur",
            ReminderRecipientRole.Fournisseur => "fournisseur",
            _ => "destinataire"
        };
    }
}
