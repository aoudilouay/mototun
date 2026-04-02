using mototun.Core.Enums;

namespace mototun.Core.Entities
{
    public class SupportTicket
    {
        public int Id { get; set; }
        public string TicketNumber { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public SupportTicketPriority Priority { get; set; } = SupportTicketPriority.Normal;
        public SupportTicketStatus Status { get; set; } = SupportTicketStatus.Pending;
        public int CreatedByUserId { get; set; }
        public int? AssignedAdminUserId { get; set; }
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }

        public User? CreatedByUser { get; set; }
        public User? AssignedAdminUser { get; set; }
        public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
    }
}
