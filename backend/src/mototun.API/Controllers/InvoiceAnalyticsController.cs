using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.API.Services.Invoices;
using mototun.Core.DTOs;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers;

[Authorize]
[ApiController]
[Route("api/Invoices")]
public class InvoiceAnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInvoiceDashboardService _dashboardService;

    public InvoiceAnalyticsController(
        ApplicationDbContext context,
        IInvoiceDashboardService dashboardService)
    {
        _context = context;
        _dashboardService = dashboardService;
    }

    [HttpGet("fournisseur/dashboard")]
    public async Task<ActionResult<ApiResponse<FournisseurDashboardAnalyticsDto>>> GetFournisseurDashboard(
        [FromQuery] string? range = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId, cancellationToken);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var analytics = await _dashboardService.GetFournisseurDashboardAsync(
            fournisseurId.Value,
            range,
            cancellationToken);

        return Ok(new ApiResponse<FournisseurDashboardAnalyticsDto>
        {
            Success = true,
            Message = "Fournisseur dashboard analytics loaded",
            Data = analytics
        });
    }

    [HttpGet("revendeur/dashboard/export")]
    public async Task<IActionResult> ExportRevendeurDashboard(
        [FromQuery] string? range = null,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
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

        var exportFile = await _dashboardService.ExportRevendeurDashboardAsync(
            revendeurId.Value,
            range,
            type,
            cancellationToken);

        return File(exportFile.Content, exportFile.ContentType, exportFile.FileName);
    }

    [HttpGet("fournisseur/dashboard/export")]
    public async Task<IActionResult> ExportFournisseurDashboard(
        [FromQuery] string? range = null,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId, cancellationToken);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var exportFile = await _dashboardService.ExportFournisseurDashboardAsync(
            fournisseurId.Value,
            range,
            type,
            cancellationToken);

        return File(exportFile.Content, exportFile.ContentType, exportFile.FileName);
    }

    private async Task<int?> GetCurrentRevendeurIdAsync(int currentUserId, CancellationToken cancellationToken)
    {
        return await _context.Revendeurs
            .Where(r => r.UserId == currentUserId)
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<int?> GetCurrentFournisseurIdAsync(int currentUserId, CancellationToken cancellationToken)
    {
        return await _context.Fournisseurs
            .Where(f => f.UserId == currentUserId)
            .Select(f => (int?)f.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private bool TryGetCurrentUserId(out int currentUserId)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out currentUserId);
    }
}
