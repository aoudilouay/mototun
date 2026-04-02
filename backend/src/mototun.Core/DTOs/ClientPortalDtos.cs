using mototun.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs;

public class ClientPortalAccessDto
{
    [Required]
    [MaxLength(128)]
    public string Code { get; set; } = string.Empty;
}

public class ClientPortalDossierDto
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string AccessCode { get; set; } = string.Empty;

    public string ClientName { get; set; } = string.Empty;
    public string ClientCIN { get; set; } = string.Empty;

    public string RevendeurName { get; set; } = string.Empty;
    public string? RevendeurPhone { get; set; }
    public string? RevendeurEmail { get; set; }

    public string MotorcycleCompany { get; set; } = string.Empty;
    public string MotorcycleBrand { get; set; } = string.Empty;
    public string MotorcycleModel { get; set; } = string.Empty;
    public string ChassisNumber { get; set; } = string.Empty;
    public string? Matricule { get; set; }

    public decimal TotalAmount { get; set; }
    public InvoiceStatus InvoiceStatus { get; set; }
    public CarteGriseStatus CarteGriseStatus { get; set; }

    public DateTime InvoiceDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsCinUploaded { get; set; }
    public bool IsCinFrontUploaded { get; set; }
    public bool IsCinBackUploaded { get; set; }
    public bool IsDeclarationUploaded { get; set; }
    public bool IsFactureUploaded { get; set; }
    public string? ClientUpdateMessage { get; set; }
    public DateTime? ClientUpdateUpdatedAt { get; set; }

    public List<ClientPortalDocumentDto> Documents { get; set; } = new();
}

public class ClientPortalDocumentDto
{
    public int DocumentId { get; set; }
    public ClientPortalDocumentType DocumentType { get; set; }
    public string DocumentLabel { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public bool UploadedByClient { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ClientPortalUploadResultDto
{
    public int DocumentId { get; set; }
    public ClientPortalDocumentType DocumentType { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime UpdatedAt { get; set; }
}
