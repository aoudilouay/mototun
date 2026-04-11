using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class LoginDto
    {
        [Required(ErrorMessage = "Ajoutez votre email.")]
        [EmailAddress(ErrorMessage = "L adresse email n est pas valide.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ajoutez votre mot de passe.")]
        [MaxLength(128, ErrorMessage = "Le mot de passe est trop long.")]
        public string Password { get; set; } = string.Empty;

        [MaxLength(2048, ErrorMessage = "Le jeton de securite est trop long.")]
        public string? TurnstileToken { get; set; }
    }
}
