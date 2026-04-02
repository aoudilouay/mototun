using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers;

[Authorize(Roles = "Revendeur,Fournisseur")]
[ApiController]
[Route("api/partnership-requests")]
public class PartnershipRequestsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PartnershipRequestsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PartnershipRequestDto>>> CreateRequest([FromBody] CreatePartnershipRequestDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var revendeurId = role == UserRole.Revendeur ? actorProfileId.Value : (dto.RevendeurId ?? 0);
        var fournisseurId = role == UserRole.Fournisseur ? actorProfileId.Value : (dto.FournisseurId ?? 0);

        if (revendeurId <= 0 || fournisseurId <= 0)
        {
            return BadRequest(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "RevendeurId and FournisseurId are required"
            });
        }

        var revendeurExists = await _context.Revendeurs
            .AsNoTracking()
            .AnyAsync(r => r.Id == revendeurId);

        if (!revendeurExists)
        {
            return BadRequest(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Revendeur not found"
            });
        }

        var fournisseurExists = await _context.Fournisseurs
            .AsNoTracking()
            .AnyAsync(f => f.Id == fournisseurId);

        if (!fournisseurExists)
        {
            return BadRequest(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Fournisseur not found"
            });
        }

        var now = DateTime.UtcNow;
        var existing = await IncludeProfiles(_context.RevendeurFournisseurConnections)
            .FirstOrDefaultAsync(c => c.RevendeurId == revendeurId && c.FournisseurId == fournisseurId);

        if (existing is not null)
        {
            if (existing.Status == PartnershipRequestStatus.Accepted)
            {
                return Conflict(new ApiResponse<PartnershipRequestDto>
                {
                    Success = false,
                    Message = "Connection already accepted",
                    Data = MapDto(existing)
                });
            }

            if (existing.Status == PartnershipRequestStatus.Pending)
            {
                var message = existing.RequestedByRole == role
                    ? "A pending request already exists"
                    : "A pending request exists from the other side. Use accept/reject.";

                return Conflict(new ApiResponse<PartnershipRequestDto>
                {
                    Success = false,
                    Message = message,
                    Data = MapDto(existing)
                });
            }

            if (existing.Status == PartnershipRequestStatus.Blocked && existing.RequestedByRole != role)
            {
                return Conflict(new ApiResponse<PartnershipRequestDto>
                {
                    Success = false,
                    Message = "You are blocked by this partner and cannot send a request",
                    Data = MapDto(existing)
                });
            }

            var previousStatus = existing.Status;
            existing.Status = PartnershipRequestStatus.Pending;
            existing.RequestedByRole = role;
            existing.RequestedByUserId = currentUserId;
            existing.RejectReason = null;
            existing.RespondedAt = null;
            existing.UpdatedAt = now;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<PartnershipRequestDto>
            {
                Success = true,
                Message = previousStatus == PartnershipRequestStatus.Blocked
                    ? "Partner unblocked and request re-opened"
                    : "Partnership request re-opened",
                Data = MapDto(existing)
            });
        }

        var entity = new RevendeurFournisseurConnection
        {
            RevendeurId = revendeurId,
            FournisseurId = fournisseurId,
            Status = PartnershipRequestStatus.Pending,
            RequestedByRole = role,
            RequestedByUserId = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.RevendeurFournisseurConnections.Add(entity);
        await _context.SaveChangesAsync();

        var created = await IncludeProfiles(_context.RevendeurFournisseurConnections)
            .AsNoTracking()
            .FirstAsync(c => c.Id == entity.Id);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new ApiResponse<PartnershipRequestDto>
        {
            Success = true,
            Message = "Partnership request created",
            Data = MapDto(created)
        });
    }

    [HttpGet("sent")]
    public async Task<ActionResult<ApiResponse<List<PartnershipRequestDto>>>> GetSentRequests()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var requests = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .AsNoTracking()
            .Where(c => c.RequestedByRole == role)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        return Ok(new ApiResponse<List<PartnershipRequestDto>>
        {
            Success = true,
            Message = "Sent requests loaded",
            Data = requests.Select(MapDto).ToList()
        });
    }

    [HttpGet("directory/fournisseurs")]
    public async Task<ActionResult<ApiResponse<List<PartnershipDirectoryItemDto>>>> GetFournisseurDirectory()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetActorProfileIdAsync(role, currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var blockedByFournisseurs = (await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c =>
                c.RevendeurId == revendeurId.Value
                && c.Status == PartnershipRequestStatus.Blocked
                && c.RequestedByRole == UserRole.Fournisseur)
            .Select(c => c.FournisseurId)
            .ToListAsync())
            .ToHashSet();

        var connections = await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c =>
                c.RevendeurId == revendeurId.Value
                && (c.Status != PartnershipRequestStatus.Blocked || c.RequestedByRole == UserRole.Revendeur))
            .ToListAsync();

        var connectionByFournisseurId = connections
            .GroupBy(c => c.FournisseurId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(item => item.UpdatedAt).First());

        var fournisseurs = await _context.Fournisseurs
            .AsNoTracking()
            .Include(f => f.User)
            .OrderBy(f => f.BusinessName)
            .ToListAsync();

        var result = fournisseurs
            .Where(f => !blockedByFournisseurs.Contains(f.Id))
            .Select(f =>
            {
                connectionByFournisseurId.TryGetValue(f.Id, out var connection);
                return MapDirectoryItem(f, connection);
            })
            .ToList();

        return Ok(new ApiResponse<List<PartnershipDirectoryItemDto>>
        {
            Success = true,
            Message = "Fournisseur directory loaded",
            Data = result
        });
    }

    [HttpGet("directory/revendeurs")]
    public async Task<ActionResult<ApiResponse<List<PartnershipDirectoryItemDto>>>> GetRevendeurDirectory()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Fournisseur)
        {
            return Forbid();
        }

        var fournisseurId = await GetActorProfileIdAsync(role, currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var blockedByRevendeurs = (await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c =>
                c.FournisseurId == fournisseurId.Value
                && c.Status == PartnershipRequestStatus.Blocked
                && c.RequestedByRole == UserRole.Revendeur)
            .Select(c => c.RevendeurId)
            .ToListAsync())
            .ToHashSet();

        var connections = await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c =>
                c.FournisseurId == fournisseurId.Value
                && (c.Status != PartnershipRequestStatus.Blocked || c.RequestedByRole == UserRole.Fournisseur))
            .ToListAsync();

        var connectionByRevendeurId = connections
            .GroupBy(c => c.RevendeurId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(item => item.UpdatedAt).First());

        var revendeurs = await _context.Revendeurs
            .AsNoTracking()
            .Include(r => r.User)
            .OrderBy(r => r.BusinessName)
            .ToListAsync();

        var result = revendeurs
            .Where(r => !blockedByRevendeurs.Contains(r.Id))
            .Select(r =>
            {
                connectionByRevendeurId.TryGetValue(r.Id, out var connection);
                return MapDirectoryItem(r, connection);
            })
            .ToList();

        return Ok(new ApiResponse<List<PartnershipDirectoryItemDto>>
        {
            Success = true,
            Message = "Revendeur directory loaded",
            Data = result
        });
    }

    [HttpGet("received")]
    public async Task<ActionResult<ApiResponse<List<PartnershipRequestDto>>>> GetReceivedRequests()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var requests = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .AsNoTracking()
            .Where(c => c.RequestedByRole != role)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        return Ok(new ApiResponse<List<PartnershipRequestDto>>
        {
            Success = true,
            Message = "Received requests loaded",
            Data = requests.Select(MapDto).ToList()
        });
    }

    [HttpGet("connections")]
    public async Task<ActionResult<ApiResponse<List<PartnershipRequestDto>>>> GetAcceptedConnections()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var connections = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .AsNoTracking()
            .Where(c => c.Status == PartnershipRequestStatus.Accepted)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        return Ok(new ApiResponse<List<PartnershipRequestDto>>
        {
            Success = true,
            Message = "Accepted connections loaded",
            Data = connections.Select(MapDto).ToList()
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PartnershipRequestDto>>> GetById(int id)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var request = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (request is null)
        {
            return NotFound(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Request not found"
            });
        }

        return Ok(new ApiResponse<PartnershipRequestDto>
        {
            Success = true,
            Message = "Request loaded",
            Data = MapDto(request)
        });
    }

    [HttpPost("{id:int}/accept")]
    public async Task<ActionResult<ApiResponse<PartnershipRequestDto>>> AcceptRequest(int id)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var request = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (request is null)
        {
            return NotFound(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Request not found"
            });
        }

        if (request.Status != PartnershipRequestStatus.Pending)
        {
            return BadRequest(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Only pending requests can be accepted",
                Data = MapDto(request)
            });
        }

        if (!IsReceiver(request, role))
        {
            return Forbid();
        }

        request.Status = PartnershipRequestStatus.Accepted;
        request.RejectReason = null;
        request.RespondedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<PartnershipRequestDto>
        {
            Success = true,
            Message = "Request accepted",
            Data = MapDto(request)
        });
    }

    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<ApiResponse<PartnershipRequestDto>>> RejectRequest(int id, [FromBody] RejectPartnershipRequestDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var request = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (request is null)
        {
            return NotFound(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Request not found"
            });
        }

        if (request.Status != PartnershipRequestStatus.Pending)
        {
            return BadRequest(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Only pending requests can be rejected",
                Data = MapDto(request)
            });
        }

        if (!IsReceiver(request, role))
        {
            return Forbid();
        }

        request.Status = PartnershipRequestStatus.Rejected;
        request.RejectReason = NormalizeReason(dto.Reason);
        request.RespondedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<PartnershipRequestDto>
        {
            Success = true,
            Message = "Request rejected",
            Data = MapDto(request)
        });
    }

    [HttpPost("{id:int}/block")]
    public async Task<ActionResult<ApiResponse<PartnershipRequestDto>>> BlockConnection(int id, [FromBody] BlockPartnershipRequestDto? dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var request = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (request is null)
        {
            return NotFound(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Request not found"
            });
        }

        if (request.Status == PartnershipRequestStatus.Blocked && request.RequestedByRole == role)
        {
            return Ok(new ApiResponse<PartnershipRequestDto>
            {
                Success = true,
                Message = "Connection already blocked",
                Data = MapDto(request)
            });
        }

        request.Status = PartnershipRequestStatus.Blocked;
        request.RequestedByRole = role;
        request.RequestedByUserId = currentUserId;
        request.RejectReason = NormalizeReason(dto?.Reason);
        request.RespondedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<PartnershipRequestDto>
        {
            Success = true,
            Message = "Connection blocked",
            Data = MapDto(request)
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<PartnershipRequestDto>>> RemoveConnection(int id)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var actorProfileId = await GetActorProfileIdAsync(role, currentUserId);
        if (!actorProfileId.HasValue)
        {
            return Forbid();
        }

        var request = await IncludeProfiles(BuildScopedQuery(role, actorProfileId.Value))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (request is null)
        {
            return NotFound(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Request not found"
            });
        }

        if (request.Status == PartnershipRequestStatus.Pending && IsReceiver(request, role))
        {
            return BadRequest(new ApiResponse<PartnershipRequestDto>
            {
                Success = false,
                Message = "Use accept/reject for incoming pending requests",
                Data = MapDto(request)
            });
        }

        _context.RevendeurFournisseurConnections.Remove(request);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<PartnershipRequestDto>
        {
            Success = true,
            Message = "Connection removed",
            Data = MapDto(request)
        });
    }

    private IQueryable<RevendeurFournisseurConnection> BuildScopedQuery(UserRole role, int actorProfileId)
    {
        return role switch
        {
            UserRole.Revendeur => _context.RevendeurFournisseurConnections
                .Where(c =>
                    c.RevendeurId == actorProfileId
                    && (c.Status != PartnershipRequestStatus.Blocked || c.RequestedByRole == UserRole.Revendeur)),
            UserRole.Fournisseur => _context.RevendeurFournisseurConnections
                .Where(c =>
                    c.FournisseurId == actorProfileId
                    && (c.Status != PartnershipRequestStatus.Blocked || c.RequestedByRole == UserRole.Fournisseur)),
            _ => _context.RevendeurFournisseurConnections.Where(_ => false)
        };
    }

    private static IQueryable<RevendeurFournisseurConnection> IncludeProfiles(IQueryable<RevendeurFournisseurConnection> query)
    {
        return query
            .Include(c => c.Revendeur)
                .ThenInclude(r => r.User)
            .Include(c => c.Fournisseur)
                .ThenInclude(f => f.User);
    }

    private async Task<int?> GetActorProfileIdAsync(UserRole role, int userId)
    {
        return role switch
        {
            UserRole.Revendeur => await _context.Revendeurs
                .Where(r => r.UserId == userId)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(),
            UserRole.Fournisseur => await _context.Fournisseurs
                .Where(f => f.UserId == userId)
                .Select(f => (int?)f.Id)
                .FirstOrDefaultAsync(),
            _ => null
        };
    }

    private static PartnershipRequestDto MapDto(RevendeurFournisseurConnection request)
    {
        return new PartnershipRequestDto
        {
            RequestId = request.Id,
            RevendeurId = request.RevendeurId,
            RevendeurBusinessName = request.Revendeur.BusinessName,
            RevendeurProfile = MapPublicProfile(request.Revendeur),
            FournisseurId = request.FournisseurId,
            FournisseurBusinessName = request.Fournisseur.BusinessName,
            FournisseurProfile = MapPublicProfile(request.Fournisseur),
            Status = request.Status,
            BlockedByRole = request.Status == PartnershipRequestStatus.Blocked ? request.RequestedByRole : null,
            RequestedByRole = request.RequestedByRole,
            RequestedByUserId = request.RequestedByUserId,
            RejectReason = request.RejectReason,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
            RespondedAt = request.RespondedAt
        };
    }

    private static PartnershipDirectoryItemDto MapDirectoryItem(Fournisseur fournisseur, RevendeurFournisseurConnection? connection)
    {
        return new PartnershipDirectoryItemDto
        {
            ProfileId = fournisseur.Id,
            UserId = fournisseur.UserId,
            ProfileRole = UserRole.Fournisseur,
            FullName = fournisseur.User.FullName,
            Avatar = fournisseur.User.Avatar,
            BusinessName = fournisseur.BusinessName,
            Address = fournisseur.Address,
            City = fournisseur.City,
            PostalCode = null,
            TaxId = fournisseur.TaxId,
            RegistrationNumber = fournisseur.RegistrationNumber,
            Email = fournisseur.User.Email,
            Phone = fournisseur.User.Phone,
            RequestId = connection?.Id,
            Status = connection?.Status,
            BlockedByRole = connection?.Status == PartnershipRequestStatus.Blocked ? connection.RequestedByRole : null,
            RequestedByRole = connection?.RequestedByRole,
            RejectReason = connection?.RejectReason,
            UpdatedAt = connection?.UpdatedAt
        };
    }

    private static PartnershipDirectoryItemDto MapDirectoryItem(Revendeur revendeur, RevendeurFournisseurConnection? connection)
    {
        return new PartnershipDirectoryItemDto
        {
            ProfileId = revendeur.Id,
            UserId = revendeur.UserId,
            ProfileRole = UserRole.Revendeur,
            FullName = revendeur.User.FullName,
            Avatar = revendeur.User.Avatar,
            BusinessName = revendeur.BusinessName,
            Address = revendeur.Address,
            City = revendeur.City,
            PostalCode = revendeur.PostalCode,
            TaxId = revendeur.TaxId,
            RegistrationNumber = revendeur.RegistrationNumber,
            Email = revendeur.User.Email,
            Phone = revendeur.User.Phone,
            RequestId = connection?.Id,
            Status = connection?.Status,
            BlockedByRole = connection?.Status == PartnershipRequestStatus.Blocked ? connection.RequestedByRole : null,
            RequestedByRole = connection?.RequestedByRole,
            RejectReason = connection?.RejectReason,
            UpdatedAt = connection?.UpdatedAt
        };
    }

    private static PartnershipPublicProfileDto MapPublicProfile(Revendeur revendeur)
    {
        return new PartnershipPublicProfileDto
        {
            ProfileId = revendeur.Id,
            UserId = revendeur.UserId,
            Role = UserRole.Revendeur,
            FullName = revendeur.User.FullName,
            Avatar = revendeur.User.Avatar,
            BusinessName = revendeur.BusinessName,
            Address = revendeur.Address,
            City = revendeur.City,
            PostalCode = revendeur.PostalCode,
            TaxId = revendeur.TaxId,
            RegistrationNumber = revendeur.RegistrationNumber,
            Email = revendeur.User.Email,
            Phone = revendeur.User.Phone
        };
    }

    private static PartnershipPublicProfileDto MapPublicProfile(Fournisseur fournisseur)
    {
        return new PartnershipPublicProfileDto
        {
            ProfileId = fournisseur.Id,
            UserId = fournisseur.UserId,
            Role = UserRole.Fournisseur,
            FullName = fournisseur.User.FullName,
            Avatar = fournisseur.User.Avatar,
            BusinessName = fournisseur.BusinessName,
            Address = fournisseur.Address,
            City = fournisseur.City,
            PostalCode = null,
            TaxId = fournisseur.TaxId,
            RegistrationNumber = fournisseur.RegistrationNumber,
            Email = fournisseur.User.Email,
            Phone = fournisseur.User.Phone
        };
    }

    private static bool IsReceiver(RevendeurFournisseurConnection request, UserRole currentRole)
    {
        return currentRole switch
        {
            UserRole.Revendeur => request.RequestedByRole == UserRole.Fournisseur,
            UserRole.Fournisseur => request.RequestedByRole == UserRole.Revendeur,
            _ => false
        };
    }

    private static string? NormalizeReason(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= 1000 ? trimmed : trimmed[..1000];
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
