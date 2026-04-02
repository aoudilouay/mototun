using mototun.Core.Enums;

namespace mototun.Core.DTOs;

public class PartnershipRequestDto
{
    public int RequestId { get; set; }
    public int RevendeurId { get; set; }
    public string RevendeurBusinessName { get; set; } = string.Empty;
    public PartnershipPublicProfileDto RevendeurProfile { get; set; } = new();
    public int FournisseurId { get; set; }
    public string FournisseurBusinessName { get; set; } = string.Empty;
    public PartnershipPublicProfileDto FournisseurProfile { get; set; } = new();
    public PartnershipRequestStatus Status { get; set; }
    public UserRole? BlockedByRole { get; set; }
    public UserRole RequestedByRole { get; set; }
    public int RequestedByUserId { get; set; }
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}

public class CreatePartnershipRequestDto
{
    public int? RevendeurId { get; set; }
    public int? FournisseurId { get; set; }
}

public class RejectPartnershipRequestDto
{
    public string? Reason { get; set; }
}

public class BlockPartnershipRequestDto
{
    public string? Reason { get; set; }
}

public class PartnershipDirectoryItemDto
{
    public int ProfileId { get; set; }
    public int UserId { get; set; }
    public UserRole ProfileRole { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public string? TaxId { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public int? RequestId { get; set; }
    public PartnershipRequestStatus? Status { get; set; }
    public UserRole? BlockedByRole { get; set; }
    public UserRole? RequestedByRole { get; set; }
    public string? RejectReason { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PartnershipPublicProfileDto
{
    public int ProfileId { get; set; }
    public int UserId { get; set; }
    public UserRole Role { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public string? TaxId { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
