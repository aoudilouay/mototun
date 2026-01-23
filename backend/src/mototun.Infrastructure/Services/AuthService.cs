using mototun.Core.DTOs.Auth;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Core.Interfaces;
using mototun.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace mototun.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            // Validate unique email
            if (await UserExistsAsync(dto.Email))
            {
                throw new Exception("A user with this email already exists");
            }

            // Validate role-specific fields
            if (dto.Role == UserRole.Revendeur || dto.Role == UserRole.Fournisseur)
            {
                if (string.IsNullOrWhiteSpace(dto.BusinessName))
                    throw new Exception("Business name is required");
                
                if (string.IsNullOrWhiteSpace(dto.TaxId))
                    throw new Exception("Tax ID is required");
                
                var taxIdExists = dto.Role == UserRole.Revendeur
                    ? await _context.Revendeurs.AnyAsync(r => r.TaxId == dto.TaxId)
                    : await _context.Fournisseurs.AnyAsync(f => f.TaxId == dto.TaxId);
                
                if (taxIdExists)
                    throw new Exception("Tax ID already exists");
            }

            if (dto.Role == UserRole.Client)
            {
                if (string.IsNullOrWhiteSpace(dto.CIN))
                    throw new Exception("CIN is required");
                
                if (await _context.Clients.AnyAsync(c => c.CIN == dto.CIN))
                    throw new Exception("CIN already exists");
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // Create user
            var user = new User
            {
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = passwordHash,
                FullName = dto.FullName.Trim(),
                Phone = dto.Phone?.Trim(),
                Role = dto.Role,
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Create role-specific profile
            object? profile = null;

            if (dto.Role == UserRole.Revendeur)
            {
                var revendeur = new Revendeur
                {
                    UserId = user.Id,
                    BusinessName = dto.BusinessName!,
                    TaxId = dto.TaxId!,
                    Address = dto.Address ?? string.Empty,
                    City = dto.City ?? string.Empty,
                    PostalCode = dto.PostalCode ?? string.Empty,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Revendeurs.Add(revendeur);
                profile = revendeur;
            }
            else if (dto.Role == UserRole.Fournisseur)
            {
                var fournisseur = new Fournisseur
                {
                    UserId = user.Id,
                    BusinessName = dto.BusinessName!,
                    TaxId = dto.TaxId!,
                    Address = dto.Address ?? string.Empty,
                    City = dto.City ?? string.Empty,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Fournisseurs.Add(fournisseur);
                profile = fournisseur;
            }
            else if (dto.Role == UserRole.Client)
            {
                var client = new Client
                {
                    UserId = user.Id,
                    CIN = dto.CIN!,
                    Address = dto.Address ?? string.Empty,
                    City = dto.City ?? string.Empty,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Clients.Add(client);
                profile = client;
            }

            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token,
                Avatar = user.Avatar,
                Profile = profile
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.RevendeurProfile)
                .Include(u => u.FournisseurProfile)
                .Include(u => u.ClientProfile)
                .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower().Trim());

            if (user == null)
            {
                throw new Exception("Invalid email or password");
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                throw new Exception("Invalid email or password");
            }

            if (user.Status != UserStatus.Active)
            {
                throw new Exception("Your account is not active");
            }

            user.LastLoginAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            object? profile = user.Role switch
            {
                UserRole.Revendeur => user.RevendeurProfile,
                UserRole.Fournisseur => user.FournisseurProfile,
                UserRole.Client => user.ClientProfile,
                _ => null
            };

            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token,
                Avatar = user.Avatar,
                Profile = profile
            };
        }

        public async Task<bool> UserExistsAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email == email.ToLower().Trim());
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? throw new Exception("JWT SecretKey not configured");
            
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("Status", user.Status.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
