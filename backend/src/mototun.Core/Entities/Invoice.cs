using mototun.Core.Enums;

namespace mototun.Core.Entities;

public class Invoice
{
    public int Id { get; set; }

    public int RevendeurId { get; set; }
    public Revendeur Revendeur { get; set; } = null!;

    public int ClientId { get; set; }
    public Client Client { get; set; } = null!;

    public int? AssignedFournisseurId { get; set; }
    public Fournisseur? AssignedFournisseur { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;
    public string ClientPortalAccessCode { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public CarteGriseStatus CarteGriseStatus { get; set; } = CarteGriseStatus.PendingDocuments;
    public DateTime? SentToFournisseurAt { get; set; }
    public int? CarteGriseStatusUpdatedByUserId { get; set; }
    public DateTime? CarteGriseStatusUpdatedAt { get; set; }
    public string? DocumentIssueMessage { get; set; }
    public string? DocumentIssueReasonsJson { get; set; }
    public string? DocumentFixChecklistJson { get; set; }
    public int? DocumentIssueUpdatedByUserId { get; set; }
    public DateTime? DocumentIssueUpdatedAt { get; set; }
    public string? ClientUpdateMessage { get; set; }
    public int? ClientUpdateUpdatedByUserId { get; set; }
    public DateTime? ClientUpdateUpdatedAt { get; set; }

    public string? Notes { get; set; }

    public ICollection<SoldMotorcycle> SoldMotorcycles { get; set; } = new List<SoldMotorcycle>();
    public ICollection<ClientPortalDocument> ClientPortalDocuments { get; set; } = new List<ClientPortalDocument>();
    public ICollection<InvoiceTimelineEvent> TimelineEvents { get; set; } = new List<InvoiceTimelineEvent>();

    public decimal TotalAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
