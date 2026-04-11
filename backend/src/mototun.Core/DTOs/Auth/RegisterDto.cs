using mototun.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "Ajoutez votre email.")]
        [EmailAddress(ErrorMessage = "L adresse email n est pas valide.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ajoutez un mot de passe.")]
        [MinLength(10, ErrorMessage = "Ajoutez au moins 10 caracteres.")]
        [MaxLength(128, ErrorMessage = "Le mot de passe est trop long.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ajoutez le nom du responsable.")]
        [MinLength(3, ErrorMessage = "Ajoutez au moins 3 caracteres pour le nom.")]
        [MaxLength(255, ErrorMessage = "Le nom est trop long.")]
        public string FullName { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Le numero de telephone n est pas valide.")]
        public string? Phone { get; set; }

        [Required(ErrorMessage = "Choisissez votre type de compte.")]
        public UserRole Role { get; set; }

        // For Revendeur/Fournisseur
        [MaxLength(255, ErrorMessage = "Le nom du magasin ou de la societe est trop long.")]
        public string? BusinessName { get; set; }
        [MaxLength(50, ErrorMessage = "Le matricule fiscal est trop long.")]
        public string? TaxId { get; set; }
        [MaxLength(500, ErrorMessage = "L adresse est trop longue.")]
        public string? Address { get; set; }
        [MaxLength(100, ErrorMessage = "Le nom de la ville est trop long.")]
        public string? City { get; set; }
        [MaxLength(20, ErrorMessage = "Le code postal est trop long.")]
        public string? PostalCode { get; set; }
        
        // For Client
        [MaxLength(50, ErrorMessage = "Le CIN est trop long.")]
        public string? CIN { get; set; }

        [MaxLength(2048, ErrorMessage = "Le jeton de securite est trop long.")]
        public string? TurnstileToken { get; set; }
    }
}
