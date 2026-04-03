using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.API.Services.Storage;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers;

[Authorize(Roles = "Revendeur,Fournisseur")]
[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private const long MaxAvatarUploadBytes = 5_000_000;
    private static readonly HashSet<string> AllowedAvatarExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
        ".jfif",
        ".heic",
        ".heif",
        ".avif"
    };

    private readonly ApplicationDbContext _context;
    private readonly IAvatarStorage _avatarStorage;

    public ProfileController(ApplicationDbContext context, IAvatarStorage avatarStorage)
    {
        _context = context;
        _avatarStorage = avatarStorage;
    }

    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<MyProfileDto>>> GetMyProfile()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var profile = await GetProfileAsync(role, currentUserId);
        if (profile is null)
        {
            return Forbid();
        }

        return Ok(new ApiResponse<MyProfileDto>
        {
            Success = true,
            Message = "Profile loaded",
            Data = profile
        });
    }

    [HttpPut("me")]
    public async Task<ActionResult<ApiResponse<MyProfileDto>>> UpdateMyProfile([FromBody] UpdateMyProfileDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (dto is null)
        {
            return BadRequest(new ApiResponse<MyProfileDto>
            {
                Success = false,
                Message = "Profile payload is required"
            });
        }

        var now = DateTime.UtcNow;

        if (role == UserRole.Revendeur)
        {
            var revendeur = await _context.Revendeurs
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var validationError = ApplyCommonUpdates(dto, revendeur.User, now);
            if (validationError is not null)
            {
                return BadRequest(new ApiResponse<MyProfileDto>
                {
                    Success = false,
                    Message = validationError
                });
            }

            if (dto.BusinessName is not null)
            {
                var normalized = NormalizeRequired(dto.BusinessName, 255);
                if (normalized is null)
                {
                    return BadRequest(new ApiResponse<MyProfileDto>
                    {
                        Success = false,
                        Message = "Business name cannot be empty"
                    });
                }

                revendeur.BusinessName = normalized;
            }

            if (dto.TaxId is not null)
            {
                var normalizedTaxId = NormalizeRequired(dto.TaxId, 50);
                if (normalizedTaxId is null)
                {
                    return BadRequest(new ApiResponse<MyProfileDto>
                    {
                        Success = false,
                        Message = "Tax ID cannot be empty"
                    });
                }

                var taxInUse = await _context.Revendeurs
                    .AnyAsync(r => r.Id != revendeur.Id && r.TaxId == normalizedTaxId);

                if (taxInUse)
                {
                    return Conflict(new ApiResponse<MyProfileDto>
                    {
                        Success = false,
                        Message = "Tax ID already used by another revendeur"
                    });
                }

                revendeur.TaxId = normalizedTaxId;
            }

            if (dto.Address is not null)
            {
                revendeur.Address = NormalizeValue(dto.Address, 500) ?? string.Empty;
            }

            if (dto.City is not null)
            {
                revendeur.City = NormalizeValue(dto.City, 100) ?? string.Empty;
            }

            if (dto.PostalCode is not null)
            {
                revendeur.PostalCode = NormalizeValue(dto.PostalCode, 20) ?? string.Empty;
            }

            if (dto.RegistrationNumber is not null)
            {
                revendeur.RegistrationNumber = NormalizeValue(dto.RegistrationNumber, 100);
            }

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<MyProfileDto>
            {
                Success = true,
                Message = "Profile updated",
                Data = MapProfile(revendeur)
            });
        }

        if (role == UserRole.Fournisseur)
        {
            var fournisseur = await _context.Fournisseurs
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.UserId == currentUserId);

            if (fournisseur is null)
            {
                return Forbid();
            }

            var validationError = ApplyCommonUpdates(dto, fournisseur.User, now);
            if (validationError is not null)
            {
                return BadRequest(new ApiResponse<MyProfileDto>
                {
                    Success = false,
                    Message = validationError
                });
            }

            if (dto.BusinessName is not null)
            {
                var normalized = NormalizeRequired(dto.BusinessName, 255);
                if (normalized is null)
                {
                    return BadRequest(new ApiResponse<MyProfileDto>
                    {
                        Success = false,
                        Message = "Business name cannot be empty"
                    });
                }

                fournisseur.BusinessName = normalized;
            }

            if (dto.TaxId is not null)
            {
                var normalizedTaxId = NormalizeRequired(dto.TaxId, 50);
                if (normalizedTaxId is null)
                {
                    return BadRequest(new ApiResponse<MyProfileDto>
                    {
                        Success = false,
                        Message = "Tax ID cannot be empty"
                    });
                }

                var taxInUse = await _context.Fournisseurs
                    .AnyAsync(f => f.Id != fournisseur.Id && f.TaxId == normalizedTaxId);

                if (taxInUse)
                {
                    return Conflict(new ApiResponse<MyProfileDto>
                    {
                        Success = false,
                        Message = "Tax ID already used by another fournisseur"
                    });
                }

                fournisseur.TaxId = normalizedTaxId;
            }

            if (dto.Address is not null)
            {
                fournisseur.Address = NormalizeValue(dto.Address, 500) ?? string.Empty;
            }

            if (dto.City is not null)
            {
                fournisseur.City = NormalizeValue(dto.City, 100) ?? string.Empty;
            }

            if (dto.RegistrationNumber is not null)
            {
                fournisseur.RegistrationNumber = NormalizeValue(dto.RegistrationNumber, 100);
            }

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<MyProfileDto>
            {
                Success = true,
                Message = "Profile updated",
                Data = MapProfile(fournisseur)
            });
        }

        return Forbid();
    }

    [HttpPost("me/avatar")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxAvatarUploadBytes)]
    public async Task<ActionResult<ApiResponse<MyProfileDto>>> UploadMyAvatar([FromForm] IFormFile? file, CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (file is null || file.Length <= 0)
        {
            return BadRequest(new ApiResponse<MyProfileDto>
            {
                Success = false,
                Message = "Fichier avatar manquant"
            });
        }

        if (file.Length > MaxAvatarUploadBytes)
        {
            return BadRequest(new ApiResponse<MyProfileDto>
            {
                Success = false,
                Message = "L'avatar depasse 5 MB"
            });
        }

        var extension = ResolveAvatarExtension(file);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedAvatarExtensions.Contains(extension))
        {
            return BadRequest(new ApiResponse<MyProfileDto>
            {
                Success = false,
                Message = $"Format non supporte ({file.ContentType}). Utilisez PNG, JPG, WEBP, BMP, JFIF, HEIC/HEIF ou AVIF"
            });
        }

        var now = DateTime.UtcNow;

        if (role == UserRole.Revendeur)
        {
            var revendeur = await _context.Revendeurs
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var oldAvatar = revendeur.User.Avatar;
            var relativePath = await SaveAvatarFileAsync(currentUserId, file, extension, cancellationToken);
            revendeur.User.Avatar = relativePath;
            revendeur.User.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await DeletePreviousAvatarIfChangedAsync(oldAvatar, relativePath, cancellationToken);

            return Ok(new ApiResponse<MyProfileDto>
            {
                Success = true,
                Message = "Avatar mis a jour",
                Data = MapProfile(revendeur)
            });
        }

        if (role == UserRole.Fournisseur)
        {
            var fournisseur = await _context.Fournisseurs
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.UserId == currentUserId);

            if (fournisseur is null)
            {
                return Forbid();
            }

            var oldAvatar = fournisseur.User.Avatar;
            var relativePath = await SaveAvatarFileAsync(currentUserId, file, extension, cancellationToken);
            fournisseur.User.Avatar = relativePath;
            fournisseur.User.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await DeletePreviousAvatarIfChangedAsync(oldAvatar, relativePath, cancellationToken);

            return Ok(new ApiResponse<MyProfileDto>
            {
                Success = true,
                Message = "Avatar mis a jour",
                Data = MapProfile(fournisseur)
            });
        }

        return Forbid();
    }

    [AllowAnonymous]
    [HttpGet("/Storage/Avatars/{**avatarPath}")]
    public async Task<IActionResult> GetAvatar(string avatarPath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(avatarPath))
        {
            return NotFound();
        }

        var normalizedPath = avatarPath
            .Replace('\\', '/')
            .Trim()
            .TrimStart('/');
        var storageKey = $"Storage/Avatars/{normalizedPath}";

        var stream = await _avatarStorage.OpenReadAsync(storageKey, cancellationToken);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "public, max-age=86400";
        return File(stream, ResolveAvatarContentType(storageKey));
    }

    private async Task<MyProfileDto?> GetProfileAsync(UserRole role, int currentUserId)
    {
        if (role == UserRole.Revendeur)
        {
            var revendeur = await _context.Revendeurs
                .AsNoTracking()
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            return revendeur is null ? null : MapProfile(revendeur);
        }

        if (role == UserRole.Fournisseur)
        {
            var fournisseur = await _context.Fournisseurs
                .AsNoTracking()
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.UserId == currentUserId);

            return fournisseur is null ? null : MapProfile(fournisseur);
        }

        return null;
    }

    private static string? ApplyCommonUpdates(UpdateMyProfileDto dto, User user, DateTime now)
    {
        if (dto.FullName is not null)
        {
            var normalized = NormalizeRequired(dto.FullName, 255);
            if (normalized is null)
            {
                return "Full name cannot be empty";
            }

            user.FullName = normalized;
        }

        if (dto.Phone is not null)
        {
            user.Phone = NormalizeValue(dto.Phone, 50);
        }

        if (dto.Avatar is not null)
        {
            user.Avatar = NormalizeValue(dto.Avatar, 500);
        }

        user.UpdatedAt = now;

        return null;
    }

    private async Task<string> SaveAvatarFileAsync(int userId, IFormFile file, string extension, CancellationToken cancellationToken)
    {
        var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var storageKey = Path.Combine("Storage", "Avatars", userId.ToString(), storedFileName)
            .Replace('\\', '/');

        await using var stream = file.OpenReadStream();
        await _avatarStorage.SaveAsync(storageKey, stream, file.ContentType, cancellationToken);
        return storageKey;
    }

    private async Task DeletePreviousAvatarIfChangedAsync(string? previousAvatarPath, string? currentAvatarPath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(previousAvatarPath))
        {
            return;
        }

        var previousNormalized = NormalizeStoragePath(previousAvatarPath);
        if (string.IsNullOrWhiteSpace(previousNormalized))
        {
            return;
        }

        var currentNormalized = NormalizeStoragePath(currentAvatarPath);
        if (string.Equals(previousNormalized, currentNormalized, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (!previousNormalized.StartsWith("Storage/Avatars/", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        await _avatarStorage.DeleteIfExistsAsync(previousNormalized, cancellationToken);
    }

    private static string NormalizeStoragePath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value
            .Replace('\\', '/')
            .Trim()
            .TrimStart('/');
    }

    private static string ResolveAvatarExtension(IFormFile file)
    {
        var fromName = Path.GetExtension(file.FileName);
        if (!string.IsNullOrWhiteSpace(fromName) && AllowedAvatarExtensions.Contains(fromName))
        {
            return fromName.ToLowerInvariant();
        }

        var fromContentType = (file.ContentType ?? string.Empty).ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/jpg" => ".jpg",
            "image/jpeg" => ".jpeg",
            "image/webp" => ".webp",
            "image/bmp" => ".bmp",
            "image/jfif" => ".jfif",
            "image/heic" => ".heic",
            "image/heif" => ".heif",
            "image/avif" => ".avif",
            _ => string.Empty
        };

        if (!string.IsNullOrWhiteSpace(fromContentType))
        {
            return fromContentType;
        }

        var sniffed = TryDetectAvatarExtensionFromSignature(file);
        if (!string.IsNullOrWhiteSpace(sniffed))
        {
            return sniffed;
        }

        return string.IsNullOrWhiteSpace(fromName) ? string.Empty : fromName.ToLowerInvariant();
    }

    private static string TryDetectAvatarExtensionFromSignature(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            var buffer = new byte[32];
            var read = stream.Read(buffer, 0, buffer.Length);
            if (read < 4)
            {
                return string.Empty;
            }

            if (read >= 3 && buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF)
            {
                return ".jpeg";
            }

            if (read >= 8 && buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47
                && buffer[4] == 0x0D && buffer[5] == 0x0A && buffer[6] == 0x1A && buffer[7] == 0x0A)
            {
                return ".png";
            }

            if (read >= 2 && buffer[0] == 0x42 && buffer[1] == 0x4D)
            {
                return ".bmp";
            }

            if (read >= 12
                && buffer[0] == 0x52 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x46
                && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50)
            {
                return ".webp";
            }

            if (read >= 12
                && buffer[4] == 0x66 && buffer[5] == 0x74 && buffer[6] == 0x79 && buffer[7] == 0x70)
            {
                var brand = new string(new[] { (char)buffer[8], (char)buffer[9], (char)buffer[10], (char)buffer[11] }).ToLowerInvariant();
                if (brand is "heic" or "heix" or "hevc" or "hevx")
                {
                    return ".heic";
                }

                if (brand is "mif1" or "msf1")
                {
                    return ".heif";
                }

                if (brand is "avif" or "avis")
                {
                    return ".avif";
                }
            }
        }
        catch
        {
        }

        return string.Empty;
    }

    private static string ResolveAvatarContentType(string storageKey)
    {
        var extension = Path.GetExtension(storageKey).ToLowerInvariant();
        return extension switch
        {
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".jfif" => "image/jpeg",
            ".heic" => "image/heic",
            ".heif" => "image/heif",
            ".avif" => "image/avif",
            _ => "application/octet-stream"
        };
    }

    private static MyProfileDto MapProfile(Revendeur revendeur)
    {
        return new MyProfileDto
        {
            UserId = revendeur.UserId,
            ProfileId = revendeur.Id,
            Role = UserRole.Revendeur,
            FullName = revendeur.User.FullName,
            Email = revendeur.User.Email,
            Phone = revendeur.User.Phone,
            Avatar = revendeur.User.Avatar,
            BusinessName = revendeur.BusinessName,
            TaxId = revendeur.TaxId,
            Address = revendeur.Address,
            City = revendeur.City,
            PostalCode = revendeur.PostalCode,
            RegistrationNumber = revendeur.RegistrationNumber,
            CreatedAt = revendeur.CreatedAt
        };
    }

    private static MyProfileDto MapProfile(Fournisseur fournisseur)
    {
        return new MyProfileDto
        {
            UserId = fournisseur.UserId,
            ProfileId = fournisseur.Id,
            Role = UserRole.Fournisseur,
            FullName = fournisseur.User.FullName,
            Email = fournisseur.User.Email,
            Phone = fournisseur.User.Phone,
            Avatar = fournisseur.User.Avatar,
            BusinessName = fournisseur.BusinessName,
            TaxId = fournisseur.TaxId,
            Address = fournisseur.Address,
            City = fournisseur.City,
            PostalCode = null,
            RegistrationNumber = fournisseur.RegistrationNumber,
            CreatedAt = fournisseur.CreatedAt
        };
    }

    private static string? NormalizeRequired(string value, int maxLength)
    {
        var trimmed = value.Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string? NormalizeValue(string value, int maxLength)
    {
        var trimmed = value.Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private bool TryGetCurrentUser(out int currentUserId, out UserRole role)
    {
        currentUserId = 0;
        role = default;

        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);

        return int.TryParse(idClaim, out currentUserId)
            && Enum.TryParse(roleClaim, ignoreCase: true, out role)
            && role is UserRole.Revendeur or UserRole.Fournisseur;
    }
}
