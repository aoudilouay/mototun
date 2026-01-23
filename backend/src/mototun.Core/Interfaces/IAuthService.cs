using mototun.Core.DTOs.Auth;

namespace mototun.Core.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<bool> UserExistsAsync(string email);
    }
}
