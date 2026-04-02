namespace mototun.Core.Entities;

/// <summary>
/// Simple, minimal invoice settings per revendeur.
/// Stores only: company name, logo image, signature image.
/// Uses fixed professional invoice template - no customization.
/// </summary>
public class RevendeurInvoiceSettings
{
    public int RevendeurId { get; set; }

    /// <summary>
    /// Company/business name to display on invoices.
    /// </summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>
    /// Optional logo image bytes (PNG, JPG, WEBP).
    /// Displayed in top-right of invoice if provided.
    /// </summary>
    public byte[]? LogoImage { get; set; }

    /// <summary>
    /// Optional signature image bytes (PNG, JPG, WEBP).
    /// Displayed in signature section if provided.
    /// </summary>
    public byte[]? SignatureImage { get; set; }

    // Navigation property (optional)
    public Revendeur? Revendeur { get; set; }
}
