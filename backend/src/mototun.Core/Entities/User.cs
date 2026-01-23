using mototun.Core.Enums;

namespace mototun.Core.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public UserRole Role { get; set; } = UserRole.Client;
        public UserStatus Status { get; set; } = UserStatus.Active;
        public string? Avatar { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }

        // Navigation Properties
        public Revendeur? RevendeurProfile { get; set; }
        public Fournisseur? FournisseurProfile { get; set; }
        public Client? ClientProfile { get; set; }
    }
}
