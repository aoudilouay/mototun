namespace mototun.Core.Entities
{
    public class Motorcycle
    {
        public int Id { get; set; }

        public int RevendeurId { get; set; }
        public Revendeur Revendeur { get; set; } = null!;

        public string Company { get; set; } = string.Empty; // fournisseur
        public string Brand { get; set; } = string.Empty;   // marque
        public string Model { get; set; } = string.Empty;   // model

        public int Qty { get; set; }                         // nombre
        public decimal PurchasePrice { get; set; }           // prix achat
        public decimal SalePrice { get; set; }               // prix vente

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
