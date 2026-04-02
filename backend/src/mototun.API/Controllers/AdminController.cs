using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Security.Claims;
using System.Text;

namespace mototun.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<ApiResponse<AdminOverviewDto>>> GetOverview()
    {
        var users = await _context.Users.AsNoTracking().ToListAsync();

        var totalInvoices = await _context.Invoices.AsNoTracking().CountAsync();
        var openCarteGriseDossiers = await _context.Invoices.AsNoTracking()
            .CountAsync(i => i.CarteGriseStatus == CarteGriseStatus.PendingDocuments
                || i.CarteGriseStatus == CarteGriseStatus.DocumentsReceived
                || i.CarteGriseStatus == CarteGriseStatus.InProgress
                || i.CarteGriseStatus == CarteGriseStatus.DepotAntt);

        var overview = new AdminOverviewDto
        {
            TotalUsers = users.Count,
            ActiveUsers = users.Count(u => u.Status == UserStatus.Active),
            SuspendedUsers = users.Count(u => u.Status == UserStatus.Suspended),
            RevendeurUsers = users.Count(u => u.Role == UserRole.Revendeur),
            FournisseurUsers = users.Count(u => u.Role == UserRole.Fournisseur),
            AdminUsers = users.Count(u => u.Role == UserRole.Admin),
            UsersCannotLogin = users.Count(u => !u.CanLogin),
            TotalInvoices = totalInvoices,
            OpenCarteGriseDossiers = openCarteGriseDossiers
        };

        return Ok(new ApiResponse<AdminOverviewDto>
        {
            Success = true,
            Message = "Admin overview loaded",
            Data = overview
        });
    }

    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<List<AdminUserDto>>>> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] UserRole? role = null,
        [FromQuery] UserStatus? status = null,
        [FromQuery] bool? canLogin = null)
    {
        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.RevendeurProfile)
            .Include(u => u.FournisseurProfile)
            .AsQueryable();

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(u => u.Status == status.Value);
        }

        if (canLogin.HasValue)
        {
            query = query.Where(u => u.CanLogin == canLogin.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.Like(u.FullName, pattern)
                || EF.Functions.Like(u.Email, pattern)
                || (u.Phone != null && EF.Functions.Like(u.Phone, pattern))
                || (u.RevendeurProfile != null && EF.Functions.Like(u.RevendeurProfile.BusinessName, pattern))
                || (u.FournisseurProfile != null && EF.Functions.Like(u.FournisseurProfile.BusinessName, pattern)));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return Ok(new ApiResponse<List<AdminUserDto>>
        {
            Success = true,
            Message = "Admin users loaded",
            Data = users.Select(MapAdminUserDto).ToList()
        });
    }

    [HttpPatch("users/{userId:int}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> UpdateUser(int userId, [FromBody] AdminUserUpdateDto dto)
    {
        if (dto is null || (!dto.Status.HasValue && !dto.CanLogin.HasValue))
        {
            return BadRequest(new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "Status or CanLogin must be provided"
            });
        }

        if (dto.Status.HasValue && !Enum.IsDefined(typeof(UserStatus), dto.Status.Value))
        {
            return BadRequest(new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "Invalid status value"
            });
        }

        var user = await _context.Users
            .Include(u => u.RevendeurProfile)
            .Include(u => u.FournisseurProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return NotFound(new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "User not found"
            });
        }

        var nextStatus = dto.Status ?? user.Status;
        var nextCanLogin = dto.CanLogin ?? user.CanLogin;
        if (user.Role == UserRole.Admin && (nextStatus != UserStatus.Active || !nextCanLogin))
        {
            if (TryGetCurrentAdminUserId(out var currentAdminUserId) && currentAdminUserId == user.Id)
            {
                return BadRequest(new ApiResponse<AdminUserDto>
                {
                    Success = false,
                    Message = "You cannot remove your own admin access."
                });
            }

            var otherActiveAdminExists = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id != user.Id
                    && u.Role == UserRole.Admin
                    && u.Status == UserStatus.Active
                    && u.CanLogin);

            if (!otherActiveAdminExists)
            {
                return BadRequest(new ApiResponse<AdminUserDto>
                {
                    Success = false,
                    Message = "At least one active admin with login access must remain."
                });
            }
        }

        if (dto.Status.HasValue)
        {
            user.Status = dto.Status.Value;
        }

        if (dto.CanLogin.HasValue)
        {
            user.CanLogin = dto.CanLogin.Value;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<AdminUserDto>
        {
            Success = true,
            Message = "User updated",
            Data = MapAdminUserDto(user)
        });
    }

    [HttpGet("audit")]
    public async Task<ActionResult<ApiResponse<AdminAuditResponseDto>>> GetAudit(
        [FromQuery] int? userId = null,
        [FromQuery] UserRole? actorRole = null,
        [FromQuery] InvoiceTimelineEventType? action = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? invoiceId = null,
        [FromQuery] string? search = null,
        [FromQuery] int take = 200)
    {
        take = Math.Clamp(take, 1, 1000);
        var fromUtc = NormalizeFilterDate(from);
        var toExclusiveUtc = NormalizeExclusiveFilterDate(to);

        var baseQuery = BuildAuditQuery(userId, actorRole, action, fromUtc, toExclusiveUtc, invoiceId, search);
        var totalEvents = await baseQuery.CountAsync();
        var firstEventAt = await baseQuery
            .OrderBy(e => e.CreatedAt)
            .Select(e => (DateTime?)e.CreatedAt)
            .FirstOrDefaultAsync();
        var lastEventAt = await baseQuery
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => (DateTime?)e.CreatedAt)
            .FirstOrDefaultAsync();
        var distinctInvoices = await baseQuery
            .Select(e => e.InvoiceId)
            .Distinct()
            .CountAsync();
        var distinctActors = await baseQuery
            .Where(e => e.ActorUserId.HasValue)
            .Select(e => e.ActorUserId!.Value)
            .Distinct()
            .CountAsync();

        var events = await baseQuery
            .OrderByDescending(e => e.CreatedAt)
            .ThenByDescending(e => e.Id)
            .Take(take)
            .ToListAsync();

        var usersById = await LoadUsersByIdAsync(events);
        var items = events
            .Select(e => MapAuditItemDto(e, usersById))
            .ToList();

        return Ok(new ApiResponse<AdminAuditResponseDto>
        {
            Success = true,
            Message = "Audit loaded",
            Data = new AdminAuditResponseDto
            {
                Items = items,
                Summary = new AdminAuditSummaryDto
                {
                    TotalEvents = totalEvents,
                    ReturnedEvents = items.Count,
                    DistinctInvoices = distinctInvoices,
                    DistinctActors = distinctActors,
                    FirstEventAt = firstEventAt,
                    LastEventAt = lastEventAt
                }
            }
        });
    }

    [HttpGet("audit/export")]
    public async Task<IActionResult> ExportAudit(
        [FromQuery] int? userId = null,
        [FromQuery] UserRole? actorRole = null,
        [FromQuery] InvoiceTimelineEventType? action = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? invoiceId = null,
        [FromQuery] string? search = null,
        [FromQuery] int take = 5000)
    {
        take = Math.Clamp(take, 1, 10000);
        var fromUtc = NormalizeFilterDate(from);
        var toExclusiveUtc = NormalizeExclusiveFilterDate(to);

        var events = await BuildAuditQuery(userId, actorRole, action, fromUtc, toExclusiveUtc, invoiceId, search)
            .OrderByDescending(e => e.CreatedAt)
            .ThenByDescending(e => e.Id)
            .Take(take)
            .ToListAsync();

        var usersById = await LoadUsersByIdAsync(events);
        var rows = events
            .Select(e => MapAuditItemDto(e, usersById))
            .Select(item => new[]
            {
                item.EventId.ToString(),
                item.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                item.EventType.ToString(),
                item.Title,
                item.Message,
                item.ActorUserId?.ToString() ?? string.Empty,
                item.ActorRole?.ToString() ?? string.Empty,
                item.ActorFullName ?? string.Empty,
                item.ActorEmail ?? string.Empty,
                item.InvoiceId.ToString(),
                item.InvoiceNumber,
                item.ClientName ?? string.Empty,
                item.RevendeurBusinessName ?? string.Empty,
                item.FournisseurBusinessName ?? string.Empty
            })
            .ToList();

        var builder = new StringBuilder();
        builder.AppendLine("EventId,CreatedAtUtc,Action,Title,Message,ActorUserId,ActorRole,ActorFullName,ActorEmail,InvoiceId,InvoiceNumber,Client,Revendeur,Fournisseur");
        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(",", row.Select(EscapeCsv)));
        }

        var bytes = Encoding.UTF8.GetBytes("\uFEFF" + builder);
        var fileName = $"admin-audit-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private bool TryGetCurrentAdminUserId(out int userId)
    {
        userId = 0;
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out userId);
    }

    private IQueryable<InvoiceTimelineEvent> BuildAuditQuery(
        int? userId,
        UserRole? actorRole,
        InvoiceTimelineEventType? action,
        DateTime? fromUtc,
        DateTime? toExclusiveUtc,
        int? invoiceId,
        string? search)
    {
        var query = _context.InvoiceTimelineEvents
            .AsNoTracking()
            .Include(e => e.Invoice)
                .ThenInclude(i => i.Client)
            .Include(e => e.Invoice)
                .ThenInclude(i => i.Revendeur)
            .Include(e => e.Invoice)
                .ThenInclude(i => i.AssignedFournisseur)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(e => e.ActorUserId == userId.Value);
        }

        if (actorRole.HasValue)
        {
            query = query.Where(e => e.ActorRole == actorRole.Value);
        }

        if (action.HasValue)
        {
            query = query.Where(e => e.EventType == action.Value);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(e => e.CreatedAt >= fromUtc.Value);
        }

        if (toExclusiveUtc.HasValue)
        {
            query = query.Where(e => e.CreatedAt < toExclusiveUtc.Value);
        }

        if (invoiceId.HasValue)
        {
            query = query.Where(e => e.InvoiceId == invoiceId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e =>
                EF.Functions.Like(e.Title, pattern)
                || EF.Functions.Like(e.Message, pattern)
                || EF.Functions.Like(e.Invoice.InvoiceNumber, pattern)
                || (e.Invoice.Client != null && EF.Functions.Like(e.Invoice.Client.FullName, pattern))
                || (e.Invoice.Revendeur != null && EF.Functions.Like(e.Invoice.Revendeur.BusinessName, pattern))
                || (e.Invoice.AssignedFournisseur != null && EF.Functions.Like(e.Invoice.AssignedFournisseur.BusinessName, pattern)));
        }

        return query;
    }

    private async Task<Dictionary<int, User>> LoadUsersByIdAsync(IEnumerable<InvoiceTimelineEvent> events)
    {
        var actorIds = events
            .Where(e => e.ActorUserId.HasValue)
            .Select(e => e.ActorUserId!.Value)
            .Distinct()
            .ToList();

        if (actorIds.Count == 0)
        {
            return new Dictionary<int, User>();
        }

        return await _context.Users
            .AsNoTracking()
            .Where(u => actorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);
    }

    private static AdminAuditItemDto MapAuditItemDto(InvoiceTimelineEvent timelineEvent, IReadOnlyDictionary<int, User> usersById)
    {
        usersById.TryGetValue(timelineEvent.ActorUserId ?? 0, out var actor);

        return new AdminAuditItemDto
        {
            EventId = timelineEvent.Id,
            InvoiceId = timelineEvent.InvoiceId,
            InvoiceNumber = timelineEvent.Invoice?.InvoiceNumber ?? timelineEvent.InvoiceId.ToString(),
            ClientName = timelineEvent.Invoice?.Client?.FullName,
            RevendeurBusinessName = timelineEvent.Invoice?.Revendeur?.BusinessName,
            FournisseurBusinessName = timelineEvent.Invoice?.AssignedFournisseur?.BusinessName,
            EventType = timelineEvent.EventType,
            Title = timelineEvent.Title,
            Message = timelineEvent.Message,
            CreatedAt = timelineEvent.CreatedAt,
            ActorUserId = timelineEvent.ActorUserId,
            ActorRole = timelineEvent.ActorRole,
            ActorFullName = actor?.FullName,
            ActorEmail = actor?.Email
        };
    }

    private static DateTime? NormalizeFilterDate(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        var date = value.Value;
        if (date.Kind == DateTimeKind.Utc)
        {
            return date;
        }

        if (date.Kind == DateTimeKind.Local)
        {
            return date.ToUniversalTime();
        }

        return DateTime.SpecifyKind(date, DateTimeKind.Utc);
    }

    private static DateTime? NormalizeExclusiveFilterDate(DateTime? value)
    {
        var normalized = NormalizeFilterDate(value);
        if (!normalized.HasValue)
        {
            return null;
        }

        return normalized.Value.TimeOfDay == TimeSpan.Zero
            ? normalized.Value.AddDays(1)
            : normalized.Value;
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var escaped = value.Replace("\"", "\"\"");
        return escaped.IndexOfAny(new[] { ',', '"', '\n', '\r' }) >= 0
            ? $"\"{escaped}\""
            : escaped;
    }

    private static AdminUserDto MapAdminUserDto(User user)
    {
        return new AdminUserDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            Status = user.Status,
            CanLogin = user.CanLogin,
            BusinessName = user.Role switch
            {
                UserRole.Revendeur => user.RevendeurProfile?.BusinessName,
                UserRole.Fournisseur => user.FournisseurProfile?.BusinessName,
                _ => null
            },
            City = user.Role switch
            {
                UserRole.Revendeur => user.RevendeurProfile?.City,
                UserRole.Fournisseur => user.FournisseurProfile?.City,
                _ => null
            },
            TaxId = user.Role switch
            {
                UserRole.Revendeur => user.RevendeurProfile?.TaxId,
                UserRole.Fournisseur => user.FournisseurProfile?.TaxId,
                _ => null
            },
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }
}
