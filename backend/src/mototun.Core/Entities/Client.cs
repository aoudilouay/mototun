using mototun.Core.Enums;

namespace mototun.Core.Entities
{
    public class Client
    {
        public int Id { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        
        public int? RevendeurId { get; set; }
        public Revendeur? Revendeur { get; set; }
        
        public string CIN { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public ClientStatus Status { get; set; } = ClientStatus.Active;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
