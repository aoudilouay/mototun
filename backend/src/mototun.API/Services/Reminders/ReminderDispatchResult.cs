namespace mototun.API.Services.Reminders;

public class ReminderDispatchResult
{
    public ReminderDispatchResult(ReminderRecipientRole recipientRole)
    {
        RecipientRole = recipientRole;
    }

    public ReminderRecipientRole RecipientRole { get; }
    public List<string> ChannelsSent { get; } = new();
    public bool SentAny => ChannelsSent.Count > 0;
}
