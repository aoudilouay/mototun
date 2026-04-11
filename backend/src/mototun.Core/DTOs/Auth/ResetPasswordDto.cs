using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class ResetPasswordDto
    {
        [Required(ErrorMessage = "Le lien de reinitialisation est obligatoire.")]
        [MaxLength(512, ErrorMessage = "Le lien de reinitialisation est trop long.")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ajoutez votre nouveau mot de passe.")]
        [MinLength(10, ErrorMessage = "Ajoutez au moins 10 caracteres.")]
        [MaxLength(128, ErrorMessage = "Le mot de passe est trop long.")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmez votre mot de passe.")]
        [Compare(nameof(NewPassword), ErrorMessage = "Les mots de passe ne correspondent pas.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
