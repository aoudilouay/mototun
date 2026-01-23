namespace mototun.Core.Entities
{
    public class Client
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        public int? RevendeurId { get; set; }
        public Revendeur? Revendeur { get; set; }
        
        public string CIN { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
