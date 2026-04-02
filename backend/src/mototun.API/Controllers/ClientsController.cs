using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.API.Services.Settings;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ClientsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ClientsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<ClientDto>>>> GetClients()
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var clients = await _context.Clients
                .AsNoTracking()
                .Where(c => c.RevendeurId == revendeur.Id)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var statsByClientId = await BuildClientStatsMapAsync(
                revendeur.Id,
                clients.Select(c => c.Id));

            var result = clients
                .Select(client => MapClientDto(
                    client,
                    statsByClientId.GetValueOrDefault(client.Id)))
                .ToList();

            return Ok(new ApiResponse<List<ClientDto>>
            {
                Success = true,
                Message = "Clients loaded",
                Data = result
            });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> GetClient(int id)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == id && c.RevendeurId == revendeur.Id);

            if (client is null)
            {
                return NotFound(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "Client not found"
                });
            }

            var statsByClientId = await BuildClientStatsMapAsync(revendeur.Id, new[] { client.Id });

            return Ok(new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client loaded",
                Data = MapClientDto(client, statsByClientId.GetValueOrDefault(client.Id))
            });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ClientDto>>> CreateClient([FromBody] CreateClientDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var effectiveSettings = await GetEffectiveRevendeurSettingsAsync(revendeur.Id);

            var fullName = NormalizeString(dto.FullName);
            var email = NormalizeString(dto.Email);
            var phone = NormalizeString(dto.Phone);
            var cin = NormalizeString(dto.CIN)?.ToUpperInvariant();
            var address = NormalizeString(dto.Address) ?? string.Empty;
            var city = NormalizeString(dto.City) ?? string.Empty;

            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(cin))
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "FullName et CIN sont obligatoires"
                });
            }

            var utcNow = DateTime.UtcNow;
            var existingByCin = await _context.Clients
                .FirstOrDefaultAsync(c => c.CIN == cin);

            if (existingByCin is not null)
            {
                if (existingByCin.RevendeurId.HasValue && existingByCin.RevendeurId.Value != revendeur.Id)
                {
                    return BadRequest(new ApiResponse<ClientDto>
                    {
                        Success = false,
                        Message = "CIN deja lie a un autre revendeur"
                    });
                }

                if (!string.IsNullOrWhiteSpace(email))
                {
                    var emailInUse = await _context.Clients
                        .AnyAsync(c => c.Email == email && c.Id != existingByCin.Id);

                    if (emailInUse)
                    {
                        return BadRequest(new ApiResponse<ClientDto>
                        {
                            Success = false,
                            Message = "Email deja utilise"
                        });
                    }
                }

                if (!existingByCin.RevendeurId.HasValue)
                {
                    var activeClientCount = await GetActiveClientCountAsync(revendeur.Id);
                    if (activeClientCount >= effectiveSettings.ActiveClientLimit)
                    {
                        return Conflict(new ApiResponse<ClientDto>
                        {
                            Success = false,
                            Message = $"Active client limit reached ({effectiveSettings.ActiveClientLimit}) for {effectiveSettings.PlanTier} plan"
                        });
                    }
                }

                existingByCin.RevendeurId = revendeur.Id;
                existingByCin.FullName = fullName;
                existingByCin.Email = email;
                existingByCin.Phone = phone;
                existingByCin.Address = address;
                existingByCin.City = city;
                existingByCin.Status = ClientStatus.Active;

                await _context.SaveChangesAsync();
                var statsByClientId = await BuildClientStatsMapAsync(revendeur.Id, new[] { existingByCin.Id });

                return Ok(new ApiResponse<ClientDto>
                {
                    Success = true,
                    Message = "Client reactive",
                    Data = MapClientDto(existingByCin, statsByClientId.GetValueOrDefault(existingByCin.Id))
                });
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailExists = await _context.Clients.AnyAsync(c => c.Email == email);
                if (emailExists)
                {
                    return BadRequest(new ApiResponse<ClientDto>
                    {
                        Success = false,
                        Message = "Email deja utilise"
                    });
                }
            }

            var currentActiveClientCount = await GetActiveClientCountAsync(revendeur.Id);
            if (currentActiveClientCount >= effectiveSettings.ActiveClientLimit)
            {
                return Conflict(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = $"Active client limit reached ({effectiveSettings.ActiveClientLimit}) for {effectiveSettings.PlanTier} plan"
                });
            }

            var client = new Client
            {
                FullName = fullName,
                Email = email,
                Phone = phone,
                RevendeurId = revendeur.Id,
                CIN = cin,
                Address = address,
                City = city,
                Status = ClientStatus.Active,
                CreatedAt = utcNow
            };

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();
            var createdStats = await BuildClientStatsMapAsync(revendeur.Id, new[] { client.Id });

            return CreatedAtAction(nameof(GetClient), new { id = client.Id }, new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client cree",
                Data = MapClientDto(client, createdStats.GetValueOrDefault(client.Id))
            });
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> UpdateClient(int id, [FromBody] UpdateClientDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == id && c.RevendeurId == revendeur.Id);

            if (client is null)
            {
                return NotFound(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "Client non trouve"
                });
            }

            var fullName = NormalizeString(dto.FullName);
            var email = NormalizeString(dto.Email);
            var phone = NormalizeString(dto.Phone);
            var cin = NormalizeString(dto.CIN)?.ToUpperInvariant();
            var address = NormalizeString(dto.Address) ?? string.Empty;
            var city = NormalizeString(dto.City) ?? string.Empty;

            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(cin))
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "FullName et CIN sont obligatoires"
                });
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailExists = await _context.Clients
                    .AnyAsync(c => c.Email == email && c.Id != client.Id);

                if (emailExists)
                {
                    return BadRequest(new ApiResponse<ClientDto>
                    {
                        Success = false,
                        Message = "Email deja utilise"
                    });
                }
            }

            var cinExists = await _context.Clients
                .AnyAsync(c => c.CIN == cin && c.Id != client.Id);

            if (cinExists)
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "CIN deja utilise"
                });
            }

            client.FullName = fullName;
            client.Email = email;
            client.Phone = phone;
            client.CIN = cin;
            client.Address = address;
            client.City = city;

            await _context.SaveChangesAsync();
            var updatedStats = await BuildClientStatsMapAsync(revendeur.Id, new[] { client.Id });

            return Ok(new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client mis a jour",
                Data = MapClientDto(client, updatedStats.GetValueOrDefault(client.Id))
            });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> DeleteClient(int id)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur is null)
            {
                return Forbid();
            }

            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == id && c.RevendeurId == revendeur.Id);

            if (client is null)
            {
                return NotFound(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "Client non trouve"
                });
            }

            if (client.Status != ClientStatus.Missing)
            {
                client.Status = ClientStatus.Missing;
                await _context.SaveChangesAsync();
            }

            var updatedStats = await BuildClientStatsMapAsync(revendeur.Id, new[] { client.Id });

            return Ok(new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client marque manquant",
                Data = MapClientDto(client, updatedStats.GetValueOrDefault(client.Id))
            });
        }

        private async Task<Dictionary<int, ClientStatsDto>> BuildClientStatsMapAsync(
            int revendeurId,
            IEnumerable<int> clientIds)
        {
            var ids = clientIds
                .Distinct()
                .ToList();

            if (ids.Count == 0)
            {
                return new Dictionary<int, ClientStatsDto>();
            }

            var invoiceBase = _context.Invoices
                .AsNoTracking()
                .Where(i => i.RevendeurId == revendeurId && ids.Contains(i.ClientId));

            var amountAndDateStats = await invoiceBase
                .GroupBy(i => i.ClientId)
                .Select(group => new
                {
                    ClientId = group.Key,
                    TotalInvoicedAmount = group.Sum(i => i.TotalAmount),
                    LastPurchaseDate = group.Max(i => (DateTime?)i.InvoiceDate)
                })
                .ToDictionaryAsync(
                    item => item.ClientId,
                    item => new ClientStatsDto
                    {
                        TotalInvoicedAmount = item.TotalInvoicedAmount,
                        LastPurchaseDate = item.LastPurchaseDate
                    });

            var soldCounts = await _context.SoldMotorcycles
                .AsNoTracking()
                .Where(s => s.RevendeurId == revendeurId)
                .Join(
                    invoiceBase.Select(i => new { i.Id, i.ClientId }),
                    sold => sold.InvoiceId,
                    invoice => invoice.Id,
                    (_, invoice) => invoice.ClientId)
                .GroupBy(clientId => clientId)
                .Select(group => new
                {
                    ClientId = group.Key,
                    MotorcyclesPurchasedCount = group.Count()
                })
                .ToListAsync();

            foreach (var soldCount in soldCounts)
            {
                if (!amountAndDateStats.TryGetValue(soldCount.ClientId, out var existing))
                {
                    existing = new ClientStatsDto();
                    amountAndDateStats[soldCount.ClientId] = existing;
                }

                existing.MotorcyclesPurchasedCount = soldCount.MotorcyclesPurchasedCount;
            }

            return amountAndDateStats;
        }

        private static ClientDto MapClientDto(Client client, ClientStatsDto? stats = null)
        {
            return new ClientDto
            {
                ClientId = client.Id,
                FullName = client.FullName,
                CIN = client.CIN,
                Email = client.Email,
                Phone = client.Phone,
                Address = client.Address,
                City = client.City,
                CreatedAt = client.CreatedAt,
                MotorcyclesPurchasedCount = stats?.MotorcyclesPurchasedCount ?? 0,
                TotalInvoicedAmount = stats?.TotalInvoicedAmount ?? 0m,
                LastPurchaseDate = stats?.LastPurchaseDate,
                Status = client.Status
            };
        }

        private static string? NormalizeString(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private async Task<RevendeurSettingsPolicy.EffectiveRevendeurSettings> GetEffectiveRevendeurSettingsAsync(int revendeurId)
        {
            var settings = await _context.RevendeurSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.RevendeurId == revendeurId);

            return RevendeurSettingsPolicy.BuildEffective(settings);
        }

        private async Task<int> GetActiveClientCountAsync(int revendeurId)
        {
            return await _context.Clients
                .AsNoTracking()
                .CountAsync(c => c.RevendeurId == revendeurId && c.Status != ClientStatus.Missing);
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(claim!);
        }

        private sealed class ClientStatsDto
        {
            public int MotorcyclesPurchasedCount { get; set; }
            public decimal TotalInvoicedAmount { get; set; }
            public DateTime? LastPurchaseDate { get; set; }
        }
    }
}
