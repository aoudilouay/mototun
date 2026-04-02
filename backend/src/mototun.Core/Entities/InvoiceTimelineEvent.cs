using mototun.Core.Enums;

namespace mototun.Core.Entities;

public class InvoiceTimelineEvent
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public InvoiceTimelineEventType EventType { get; set; }
    public int? ActorUserId { get; set; }
    public UserRole? ActorRole { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
