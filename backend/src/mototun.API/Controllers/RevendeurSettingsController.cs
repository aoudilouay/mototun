using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.API.Services.Settings;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;

namespace mototun.API.Controllers;

[ApiController]
[Route("api/revendeur-settings")]
public class RevendeurSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RevendeurSettingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [Authorize(Roles = "Revendeur")]
    [HttpGet("me/sla")]
    public async Task<ActionResult<ApiResponse<RevendeurSlaSettingsDto>>> GetMySlaSettings(CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId, cancellationToken);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var settings = await _context.RevendeurSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RevendeurId == revendeurId.Value, cancellationToken);
        var effective = RevendeurSettingsPolicy.BuildEffective(settings);

        return Ok(new ApiResponse<RevendeurSlaSettingsDto>
        {
            Success = true,
            Message = "SLA settings loaded",
            Data = MapSlaDto(effective)
        });
    }

    [Authorize(Roles = "Revendeur")]
    [HttpPut("me/sla")]
    public async Task<ActionResult<ApiResponse<RevendeurSlaSettingsDto>>> UpdateMySlaSettings(
        [FromBody] UpdateRevendeurSlaSettingsDto dto,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId, cancellationToken);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        if (dto.WarningAfterHours < 1 || dto.WarningAfterHours > 720)
        {
            return BadRequest(new ApiResponse<RevendeurSlaSettingsDto>
            {
                Success = false,
                Message = "WarningAfterHours must be between 1 and 720."
            });
        }

        if (dto.StuckAfterHours < dto.WarningAfterHours || dto.StuckAfterHours > 720)
        {
            return BadRequest(new ApiResponse<RevendeurSlaSettingsDto>
            {
                Success = false,
                Message = "StuckAfterHours must be >= WarningAfterHours and <= 720."
            });
        }

        if (dto.EscalationAfterHours < dto.StuckAfterHours || dto.EscalationAfterHours > 720)
        {
            return BadRequest(new ApiResponse<RevendeurSlaSettingsDto>
            {
                Success = false,
                Message = "EscalationAfterHours must be >= StuckAfterHours and <= 720."
            });
        }

        if (dto.RepeatEveryHours < 1 || dto.RepeatEveryHours > 720)
        {
            return BadRequest(new ApiResponse<RevendeurSlaSettingsDto>
            {
                Success = false,
                Message = "RepeatEveryHours must be between 1 and 720."
            });
        }

        var settings = await GetOrCreateSettingsAsync(revendeurId.Value, cancellationToken);
        settings.WarningAfterHours = dto.WarningAfterHours;
        settings.StuckAfterHours = dto.StuckAfterHours;
        settings.EscalationAfterHours = dto.EscalationAfterHours;
        settings.RepeatEveryHours = dto.RepeatEveryHours;
        settings.EnableEscalation = dto.EnableEscalation;
        settings.EnableEmail = dto.EnableEmail;
        settings.EnableSms = dto.EnableSms;
        settings.EnableWhatsApp = dto.EnableWhatsApp;
        settings.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var effective = RevendeurSettingsPolicy.BuildEffective(settings);
        return Ok(new ApiResponse<RevendeurSlaSettingsDto>
        {
            Success = true,
            Message = "SLA settings updated",
            Data = MapSlaDto(effective)
        });
    }

    [Authorize(Roles = "Revendeur")]
    [HttpGet("me/plan")]
    public async Task<ActionResult<ApiResponse<RevendeurPlanSettingsDto>>> GetMyPlan(CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId, cancellationToken);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var dto = await BuildPlanSettingsDtoAsync(revendeurId.Value, cancellationToken);
        return Ok(new ApiResponse<RevendeurPlanSettingsDto>
        {
            Success = true,
            Message = "Plan settings loaded",
            Data = dto
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{revendeurId:int}/plan")]
    public async Task<ActionResult<ApiResponse<RevendeurPlanSettingsDto>>> UpdatePlan(
        int revendeurId,
        [FromBody] UpdateRevendeurPlanSettingsDto dto,
        CancellationToken cancellationToken)
    {
        if (dto is null || (!dto.PlanTier.HasValue && !dto.MonthlyInvoiceLimit.HasValue && !dto.ActiveClientLimit.HasValue))
        {
            return BadRequest(new ApiResponse<RevendeurPlanSettingsDto>
            {
                Success = false,
                Message = "PlanTier, MonthlyInvoiceLimit, or ActiveClientLimit is required."
            });
        }

        var revendeurExists = await _context.Revendeurs
            .AsNoTracking()
            .AnyAsync(r => r.Id == revendeurId, cancellationToken);
        if (!revendeurExists)
        {
            return NotFound(new ApiResponse<RevendeurPlanSettingsDto>
            {
                Success = false,
                Message = "Revendeur not found."
            });
        }

        var settings = await GetOrCreateSettingsAsync(revendeurId, cancellationToken);
        if (dto.PlanTier.HasValue)
        {
            settings.PlanTier = dto.PlanTier.Value;
            var defaults = RevendeurSettingsPolicy.ResolvePlanDefaults(settings.PlanTier);
            if (!dto.MonthlyInvoiceLimit.HasValue)
            {
                settings.MonthlyInvoiceLimit = defaults.MonthlyInvoiceLimit;
            }

            if (!dto.ActiveClientLimit.HasValue)
            {
                settings.ActiveClientLimit = defaults.ActiveClientLimit;
            }
        }

        if (dto.MonthlyInvoiceLimit.HasValue)
        {
            settings.MonthlyInvoiceLimit = dto.MonthlyInvoiceLimit.Value;
        }

        if (dto.ActiveClientLimit.HasValue)
        {
            settings.ActiveClientLimit = dto.ActiveClientLimit.Value;
        }

        settings.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var responseDto = await BuildPlanSettingsDtoAsync(revendeurId, cancellationToken);
        return Ok(new ApiResponse<RevendeurPlanSettingsDto>
        {
            Success = true,
            Message = "Plan settings updated",
            Data = responseDto
        });
    }

    private async Task<RevendeurPlanSettingsDto> BuildPlanSettingsDtoAsync(int revendeurId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var periodStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1);

        var settings = await _context.RevendeurSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RevendeurId == revendeurId, cancellationToken);
        var effective = RevendeurSettingsPolicy.BuildEffective(settings);

        var currentMonthInvoiceCount = await _context.Invoices
            .AsNoTracking()
            .CountAsync(i =>
                i.RevendeurId == revendeurId
                && i.CreatedAt >= periodStart
                && i.CreatedAt < periodEnd, cancellationToken);

        var activeClientCount = await _context.Clients
            .AsNoTracking()
            .CountAsync(c =>
                c.RevendeurId == revendeurId
                && c.Status != ClientStatus.Missing, cancellationToken);

        return new RevendeurPlanSettingsDto
        {
            PlanTier = effective.PlanTier,
            MonthlyInvoiceLimit = effective.MonthlyInvoiceLimit,
            ActiveClientLimit = effective.ActiveClientLimit,
            CurrentMonthInvoiceCount = currentMonthInvoiceCount,
            ActiveClientCount = activeClientCount,
            CurrentPeriodStartUtc = periodStart,
            CurrentPeriodEndUtc = periodEnd
        };
    }

    private static RevendeurSlaSettingsDto MapSlaDto(RevendeurSettingsPolicy.EffectiveRevendeurSettings effective)
    {
        return new RevendeurSlaSettingsDto
        {
            WarningAfterHours = effective.WarningAfterHours,
            StuckAfterHours = effective.StuckAfterHours,
            EscalationAfterHours = effective.EscalationAfterHours,
            RepeatEveryHours = effective.RepeatEveryHours,
            EnableEscalation = effective.EnableEscalation,
            EnableEmail = effective.EnableEmail,
            EnableSms = effective.EnableSms,
            EnableWhatsApp = effective.EnableWhatsApp
        };
    }

    private async Task<int?> GetCurrentRevendeurIdAsync(int currentUserId, CancellationToken cancellationToken)
    {
        return await _context.Revendeurs
            .Where(r => r.UserId == currentUserId)
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<RevendeurSettings> GetOrCreateSettingsAsync(int revendeurId, CancellationToken cancellationToken)
    {
        var settings = await _context.RevendeurSettings
            .FirstOrDefaultAsync(s => s.RevendeurId == revendeurId, cancellationToken);
        if (settings is not null)
        {
            return settings;
        }

        var defaults = RevendeurSettingsPolicy.ResolvePlanDefaults(SubscriptionPlanTier.Starter);
        settings = new RevendeurSettings
        {
            RevendeurId = revendeurId,
            PlanTier = SubscriptionPlanTier.Starter,
            WarningAfterHours = 12,
            StuckAfterHours = 24,
            EscalationAfterHours = 48,
            RepeatEveryHours = 24,
            EnableEscalation = true,
            EnableEmail = true,
            EnableSms = false,
            EnableWhatsApp = false,
            MonthlyInvoiceLimit = defaults.MonthlyInvoiceLimit,
            ActiveClientLimit = defaults.ActiveClientLimit,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.RevendeurSettings.Add(settings);
        await _context.SaveChangesAsync(cancellationToken);
        return settings;
    }

    private bool TryGetCurrentUserId(out int currentUserId)
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idValue, out currentUserId);
    }
}
