using mototun.Core.Enums;

namespace mototun.Core.DTOs
{
    public class ClientDto
    {
        public int ClientId { get; set; }      // Client.Id
        public string FullName { get; set; } = string.Empty;
        public string CIN { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int MotorcyclesPurchasedCount { get; set; }
        public decimal TotalInvoicedAmount { get; set; }
        public DateTime? LastPurchaseDate { get; set; }
        public ClientStatus Status { get; set; }
    }

    public class CreateClientDto
    {
        public string FullName { get; set; } = string.Empty;
        public string CIN { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
    }

    public class UpdateClientDto
    {
        public string FullName { get; set; } = string.Empty;
        public string CIN { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
    }
}
