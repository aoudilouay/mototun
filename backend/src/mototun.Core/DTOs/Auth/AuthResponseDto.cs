namespace mototun.Core.DTOs.Auth
{
    public class AuthResponseDto
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public object? Profile { get; set; }
    }
}
