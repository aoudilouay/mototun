namespace mototun.API.Services.Reminders;

public sealed class ReminderDispatchPolicy
{
    public bool EnableEmail { get; init; }
    public bool EnableSms { get; init; }
    public bool EnableWhatsApp { get; init; }
    public string? SmsWebhookUrl { get; init; }
    public string? WhatsAppWebhookUrl { get; init; }
    public bool IsEscalation { get; init; }
}
