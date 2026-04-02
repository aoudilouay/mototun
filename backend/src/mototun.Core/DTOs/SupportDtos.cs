using mototun.Core.Enums;

namespace mototun.Core.DTOs
{
    public class SupportTicketCreateDto
    {
        public string Subject { get; set; } = string.Empty;
        public string? Category { get; set; }
        public SupportTicketPriority? Priority { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class SupportTicketReplyDto
    {
        public string Message { get; set; } = string.Empty;
    }

    public class SupportTicketStatusUpdateDto
    {
        public SupportTicketStatus Status { get; set; }
    }

    public class SupportTicketMessageDto
    {
        public int Id { get; set; }
        public int SenderUserId { get; set; }
        public UserRole SenderRole { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class SupportTicketListItemDto
    {
        public int Id { get; set; }
        public string TicketNumber { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public SupportTicketPriority Priority { get; set; }
        public SupportTicketStatus Status { get; set; }
        public int CreatedByUserId { get; set; }
        public UserRole CreatedByRole { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public int? AssignedAdminUserId { get; set; }
        public string? AssignedAdminName { get; set; }
        public DateTime LastMessageAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
    }

    public class SupportTicketDetailDto : SupportTicketListItemDto
    {
        public List<SupportTicketMessageDto> Messages { get; set; } = new();
    }
}
