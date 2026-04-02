using mototun.Core.DTOs.Auth;

namespace mototun.Core.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<PasswordResetDispatchDto?> PreparePasswordResetAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default);
        Task ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default);
        Task<AuthResponseDto?> GetByIdAsync(int userId);
        Task<bool> UserExistsAsync(string email);
    }
}
