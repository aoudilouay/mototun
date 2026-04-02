namespace mototun.Core.DTOs.Auth
{
    public class PasswordResetDispatchDto
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
