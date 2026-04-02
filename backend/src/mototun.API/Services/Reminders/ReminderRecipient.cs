namespace mototun.API.Services.Reminders;

public class ReminderRecipient
{
    public ReminderRecipientRole Role { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }
}
