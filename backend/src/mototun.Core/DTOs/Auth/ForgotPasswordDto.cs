using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Ajoutez votre email.")]
        [EmailAddress(ErrorMessage = "L adresse email n est pas valide.")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(2048, ErrorMessage = "Le jeton de securite est trop long.")]
        public string? TurnstileToken { get; set; }
    }
}
