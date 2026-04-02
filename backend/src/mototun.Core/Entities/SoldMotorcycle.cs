namespace mototun.Core.Entities;

public class SoldMotorcycle
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public int RevendeurId { get; set; }
    public Revendeur Revendeur { get; set; } = null!;

    public int? StockMotorcycleId { get; set; }
    public Motorcycle? StockMotorcycle { get; set; }

    public string Company { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;

    public string ChassisNumber { get; set; } = string.Empty;
    public string? EngineNumber { get; set; }
    public string? Matricule { get; set; }

    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
