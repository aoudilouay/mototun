using mototun.Core.Enums;

namespace mototun.Core.DTOs;

public class AdminOverviewDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int SuspendedUsers { get; set; }
    public int RevendeurUsers { get; set; }
    public int FournisseurUsers { get; set; }
    public int AdminUsers { get; set; }
    public int UsersCannotLogin { get; set; }
    public int TotalInvoices { get; set; }
    public int OpenCarteGriseDossiers { get; set; }
}

public class AdminUserDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; }
    public bool CanLogin { get; set; }
    public string? BusinessName { get; set; }
    public string? City { get; set; }
    public string? TaxId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class AdminUserUpdateDto
{
    public UserStatus? Status { get; set; }
    public bool? CanLogin { get; set; }
}

public class AdminAuditItemDto
{
    public int EventId { get; set; }
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string? ClientName { get; set; }
    public string? RevendeurBusinessName { get; set; }
    public string? FournisseurBusinessName { get; set; }

    public InvoiceTimelineEventType EventType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public int? ActorUserId { get; set; }
    public string? ActorFullName { get; set; }
    public string? ActorEmail { get; set; }
    public UserRole? ActorRole { get; set; }
}

public class AdminAuditSummaryDto
{
    public int TotalEvents { get; set; }
    public int ReturnedEvents { get; set; }
    public int DistinctInvoices { get; set; }
    public int DistinctActors { get; set; }
    public DateTime? FirstEventAt { get; set; }
    public DateTime? LastEventAt { get; set; }
}

public class AdminAuditResponseDto
{
    public List<AdminAuditItemDto> Items { get; set; } = new();
    public AdminAuditSummaryDto Summary { get; set; } = new();
}
