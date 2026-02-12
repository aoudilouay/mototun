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
    [Authorize] // only authenticated users (revendeur/fournisseur logged in)
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

            var revendeur = await _context.Revendeurs
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
                return Forbid();

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
                return Forbid();

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
                return Forbid();

            // normalize
            var fullName = dto.FullName?.Trim();
            var email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
            var phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
            var cin = dto.CIN?.Trim();
            var address = dto.Address?.Trim();
            var city = dto.City?.Trim();

            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(cin))
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "FullName et CIN sont obligatoires"
                });
            }

            // email unique ONLY if provided
            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailExists = await _context.Users.AnyAsync(u => u.Email == email);
                if (emailExists)
                {
                    return BadRequest(new ApiResponse<ClientDto>
                    {
                        Success = false,
                        Message = "Email déjà utilisé"
                    });
                }
            }

            // cin unique (global). If you want CIN unique per revendeur instead, change to:
            // .AnyAsync(c => c.CIN == cin && c.RevendeurId == revendeur.Id)
            var cinExists = await _context.Clients.AnyAsync(c => c.CIN == cin);
            if (cinExists)
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "CIN déjà utilisé"
                });
            }

            // create a User row for client BUT with CanLogin = false
            // (make sure you added CanLogin property in User entity)
            var user = new User
            {
                FullName = fullName!,
                Email = email,
                Phone = phone,
                // random password so nobody can login with it
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                Role = UserRole.Client,
                Status = UserStatus.Active,
                CanLogin = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var client = new Client
            {
                UserId = user.Id,
                RevendeurId = revendeur.Id,
                CIN = cin!,
                Address = address,
                City = city,
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
                return Forbid();

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

            // normalize
            var fullName = dto.FullName?.Trim();
            var email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
            var phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
            var cin = dto.CIN?.Trim();
            var address = dto.Address?.Trim();
            var city = dto.City?.Trim();

            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(cin))
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "FullName et CIN sont obligatoires"
                });
            }

            // email unique ONLY if provided, and excluding this user
            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailExists = await _context.Users
                    .AnyAsync(u => u.Email == email && u.Id != client.UserId);

                if (emailExists)
                {
                    return BadRequest(new ApiResponse<ClientDto>
                    {
                        Success = false,
                        Message = "Email déjà utilisé"
                    });
                }
            }

            // CIN unique (global) excluding this client
            var cinExists = await _context.Clients
                .AnyAsync(c => c.CIN == cin && c.Id != client.Id);

            if (cinExists)
            {
                return BadRequest(new ApiResponse<ClientDto>
                {
                    Success = false,
                    Message = "CIN déjà utilisé"
                });
            }

            // Update
            client.User.FullName = fullName!;
            client.User.Email = email;
            client.User.Phone = phone;

            // enforce client cannot login
            client.User.Role = UserRole.Client;
            client.User.CanLogin = false;

            client.CIN = cin!;
            client.Address = address;
            client.City = city;

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
                return Forbid();

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

            // deactivate user, remove client row
            client.User.Status = UserStatus.Inactive;
            client.User.CanLogin = false;

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
