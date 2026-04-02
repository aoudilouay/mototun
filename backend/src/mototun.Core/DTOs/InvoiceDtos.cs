using mototun.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs;

public class CreateInvoiceDto
{
    [Range(1, int.MaxValue)]
    public int? ClientId { get; set; }

    public CreateInvoiceClientDto? Client { get; set; }

    [MaxLength(64)]
    public string? InvoiceNumber { get; set; }

    public DateTime? InvoiceDate { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    // Backward-compatible single item payload shape.
    public CreateSoldMotorcycleDto? SoldMotorcycle { get; set; }

    // Preferred payload shape for flexible invoice creation.
    public List<CreateSoldMotorcycleDto> SoldMotorcycles { get; set; } = new();
}

public class CreateInvoiceClientDto
{
    [Required]
    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string CIN { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }
}

public class CreateSoldMotorcycleDto
{
    public int? StockMotorcycleId { get; set; }

    [MaxLength(100)]
    public string? Company { get; set; }

    [MaxLength(100)]
    public string? Brand { get; set; }

    [MaxLength(150)]
    public string? Model { get; set; }

    [MaxLength(120)]
    public string ChassisNumber { get; set; } = string.Empty;

    // Kept optional for backward binary compatibility with running/hot-reload API instances.
    // New assignment/auth flow uses chassis only.
    [MaxLength(120)]
    public string? EngineNumber { get; set; }

