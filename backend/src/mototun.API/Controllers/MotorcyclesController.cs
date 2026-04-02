using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Infrastructure.Data;
using System.Security.Claims;

namespace mototun.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MotorcyclesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MotorcyclesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Motorcycles?company=Zimota&brand=Yamaha&q=mt
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<MotorcycleDto>>>> GetMotorcycles(
            [FromQuery] string? company = null,
            [FromQuery] string? brand = null,
            [FromQuery] string? q = null
        )
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
                return Forbid();

            var queryable = _context.Motorcycles
                .Where(m => m.RevendeurId == revendeur.Id)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(company) && company != "all")
                queryable = queryable.Where(m => m.Company == company);

            if (!string.IsNullOrWhiteSpace(brand) && brand != "all")
                queryable = queryable.Where(m => m.Brand == brand);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var s = q.Trim().ToLower();
                queryable = queryable.Where(m =>
                    m.Brand.ToLower().Contains(s) ||
                    m.Model.ToLower().Contains(s) ||
                    m.Company.ToLower().Contains(s)
                );
            }

            var motos = await queryable
                .OrderByDescending(m => m.UpdatedAt)
                .Select(m => new MotorcycleDto
                {
                    MotorcycleId = m.Id,
                    RevendeurId = m.RevendeurId,
                    Company = m.Company,
                    Brand = m.Brand,
                    Model = m.Model,
                    Qty = m.Qty,
                    PurchasePrice = m.PurchasePrice,
                    SalePrice = m.SalePrice,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                })
                .ToListAsync();

            return Ok(new ApiResponse<List<MotorcycleDto>>
            {
                Success = true,
                Message = "Motorcycles loaded",
                Data = motos
            });
        }

        // GET: api/Motorcycles/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<MotorcycleDto>>> GetMotorcycle(int id)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
                return Forbid();

            var moto = await _context.Motorcycles
                .FirstOrDefaultAsync(m => m.Id == id && m.RevendeurId == revendeur.Id);

            if (moto == null)
            {
                return NotFound(new ApiResponse<MotorcycleDto>
                {
                    Success = false,
                    Message = "Moto not found"
                });
            }

            var dto = new MotorcycleDto
            {
                MotorcycleId = moto.Id,
                RevendeurId = moto.RevendeurId,
                Company = moto.Company,
                Brand = moto.Brand,
                Model = moto.Model,
                Qty = moto.Qty,
                PurchasePrice = moto.PurchasePrice,
                SalePrice = moto.SalePrice,
                CreatedAt = moto.CreatedAt,
                UpdatedAt = moto.UpdatedAt
            };

            return Ok(new ApiResponse<MotorcycleDto>
            {
                Success = true,
                Message = "Moto loaded",
                Data = dto
            });
        }

        // POST: api/Motorcycles
        [HttpPost]
        public async Task<ActionResult<ApiResponse<MotorcycleDto>>> CreateMotorcycle([FromBody] CreateMotorcycleDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
                return Forbid();

            if (dto.Qty < 0)
            {
                return BadRequest(new ApiResponse<MotorcycleDto>
                {
                    Success = false,
                    Message = "Qty must be >= 0"
                });
            }

            var moto = new Motorcycle
            {
                RevendeurId = revendeur.Id,
                Company = dto.Company.Trim(),
                Brand = dto.Brand.Trim(),
                Model = dto.Model.Trim(),
                Qty = dto.Qty,
                PurchasePrice = dto.PurchasePrice,
                SalePrice = dto.SalePrice,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Motorcycles.Add(moto);
            await _context.SaveChangesAsync();

            var result = new MotorcycleDto
            {
                MotorcycleId = moto.Id,
                RevendeurId = moto.RevendeurId,
                Company = moto.Company,
                Brand = moto.Brand,
                Model = moto.Model,
                Qty = moto.Qty,
                PurchasePrice = moto.PurchasePrice,
                SalePrice = moto.SalePrice,
                CreatedAt = moto.CreatedAt,
                UpdatedAt = moto.UpdatedAt
            };

            return CreatedAtAction(nameof(GetMotorcycle), new { id = moto.Id }, new ApiResponse<MotorcycleDto>
            {
                Success = true,
                Message = "Moto créée",
                Data = result
            });
        }

        // PUT: api/Motorcycles/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<MotorcycleDto>>> UpdateMotorcycle(int id, [FromBody] UpdateMotorcycleDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
                return Forbid();

            var moto = await _context.Motorcycles
                .FirstOrDefaultAsync(m => m.Id == id && m.RevendeurId == revendeur.Id);

            if (moto == null)
            {
                return NotFound(new ApiResponse<MotorcycleDto>
                {
                    Success = false,
                    Message = "Moto non trouvée"
                });
            }

            if (dto.Qty < 0)
            {
                return BadRequest(new ApiResponse<MotorcycleDto>
                {
                    Success = false,
                    Message = "Qty must be >= 0"
                });
            }

            moto.Company = dto.Company.Trim();
            moto.Brand = dto.Brand.Trim();
            moto.Model = dto.Model.Trim();
            moto.Qty = dto.Qty;
            moto.PurchasePrice = dto.PurchasePrice;
            moto.SalePrice = dto.SalePrice;
            moto.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = new MotorcycleDto
            {
                MotorcycleId = moto.Id,
                RevendeurId = moto.RevendeurId,
                Company = moto.Company,
                Brand = moto.Brand,
                Model = moto.Model,
                Qty = moto.Qty,
                PurchasePrice = moto.PurchasePrice,
                SalePrice = moto.SalePrice,
                CreatedAt = moto.CreatedAt,
                UpdatedAt = moto.UpdatedAt
            };

            return Ok(new ApiResponse<MotorcycleDto>
            {
                Success = true,
                Message = "Moto mise à jour",
                Data = result
            });
        }

        // DELETE: api/Motorcycles/5
        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteMotorcycle(int id)
        {
            var currentUserId = GetCurrentUserId();

            var revendeur = await _context.Revendeurs
                .FirstOrDefaultAsync(r => r.UserId == currentUserId);

            if (revendeur == null)
                return Forbid();

            var moto = await _context.Motorcycles
                .FirstOrDefaultAsync(m => m.Id == id && m.RevendeurId == revendeur.Id);

            if (moto == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Moto non trouvée"
                });
            }

            _context.Motorcycles.Remove(moto);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Moto supprimée"
            });
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(claim!);
        }
    }
}
