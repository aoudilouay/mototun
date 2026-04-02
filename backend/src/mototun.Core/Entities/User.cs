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
        public bool CanLogin { get; set; } = true;
        public int FailedLoginAttempts { get; set; }
        public DateTime? LockoutEndAt { get; set; }
        public string? PasswordResetTokenHash { get; set; }
        public DateTime? PasswordResetTokenExpiresAt { get; set; }
        public DateTime? PasswordResetRequestedAt { get; set; }
        public string? GoogleSubject { get; set; }


        // Navigation Properties
        public Revendeur? RevendeurProfile { get; set; }
        public Fournisseur? FournisseurProfile { get; set; }
    }
}
