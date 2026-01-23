using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Infrastructure.Data;
using System.Security.Claims;
using mototun.Core.Enums;


namespace mototun.API.Controllers
{
    [Authorize] // only authenticated users
    [Route("api/[controller]")]
    [ApiController]
    public class ClientsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ClientsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Clients
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<ClientDto>>>> GetClients()
        {
            var currentUserId = GetCurrentUserId();

            // current user must be a revendeur
            var revendeur = await _context.Revendeurs
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
            {
                return Forbid();
            }

            var clients = await _context.Clients
                .Where(c => c.RevendeurId == revendeur.Id)
                .Include(c => c.User)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new ClientDto
                {
                    ClientId = c.Id,
                    UserId = c.UserId,
                    FullName = c.User.FullName,
                    CIN = c.CIN,
                    Email = c.User.Email,
                    Phone = c.User.Phone,
                    Address = c.Address,
                    City = c.City,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            return Ok(new ApiResponse<List<ClientDto>>
            {
                Success = true,
                Message = "Clients loaded",
                Data = clients
            });
        }

        // GET: api/Clients/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> GetClient(int id)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
            {
                return Forbid();
            }

            var client = await _context.Clients
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == id && c.RevendeurId == revendeur.Id);

            if (client == null)
            {
                return NotFound(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "Client not found"
                });
            }

            var dto = new ClientDto
            {
                ClientId = client.Id,
                UserId = client.UserId,
                FullName = client.User.FullName,
                CIN = client.CIN,
                Email = client.User.Email,
                Phone = client.User.Phone,
                Address = client.Address,
                City = client.City,
                CreatedAt = client.CreatedAt
            };

            return Ok(new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client loaded",
                Data = dto
            });
        }

        // POST: api/Clients
        [HttpPost]
        public async Task<ActionResult<ApiResponse<ClientDto>>> CreateClient([FromBody] CreateClientDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
            {
                return Forbid();
            }

            // email unique
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);

            if (emailExists)
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "Email déjà utilisé"
                });
            }

            // cin unique
            var cinExists = await _context.Clients
                .AnyAsync(c => c.CIN == dto.CIN);

            if (cinExists)
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "CIN déjà utilisé"
                });
            }

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Client123!"),
                Role = UserRole.Client,
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var client = new Client
            {
                UserId = user.Id,
                RevendeurId = revendeur.Id,
                CIN = dto.CIN,
                Address = dto.Address,
                City = dto.City,
                CreatedAt = DateTime.UtcNow
            };

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            var result = new ClientDto
            {
                ClientId = client.Id,
                UserId = client.UserId,
                FullName = user.FullName,
                CIN = client.CIN,
                Email = user.Email,
                Phone = user.Phone,
                Address = client.Address,
                City = client.City,
                CreatedAt = client.CreatedAt
            };

            return CreatedAtAction(nameof(GetClient), new { id = client.Id }, new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client créé",
                Data = result
            });
        }

        // PUT: api/Clients/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> UpdateClient(int id, [FromBody] UpdateClientDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
            {
                return Forbid();
            }

            var client = await _context.Clients
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == id && c.RevendeurId == revendeur.Id);

            if (client == null)
            {
                return NotFound(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "Client non trouvé"
                });
            }

            client.User.FullName = dto.FullName;
            client.User.Email = dto.Email;
            client.User.Phone = dto.Phone;
            client.CIN = dto.CIN;
            client.Address = dto.Address;
            client.City = dto.City;

            await _context.SaveChangesAsync();

            var result = new ClientDto
            {
                ClientId = client.Id,
                UserId = client.UserId,
                FullName = client.User.FullName,
                CIN = client.CIN,
                Email = client.User.Email,
                Phone = client.User.Phone,
                Address = client.Address,
                City = client.City,
                CreatedAt = client.CreatedAt
            };

            return Ok(new ApiResponse<ClientDto>
            {
                Success = true,
                Message = "Client mis à jour",
                Data = result
            });
        }

        // DELETE: api/Clients/5
        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteClient(int id)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
            {
                return Forbid();
            }

            var client = await _context.Clients
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == id && c.RevendeurId == revendeur.Id);

            if (client == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Client non trouvé"
                });
            }

            // keep user but deactivate, or delete both – here: deactivate user
            client.User.Status = UserStatus.Inactive;
            _context.Clients.Remove(client);

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Client supprimé"
            });
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(claim!);
        }
    }
}
