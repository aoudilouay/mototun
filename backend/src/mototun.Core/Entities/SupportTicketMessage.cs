using mototun.Core.Enums;

namespace mototun.Core.Entities
{
    public class SupportTicketMessage
    {
        public int Id { get; set; }
        public int SupportTicketId { get; set; }
        public int SenderUserId { get; set; }
        public UserRole SenderRole { get; set; }
        public string Body { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public SupportTicket? Ticket { get; set; }
        public User? SenderUser { get; set; }
    }
}
