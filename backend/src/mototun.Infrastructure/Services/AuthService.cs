using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using mototun.Core.DTOs.Auth;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Core.Exceptions;
using mototun.Core.Interfaces;
using mototun.Infrastructure.Data;

namespace mototun.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private const int MinimumPasswordLength = 10;
        private const int MaxFailedLoginAttempts = 5;
        private const int LockoutDurationMinutes = 15;
        private const int DefaultPasswordResetTokenExpiryMinutes = 30;
        private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword("MototunDummyPassword#2026");

        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            ValidatePasswordStrength(dto.Password);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var normalizedTaxId = dto.TaxId?.Trim() ?? string.Empty;

            if (await UserExistsAsync(normalizedEmail))
            {
                throw new AuthValidationException("A user with this email already exists");
            }

            if (dto.Role is not (UserRole.Revendeur or UserRole.Fournisseur))
            {
                throw new AuthValidationException("Public registration is restricted to revendeur and fournisseur accounts.");
            }

            if (string.IsNullOrWhiteSpace(dto.BusinessName))
            {
                throw new AuthValidationException("Business name is required");
            }

            if (string.IsNullOrWhiteSpace(normalizedTaxId))
            {
                throw new AuthValidationException("Tax ID is required");
            }

            var taxIdExists = dto.Role == UserRole.Revendeur
                ? await _context.Revendeurs.AnyAsync(r => r.TaxId == normalizedTaxId)
                : await _context.Fournisseurs.AnyAsync(f => f.TaxId == normalizedTaxId);

            if (taxIdExists)
            {
                throw new AuthValidationException("Tax ID already exists");
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            var now = DateTime.UtcNow;

            var user = new User
            {
                Email = normalizedEmail,
                PasswordHash = passwordHash,
                FullName = dto.FullName.Trim(),
                Phone = dto.Phone?.Trim(),
                Role = dto.Role,
                Status = UserStatus.Active,
                CreatedAt = now,
                UpdatedAt = now,
                FailedLoginAttempts = 0
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            Revendeur? createdRevendeur = null;
            Fournisseur? createdFournisseur = null;

            if (dto.Role == UserRole.Revendeur)
            {
                var revendeur = new Revendeur
                {
                    UserId = user.Id,
                    BusinessName = dto.BusinessName!.Trim(),
                    TaxId = normalizedTaxId,
                    Address = dto.Address ?? string.Empty,
                    City = dto.City ?? string.Empty,
                    PostalCode = dto.PostalCode ?? string.Empty,
                    CreatedAt = now
                };
                _context.Revendeurs.Add(revendeur);
                createdRevendeur = revendeur;
            }
            else if (dto.Role == UserRole.Fournisseur)
            {
                var fournisseur = new Fournisseur
                {
                    UserId = user.Id,
                    BusinessName = dto.BusinessName!.Trim(),
                    TaxId = normalizedTaxId,
                    Address = dto.Address ?? string.Empty,
                    City = dto.City ?? string.Empty,
                    CreatedAt = now
                };
                _context.Fournisseurs.Add(fournisseur);
                createdFournisseur = fournisseur;
            }

            await _context.SaveChangesAsync();

            var profile = createdRevendeur is not null
                ? BuildSafeProfile(createdRevendeur)
                : BuildSafeProfile(createdFournisseur);

            var token = GenerateJwtToken(user);
            return BuildAuthResponse(user, profile, token);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var now = DateTime.UtcNow;

            var user = await _context.Users
                .Include(u => u.RevendeurProfile)
                .Include(u => u.FournisseurProfile)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user is null)
            {
                BCrypt.Net.BCrypt.Verify(dto.Password, DummyPasswordHash);
                throw new AuthAuthenticationException("Invalid email or password");
            }

            if (user.LockoutEndAt.HasValue && user.LockoutEndAt.Value > now)
            {
                throw new AuthAuthenticationException("Invalid email or password");
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                await RegisterFailedLoginAttemptAsync(user, now);
                throw new AuthAuthenticationException("Invalid email or password");
            }

            if (user.Status != UserStatus.Active || !user.CanLogin)
            {
                await RegisterFailedLoginAttemptAsync(user, now);
                throw new AuthAuthenticationException("Invalid email or password");
            }

            user.LastLoginAt = now;
            user.UpdatedAt = now;
            user.FailedLoginAttempts = 0;
            user.LockoutEndAt = null;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            var profile = user.Role switch
            {
                UserRole.Revendeur => BuildSafeProfile(user.RevendeurProfile),
                UserRole.Fournisseur => BuildSafeProfile(user.FournisseurProfile),
                _ => null
            };

            return BuildAuthResponse(user, profile, token);
        }

        public async Task<PasswordResetDispatchDto?> PreparePasswordResetAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

            if (user is null || user.Status != UserStatus.Active || !user.CanLogin)
            {
                HashToken(CreateSecureToken());
                return null;
            }

            var token = CreateSecureToken();
            var now = DateTime.UtcNow;

            user.PasswordResetTokenHash = HashToken(token);
            user.PasswordResetTokenExpiresAt = now.AddMinutes(GetPasswordResetTokenExpiryMinutes());
            user.PasswordResetRequestedAt = now;
            user.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            return new PasswordResetDispatchDto
            {
                Email = user.Email,
                FullName = user.FullName,
                Token = token
            };
        }

        public async Task ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default)
        {
            if (!string.Equals(dto.NewPassword, dto.ConfirmPassword, StringComparison.Ordinal))
            {
                throw new AuthValidationException("Passwords do not match.");
            }

            ValidatePasswordStrength(dto.NewPassword);

            var token = dto.Token?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new AuthValidationException("Invalid or expired reset token.");
            }

            var tokenHash = HashToken(token);
            var now = DateTime.UtcNow;

            var user = await _context.Users.FirstOrDefaultAsync(
                u => u.PasswordResetTokenHash == tokenHash,
                cancellationToken);

            if (user is null
                || !user.PasswordResetTokenExpiresAt.HasValue
                || user.PasswordResetTokenExpiresAt.Value <= now)
            {
                throw new AuthValidationException("Invalid or expired reset token.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.PasswordResetTokenHash = null;
            user.PasswordResetTokenExpiresAt = null;
            user.PasswordResetRequestedAt = null;
            user.FailedLoginAttempts = 0;
            user.LockoutEndAt = null;
            user.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<AuthResponseDto?> GetByIdAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.RevendeurProfile)
                .Include(u => u.FournisseurProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user is null || user.Status != UserStatus.Active || !user.CanLogin)
            {
                return null;
            }

            var profile = user.Role switch
            {
                UserRole.Revendeur => BuildSafeProfile(user.RevendeurProfile),
                UserRole.Fournisseur => BuildSafeProfile(user.FournisseurProfile),
                _ => null
            };

            return BuildAuthResponse(user, profile, token: null);
        }

        public async Task<bool> UserExistsAsync(string email)
        {
            var normalizedEmail = NormalizeEmail(email);
            return await _context.Users.AnyAsync(u => u.Email == normalizedEmail);
        }

        private async Task RegisterFailedLoginAttemptAsync(User user, DateTime now)
        {
            user.FailedLoginAttempts += 1;
            user.UpdatedAt = now;

            if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
            {
                user.LockoutEndAt = now.AddMinutes(LockoutDurationMinutes);
                user.FailedLoginAttempts = 0;
            }

            await _context.SaveChangesAsync();
        }

        private int GetPasswordResetTokenExpiryMinutes()
        {
            var configuredValue = _configuration.GetValue<int?>("AuthSettings:PasswordResetTokenExpiryMinutes");
            return Math.Clamp(configuredValue ?? DefaultPasswordResetTokenExpiryMinutes, 10, 120);
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
            var configuredExpiration = int.TryParse(jwtSettings["ExpirationInDays"], out var parsedExpiration)
                ? parsedExpiration
                : 7;
            var expirationInDays = Math.Clamp(configuredExpiration, 1, 30);

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("Status", user.Status.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddDays(expirationInDays),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static void ValidatePasswordStrength(string password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumPasswordLength)
            {
                throw new AuthValidationException($"Password must be at least {MinimumPasswordLength} characters long.");
            }

            var hasUpper = false;
            var hasLower = false;
            var hasDigit = false;
            var hasSpecial = false;

            foreach (var ch in password)
            {
                if (char.IsUpper(ch))
                {
                    hasUpper = true;
                    continue;
                }

                if (char.IsLower(ch))
                {
                    hasLower = true;
                    continue;
                }

                if (char.IsDigit(ch))
                {
                    hasDigit = true;
                    continue;
                }

                if (!char.IsLetterOrDigit(ch))
                {
                    hasSpecial = true;
                }
            }

            if (!hasUpper || !hasLower || !hasDigit || !hasSpecial)
            {
                throw new AuthValidationException("Password must include uppercase, lowercase, number, and special character.");
            }
        }

        private static string NormalizeEmail(string email)
        {
            return email.Trim().ToLowerInvariant();
        }

        private static string CreateSecureToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(48);
            return Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static string HashToken(string token)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        private static AuthResponseDto BuildAuthResponse(User user, object? profile, string? token)
        {
            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token ?? string.Empty,
                Avatar = user.Avatar,
                Profile = profile
            };
        }

        private static object? BuildSafeProfile(Revendeur? revendeur)
        {
            if (revendeur is null)
            {
                return null;
            }

            return new
            {
                id = revendeur.Id,
                profileId = revendeur.Id,
                userId = revendeur.UserId,
                role = UserRole.Revendeur,
                businessName = revendeur.BusinessName,
                taxId = revendeur.TaxId,
                address = revendeur.Address,
                city = revendeur.City,
                postalCode = revendeur.PostalCode,
                registrationNumber = revendeur.RegistrationNumber,
                createdAt = revendeur.CreatedAt
            };
        }

        private static object? BuildSafeProfile(Fournisseur? fournisseur)
        {
            if (fournisseur is null)
            {
                return null;
            }

            return new
            {
                id = fournisseur.Id,
                profileId = fournisseur.Id,
                userId = fournisseur.UserId,
                role = UserRole.Fournisseur,
                businessName = fournisseur.BusinessName,
                taxId = fournisseur.TaxId,
                address = fournisseur.Address,
                city = fournisseur.City,
                registrationNumber = fournisseur.RegistrationNumber,
                createdAt = fournisseur.CreatedAt
            };
        }
    }
}