    // Kept optional for backward binary compatibility with running/hot-reload API instances.
    // New assignment/auth flow uses chassis only.
    [MaxLength(120)]
    public string? Matricule { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PurchasePrice { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? SalePrice { get; set; }
}

public class SoldMotorcycleDto
{
    public int SoldMotorcycleId { get; set; }
    public int InvoiceId { get; set; }
    public int? StockMotorcycleId { get; set; }

    public string Company { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;

    public string ChassisNumber { get; set; } = string.Empty;
    public string? EngineNumber { get; set; }
    public string? Matricule { get; set; }

    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class InvoiceDto
{
    public int InvoiceId { get; set; }
    public int RevendeurId { get; set; }
    public string? RevendeurBusinessName { get; set; }
    public string? RevendeurAvatar { get; set; }
    public int ClientId { get; set; }

    public string ClientFullName { get; set; } = string.Empty;
    public string ClientCIN { get; set; } = string.Empty;
    public string? ClientEmail { get; set; }
    public string? ClientPhone { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string ClientPortalAccessCode { get; set; } = string.Empty;

    public InvoiceStatus Status { get; set; }
    public CarteGriseStatus CarteGriseStatus { get; set; }
    public int? AssignedFournisseurId { get; set; }
    public string? AssignedFournisseurBusinessName { get; set; }
    public string? AssignedFournisseurAvatar { get; set; }
    public string? AssignedFournisseurEmail { get; set; }
    public DateTime? SentToFournisseurAt { get; set; }
    public int? CarteGriseStatusUpdatedByUserId { get; set; }
    public DateTime? CarteGriseStatusUpdatedAt { get; set; }
    public string? DocumentIssueMessage { get; set; }
    public List<DocumentValidationReason> DocumentIssueReasons { get; set; } = new();
    public List<string> DocumentFixChecklist { get; set; } = new();
    public int? DocumentIssueUpdatedByUserId { get; set; }
    public DateTime? DocumentIssueUpdatedAt { get; set; }
    public string? ClientUpdateMessage { get; set; }
    public int? ClientUpdateUpdatedByUserId { get; set; }
    public DateTime? ClientUpdateUpdatedAt { get; set; }

    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsCinUploaded { get; set; }
    public bool IsCinFrontUploaded { get; set; }
    public bool IsCinBackUploaded { get; set; }
    public bool IsDeclarationUploaded { get; set; }
    public bool IsFactureUploaded { get; set; }
    public bool IsJustificatifUploaded { get; set; }
    public bool IsCarteGriseUploaded { get; set; }

    public List<SoldMotorcycleDto> SoldMotorcycles { get; set; } = new();
    public List<InvoiceDocumentDto> Documents { get; set; } = new();
    public List<InvoiceTimelineEventDto> Timeline { get; set; } = new();
}

public class InvoiceTimelineEventDto
{
    public int EventId { get; set; }
    public InvoiceTimelineEventType EventType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? ActorUserId { get; set; }
    public UserRole? ActorRole { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateInvoiceStatusDto
{
    public InvoiceStatus Status { get; set; }
}

public class UpdateCarteGriseStatusDto
{
    public CarteGriseStatus Status { get; set; }
}

public class UpdateDocumentIssueMessageDto
{
    [MaxLength(2000)]
    public string? Message { get; set; }
}

public class UpdateDocumentValidationDto
{
    public List<DocumentValidationReason> Reasons { get; set; } = new();
    public List<string> Checklist { get; set; } = new();

    [MaxLength(2000)]
    public string? AdditionalMessage { get; set; }

    public bool SendChecklistToClient { get; set; }
}

public class UpdateClientUpdateMessageDto
{
    [MaxLength(2000)]
    public string? Message { get; set; }
}

public class SendToFournisseurDto
{
    [Range(1, int.MaxValue)]
    public int FournisseurId { get; set; }
}

public class CreateInvoiceResultDto
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string ClientPortalAccessCode { get; set; } = string.Empty;
    public InvoiceStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
}

public class InvoiceDocumentDto
{
    public int DocumentId { get; set; }
    public ClientPortalDocumentType DocumentType { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public bool UploadedByClient { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FournisseurDashboardAnalyticsDto
{
    public string Range { get; set; } = "month";
    public DateTime RangeStartUtc { get; set; }
    public DateTime RangeEndUtc { get; set; }
    public DateTime PreviousRangeStartUtc { get; set; }

    public int ReceivedCurrent { get; set; }
    public int ReceivedPrevious { get; set; }
    public int CompletedCurrent { get; set; }
    public int CompletedPrevious { get; set; }
    public int RejectedCurrent { get; set; }
    public int RejectedPrevious { get; set; }

    public decimal CompletionRateCurrent { get; set; }
    public decimal CompletionRatePrevious { get; set; }
    public decimal DocumentsCoverageCurrent { get; set; }
    public decimal DocumentsCoveragePrevious { get; set; }
    public double AverageTurnaroundDaysCurrent { get; set; }
    public double AverageTurnaroundDaysPrevious { get; set; }
    public decimal AmountCurrent { get; set; }
    public decimal AmountPrevious { get; set; }

    public int TotalDossiers { get; set; }
    public int BacklogOpen { get; set; }
    public int DocumentsCompleteTotal { get; set; }
    public int SlaAtRiskOpen { get; set; }
    public int SlaStuckOpen { get; set; }
    public int SlaEscalationsLast30Days { get; set; }
    public int StatusPending { get; set; }
    public int StatusDocumentsReceived { get; set; }
    public int StatusInProgress { get; set; }
    public int StatusCompleted { get; set; }
    public int StatusRejected { get; set; }

    public int ConnectedRevendeurs { get; set; }
    public int IncomingPendingPartnerships { get; set; }
    public int OutgoingPendingPartnerships { get; set; }
    public int PartnershipsAcceptedCurrent { get; set; }
    public int PartnershipsAcceptedPrevious { get; set; }

    public List<FournisseurDashboardTimelinePointDto> Timeline { get; set; } = new();
    public List<FournisseurDashboardRevendeurDto> Revendeurs { get; set; } = new();
}

public class FournisseurDashboardTimelinePointDto
{
    public DateTime BucketStartUtc { get; set; }
    public DateTime BucketEndUtc { get; set; }
    public string Label { get; set; } = string.Empty;
    public int ReceivedCount { get; set; }
    public int CompletedCount { get; set; }
    public int RejectedCount { get; set; }
    public decimal AmountReceived { get; set; }
}

public class FournisseurDashboardRevendeurDto
{
    public int RevendeurId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public int TotalDossiers { get; set; }
    public int OpenDossiers { get; set; }
    public int CompletedDossiers { get; set; }
    public int RejectedDossiers { get; set; }
    public int DocumentsCompleteDossiers { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal CompletionRate { get; set; }
    public decimal DocumentsCoverageRate { get; set; }
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>
/// Simplified invoice settings (no complex customization).
/// Stores only: company name, logo image bytes, signature image bytes.
/// Uses fixed professional Modern & Minimal template.
/// </summary>
public class GetInvoiceSettingsDto
{
    [MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    public bool HasLogo { get; set; }
    public bool HasSignature { get; set; }
}

/// <summary>
/// Update invoice settings with file uploads (no complex customization).
/// Simply stores company name, logo, and signature.
/// </summary>
public class UpdateInvoiceSettingsDto
{
    [Required]
    [MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? LogoFileName { get; set; }

    [MaxLength(100)]
    public string? SignatureFileName { get; set; }
}
