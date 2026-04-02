namespace mototun.API.Services.Reminders;

public class StuckDossierReminderOptions
{
    public const string SectionName = "StuckDossierReminders";

    public bool Enabled { get; set; }
    public int ScanIntervalMinutes { get; set; } = 30;
    public int StuckAfterHours { get; set; } = 24;
    public int RepeatEveryHours { get; set; } = 24;
    public int MaxInvoicesPerRun { get; set; } = 200;

    public bool EnableEmail { get; set; } = true;
    public bool EnableSms { get; set; }
    public bool EnableWhatsApp { get; set; }

    public string? SmsWebhookUrl { get; set; }
    public string? WhatsAppWebhookUrl { get; set; }

    public TimeSpan GetScanInterval() => TimeSpan.FromMinutes(Math.Clamp(ScanIntervalMinutes, 5, 1_440));
    public TimeSpan GetStuckAfter() => TimeSpan.FromHours(Math.Clamp(StuckAfterHours, 1, 720));
    public TimeSpan GetRepeatEvery() => TimeSpan.FromHours(Math.Clamp(RepeatEveryHours, 1, 720));
    public int GetMaxInvoicesPerRun() => Math.Clamp(MaxInvoicesPerRun, 10, 1_000);
}
