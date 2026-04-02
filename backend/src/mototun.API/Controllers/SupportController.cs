using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers;

[Authorize(Roles = "Revendeur,Fournisseur,Admin")]
[ApiController]
[Route("api/support")]
public class SupportController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SupportController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("tickets")]
    public async Task<ActionResult<ApiResponse<List<SupportTicketListItemDto>>>> GetTickets(
        [FromQuery] SupportTicketStatus? status = null,
        [FromQuery] UserRole? createdByRole = null,
        [FromQuery] string? search = null,
        [FromQuery] int take = 200)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var currentRole))
        {
            return Unauthorized(new ApiResponse<List<SupportTicketListItemDto>>
            {
                Success = false,
                Message = "Session invalide."
            });
        }

        take = Math.Clamp(take, 1, 500);

        var query = _context.SupportTickets
            .AsNoTracking()
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedAdminUser)
            .AsQueryable();

        if (currentRole != UserRole.Admin)
        {
            query = query.Where(t => t.CreatedByUserId == currentUserId);
        }
        else if (createdByRole.HasValue && createdByRole.Value is UserRole.Revendeur or UserRole.Fournisseur)
        {
            query = query.Where(t => t.CreatedByUser != null && t.CreatedByUser.Role == createdByRole.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(t =>
                EF.Functions.Like(t.TicketNumber, pattern)
                || EF.Functions.Like(t.Subject, pattern)
                || EF.Functions.Like(t.Category, pattern)
                || (t.CreatedByUser != null && EF.Functions.Like(t.CreatedByUser.FullName, pattern)));
        }

        var tickets = await query
            .OrderByDescending(t => t.LastMessageAt)
            .ThenByDescending(t => t.Id)
            .Take(take)
            .ToListAsync();

        var data = tickets.Select(MapListItem).ToList();
        return Ok(new ApiResponse<List<SupportTicketListItemDto>>
        {
            Success = true,
            Message = "Tickets support charges.",
            Data = data
        });
    }

    [HttpGet("tickets/{ticketId:int}")]
    public async Task<ActionResult<ApiResponse<SupportTicketDetailDto>>> GetTicket(int ticketId)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var currentRole))
        {
            return Unauthorized(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Session invalide."
            });
        }

        var ticket = await _context.SupportTickets
            .AsNoTracking()
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedAdminUser)
            .Include(t => t.Messages)
                .ThenInclude(m => m.SenderUser)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket is null)
        {
            return NotFound(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Ticket introuvable."
            });
        }

        if (!CanAccessTicket(currentRole, currentUserId, ticket))
        {
            return Forbid();
        }

        var detail = MapDetail(ticket);
        return Ok(new ApiResponse<SupportTicketDetailDto>
        {
            Success = true,
            Message = "Ticket charge.",
            Data = detail
        });
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<ApiResponse<SupportTicketDetailDto>>> CreateTicket([FromBody] SupportTicketCreateDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var currentRole))
        {
            return Unauthorized(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Session invalide."
            });
        }

        if (dto is null)
        {
            return BadRequest(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Payload invalide."
            });
        }

        var subject = (dto.Subject ?? string.Empty).Trim();
        var firstMessage = (dto.Message ?? string.Empty).Trim();
        var category = NormalizeCategory(dto.Category);
        var priority = dto.Priority ?? SupportTicketPriority.Normal;

        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 200)
        {
            return BadRequest(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Objet invalide (1 a 200 caracteres)."
            });
        }

        if (!Enum.IsDefined(priority))
        {
            return BadRequest(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Priorite invalide."
            });
        }

        if (string.IsNullOrWhiteSpace(firstMessage) || firstMessage.Length > 3000)
        {
            return BadRequest(new ApiResponse<SupportTicketDetailDto>
            {
                Success = false,
                Message = "Message invalide (1 a 3000 caracteres)."
            });
        }

        var now = DateTime.UtcNow;
        var ticketNumber = await GenerateUniqueTicketNumberAsync();

        var ticket = new SupportTicket
        {
            TicketNumber = ticketNumber,
            Subject = subject,
            Category = category,
            Priority = priority,
            Status = SupportTicketStatus.Pending,
            CreatedByUserId = currentUserId,
            LastMessageAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        var message = new SupportTicketMessage
        {
            Ticket = ticket,
            SenderUserId = currentUserId,
            SenderRole = currentRole,
            Body = firstMessage,
            CreatedAt = now
        };

        _context.SupportTickets.Add(ticket);
        _context.SupportTicketMessages.Add(message);
        await _context.SaveChangesAsync();

        var created = await _context.SupportTickets
            .AsNoTracking()
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedAdminUser)
            .Include(t => t.Messages)
                .ThenInclude(m => m.SenderUser)
            .FirstAsync(t => t.Id == ticket.Id);

        return Ok(new ApiResponse<SupportTicketDetailDto>
        {
            Success = true,
            Message = "Ticket cree.",
            Data = MapDetail(created)
        });
    }

    [HttpPost("tickets/{ticketId:int}/messages")]
    public async Task<ActionResult<ApiResponse<SupportTicketMessageDto>>> AddMessage(int ticketId, [FromBody] SupportTicketReplyDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var currentRole))
        {
            return Unauthorized(new ApiResponse<SupportTicketMessageDto>
            {
                Success = false,
                Message = "Session invalide."
            });
        }

        if (dto is null)
        {
            return BadRequest(new ApiResponse<SupportTicketMessageDto>
            {
                Success = false,
                Message = "Payload invalide."
            });
        }

        var body = (dto.Message ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(body) || body.Length > 3000)
        {
            return BadRequest(new ApiResponse<SupportTicketMessageDto>
            {
                Success = false,
                Message = "Message invalide (1 a 3000 caracteres)."
            });
        }

        var ticket = await _context.SupportTickets
            .Include(t => t.CreatedByUser)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket is null)
        {
            return NotFound(new ApiResponse<SupportTicketMessageDto>
            {
                Success = false,
                Message = "Ticket introuvable."
            });
        }

        if (!CanAccessTicket(currentRole, currentUserId, ticket))
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        var message = new SupportTicketMessage
        {
            SupportTicketId = ticket.Id,
            SenderUserId = currentUserId,
            SenderRole = currentRole,
            Body = body,
            CreatedAt = now
        };

        if (currentRole == UserRole.Admin)
        {
            ticket.AssignedAdminUserId ??= currentUserId;
            if (ticket.Status == SupportTicketStatus.Pending)
            {
                ticket.Status = SupportTicketStatus.InProgress;
                ticket.ClosedAt = null;
            }
        }
        else if (ticket.Status is SupportTicketStatus.Resolved or SupportTicketStatus.Closed)
        {
            ticket.Status = SupportTicketStatus.InProgress;
            ticket.ClosedAt = null;
        }

        ticket.LastMessageAt = now;
        ticket.UpdatedAt = now;

        _context.SupportTicketMessages.Add(message);
        await _context.SaveChangesAsync();

        var senderName = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == currentUserId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync();

        return Ok(new ApiResponse<SupportTicketMessageDto>
        {
            Success = true,
            Message = "Message envoye.",
            Data = new SupportTicketMessageDto
            {
                Id = message.Id,
                SenderUserId = currentUserId,
                SenderRole = currentRole,
                SenderName = string.IsNullOrWhiteSpace(senderName) ? currentRole.ToString() : senderName,
                Body = message.Body,
                CreatedAt = message.CreatedAt
            }
        });
    }

    [HttpPatch("tickets/{ticketId:int}/status")]
    public async Task<ActionResult<ApiResponse<SupportTicketListItemDto>>> UpdateStatus(int ticketId, [FromBody] SupportTicketStatusUpdateDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var currentRole))
        {
            return Unauthorized(new ApiResponse<SupportTicketListItemDto>
            {
                Success = false,
                Message = "Session invalide."
            });
        }

        if (dto is null || !Enum.IsDefined(dto.Status))
        {
            return BadRequest(new ApiResponse<SupportTicketListItemDto>
            {
                Success = false,
                Message = "Statut invalide."
            });
        }

        var ticket = await _context.SupportTickets
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedAdminUser)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket is null)
        {
            return NotFound(new ApiResponse<SupportTicketListItemDto>
            {
                Success = false,
                Message = "Ticket introuvable."
            });
        }

        if (!CanAccessTicket(currentRole, currentUserId, ticket))
        {
            return Forbid();
        }

        if (currentRole != UserRole.Admin && dto.Status != SupportTicketStatus.Closed)
        {
            return Forbid();
        }

        ticket.Status = dto.Status;
        ticket.UpdatedAt = DateTime.UtcNow;

        if (currentRole == UserRole.Admin)
        {
            ticket.AssignedAdminUserId ??= currentUserId;
        }

        if (dto.Status is SupportTicketStatus.Closed or SupportTicketStatus.Resolved)
        {
            ticket.ClosedAt = DateTime.UtcNow;
        }
        else
        {
            ticket.ClosedAt = null;
        }

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<SupportTicketListItemDto>
        {
            Success = true,
            Message = "Statut mis a jour.",
            Data = MapListItem(ticket)
        });
    }

    private async Task<string> GenerateUniqueTicketNumberAsync()
    {
        for (var i = 0; i < 5; i++)
        {
            var number = $"SUP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..19].ToUpperInvariant();
            var exists = await _context.SupportTickets.AsNoTracking().AnyAsync(t => t.TicketNumber == number);
            if (!exists)
            {
                return number;
            }
        }

        return $"SUP-{DateTime.UtcNow:yyyyMMdd}-{DateTime.UtcNow.Ticks.ToString()[^6..]}";
    }

    private static string NormalizeCategory(string? value)
    {
        var category = (value ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(category))
        {
            return "General";
        }

        return category.Length <= 80 ? category : category[..80];
    }

    private static bool CanAccessTicket(UserRole currentRole, int currentUserId, SupportTicket ticket)
    {
        if (currentRole == UserRole.Admin)
        {
            return true;
        }

        return ticket.CreatedByUserId == currentUserId;
    }

    private static SupportTicketListItemDto MapListItem(SupportTicket ticket)
    {
        return new SupportTicketListItemDto
        {
            Id = ticket.Id,
            TicketNumber = ticket.TicketNumber,
            Subject = ticket.Subject,
            Category = ticket.Category,
            Priority = ticket.Priority,
            Status = ticket.Status,
            CreatedByUserId = ticket.CreatedByUserId,
            CreatedByRole = ticket.CreatedByUser?.Role ?? UserRole.Client,
            CreatedByName = ticket.CreatedByUser?.FullName ?? "Utilisateur",
            AssignedAdminUserId = ticket.AssignedAdminUserId,
            AssignedAdminName = ticket.AssignedAdminUser?.FullName,
            LastMessageAt = ticket.LastMessageAt,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
            ClosedAt = ticket.ClosedAt
        };
    }

    private static SupportTicketDetailDto MapDetail(SupportTicket ticket)
    {
        var detail = new SupportTicketDetailDto
        {
            Id = ticket.Id,
            TicketNumber = ticket.TicketNumber,
            Subject = ticket.Subject,
            Category = ticket.Category,
            Priority = ticket.Priority,
            Status = ticket.Status,
            CreatedByUserId = ticket.CreatedByUserId,
            CreatedByRole = ticket.CreatedByUser?.Role ?? UserRole.Client,
            CreatedByName = ticket.CreatedByUser?.FullName ?? "Utilisateur",
            AssignedAdminUserId = ticket.AssignedAdminUserId,
            AssignedAdminName = ticket.AssignedAdminUser?.FullName,
            LastMessageAt = ticket.LastMessageAt,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
            ClosedAt = ticket.ClosedAt,
            Messages = ticket.Messages
                .OrderBy(m => m.CreatedAt)
                .ThenBy(m => m.Id)
                .Select(m => new SupportTicketMessageDto
                {
                    Id = m.Id,
                    SenderUserId = m.SenderUserId,
                    SenderRole = m.SenderRole,
                    SenderName = m.SenderUser?.FullName ?? m.SenderRole.ToString(),
                    Body = m.Body,
                    CreatedAt = m.CreatedAt
                })
                .ToList()
        };

        return detail;
    }

    private bool TryGetCurrentUser(out int currentUserId, out UserRole role)
    {
        currentUserId = 0;
        role = UserRole.Client;

        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);

        return int.TryParse(idClaim, out currentUserId)
            && Enum.TryParse<UserRole>(roleClaim, true, out role)
            && role is UserRole.Revendeur or UserRole.Fournisseur or UserRole.Admin;
    }
}
