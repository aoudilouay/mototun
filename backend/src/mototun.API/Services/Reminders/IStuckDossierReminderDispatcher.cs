using mototun.Core.Entities;

namespace mototun.API.Services.Reminders;

public interface IStuckDossierReminderDispatcher
{
    Task<ReminderDispatchResult> DispatchAsync(
        Invoice invoice,
        ReminderRecipient recipient,
        DateTime nowUtc,
        DateTime lastActivityUtc,
        ReminderDispatchPolicy policy,
        CancellationToken cancellationToken);
}
