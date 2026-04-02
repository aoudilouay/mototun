using System.ComponentModel.DataAnnotations;

namespace mototun.Core.DTOs.Auth
{
    public class ResetPasswordDto
    {
        [Required(ErrorMessage = "Reset token is required")]
        [MaxLength(512, ErrorMessage = "Reset token is too long")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required")]
        [MinLength(10, ErrorMessage = "Password must be at least 10 characters")]
        [MaxLength(128, ErrorMessage = "Password is too long")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirm password is required")]
        [Compare(nameof(NewPassword), ErrorMessage = "Passwords do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
