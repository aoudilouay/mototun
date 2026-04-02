using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(2048, ErrorMessage = "Security token is too long")]
        public string? TurnstileToken { get; set; }
    }
}
