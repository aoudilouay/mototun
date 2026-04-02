using mototun.Core.Enums;

namespace mototun.Core.Entities;

public class RevendeurFournisseurConnection
{
    public int Id { get; set; }

    public int RevendeurId { get; set; }
    public Revendeur Revendeur { get; set; } = null!;

    public int FournisseurId { get; set; }
    public Fournisseur Fournisseur { get; set; } = null!;

    public PartnershipRequestStatus Status { get; set; } = PartnershipRequestStatus.Pending;
    public UserRole RequestedByRole { get; set; } = UserRole.Revendeur;
    public int RequestedByUserId { get; set; }

    public string? RejectReason { get; set; }
    public DateTime? RespondedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
