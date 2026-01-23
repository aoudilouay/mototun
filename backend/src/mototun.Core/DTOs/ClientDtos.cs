namespace mototun.Core.DTOs
{
    public class ClientDto
    {
        public int ClientId { get; set; }      // Client.Id
        public int UserId { get; set; }        // User.Id
        public string FullName { get; set; } = string.Empty;
        public string CIN { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
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
