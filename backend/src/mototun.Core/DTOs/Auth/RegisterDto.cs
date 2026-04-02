using mototun.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(10, ErrorMessage = "Password must be at least 10 characters")]
        [MaxLength(128, ErrorMessage = "Password is too long")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Full name is required")]
        [MinLength(3, ErrorMessage = "Full name must be at least 3 characters")]
        [MaxLength(255, ErrorMessage = "Full name is too long")]
        public string FullName { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Invalid phone number")]
        public string? Phone { get; set; }

        [Required(ErrorMessage = "Role is required")]
        public UserRole Role { get; set; }

        // For Revendeur/Fournisseur
        [MaxLength(255, ErrorMessage = "Business name is too long")]
        public string? BusinessName { get; set; }
        [MaxLength(50, ErrorMessage = "Tax ID is too long")]
        public string? TaxId { get; set; }
        [MaxLength(500, ErrorMessage = "Address is too long")]
        public string? Address { get; set; }
        [MaxLength(100, ErrorMessage = "City is too long")]
        public string? City { get; set; }
        [MaxLength(20, ErrorMessage = "Postal code is too long")]
        public string? PostalCode { get; set; }
        
        // For Client
        [MaxLength(50, ErrorMessage = "CIN is too long")]
        public string? CIN { get; set; }

        [MaxLength(2048, ErrorMessage = "Security token is too long")]
        public string? TurnstileToken { get; set; }
    }
}
