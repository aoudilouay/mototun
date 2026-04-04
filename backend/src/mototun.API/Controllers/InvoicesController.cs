using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using mototun.API.Extensions;
using mototun.API.Services.Documents;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using mototun.API.Services.Email;
using mototun.API.Services.DocumentAnalysis;
using mototun.API.Services.InvoicePdf;
using mototun.API.Services.Settings;
using mototun.API.Services.Storage;
using mototun.Infrastructure.Services;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using System.IO.Compression;
using System.Diagnostics;

namespace mototun.API.Controllers;

/// <summary>
/// Request DTO for updating invoice settings with file uploads.
/// </summary>
public class UpdateInvoiceSettingsFormRequest
{
    public string? CompanyName { get; set; }

    public IFormFile? LogoFile { get; set; }

    public IFormFile? SignatureFile { get; set; }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private static readonly HashSet<string> AllowedDocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
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
    private static readonly HashSet<string> AllowedInvoiceSettingsImageExtensions = new(StringComparer.OrdinalIgnoreCase)
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
    private const long MaxUploadBytes = 50_000_000;
    private const long MaxInvoiceSettingsImageUploadBytes = 5_000_000;
    private const double PdfPageWidth = 595;
    private const double PdfPageHeight = 842;
    private const int MaxCustomElements = 24;
    private const string InvoiceNumberPrefixDefault = "";
    private const int InvoiceNumberStartDefault = 100;
    private const int InvoiceNumberIncrementStep = 11;
    private static readonly HashSet<string> AllowedCustomElementTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "image",
        "signature",
        "stamp",
        "line",
        "rect",
        "circle"
    };

    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IEmailSender _emailSender;
    private readonly IApplicationEmailService _applicationEmailService;
    private readonly IDocumentAutoValidationService _documentAutoValidationService;
    private readonly IOptionsMonitor<InvoicePdfOptions> _invoicePdfOptions;
    private readonly IInvoicePdfSettingsStore _invoicePdfSettingsStore;
    private readonly IInvoiceSettingsService _invoiceSettingsService;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(
        ApplicationDbContext context,
        IWebHostEnvironment environment,
        IEmailSender emailSender,
        IApplicationEmailService applicationEmailService,
        IDocumentAutoValidationService documentAutoValidationService,
        IOptionsMonitor<InvoicePdfOptions> invoicePdfOptions,
        IInvoicePdfSettingsStore invoicePdfSettingsStore,
        IInvoiceSettingsService invoiceSettingsService,
        IFileStorage fileStorage,
        ILogger<InvoicesController> logger)
    {
        _context = context;
        _environment = environment;
        _emailSender = emailSender;
        _applicationEmailService = applicationEmailService;
        _documentAutoValidationService = documentAutoValidationService;
        _invoicePdfOptions = invoicePdfOptions;
        _invoicePdfSettingsStore = invoicePdfSettingsStore;
        _invoiceSettingsService = invoiceSettingsService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    [HttpGet]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<InvoiceDto>>>> GetInvoices([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        // Pagination: skip * pageSize
        var skip = (page - 1) * pageSize;

        // Optimized query: only load necessary data for list view
        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.RevendeurId == revendeurId.Value)
            .Include(i => i.Client)
            .Include(i => i.AssignedFournisseur)
                .ThenInclude(f => f!.User)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync();

        // Load documents count only (minimal data)
        var invoiceIds = invoices.Select(i => i.Id).ToList();
        var documentCounts = await _context.ClientPortalDocuments
            .AsNoTracking()
            .Where(d => invoiceIds.Contains(d.InvoiceId))
            .GroupBy(d => d.InvoiceId)
            .Select(g => new { InvoiceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.InvoiceId, x => x.Count);

        // Enrich invoices with document info (without loading full documents)
        var result = invoices.Select(i =>
        {
            var dto = MapInvoiceDto(i);
            dto.DocumentCount = documentCounts.TryGetValue(i.Id, out var count) ? count : 0;
            return dto;
        }).ToList();

        return Ok(new ApiResponse<List<InvoiceDto>>
        {
            Success = true,
            Message = "Invoices loaded",
            Data = result,
            Meta = new { Page = page, PageSize = pageSize, Total = await _context.Invoices.CountAsync(i => i.RevendeurId == revendeurId.Value) }
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetInvoice(int id)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        // Full load only for specific invoice view
        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == id && i.RevendeurId == revendeurId.Value)
            .Include(i => i.Client)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .Include(i => i.TimelineEvents)
            .Include(i => i.AssignedFournisseur)
                .ThenInclude(f => f!.User)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<InvoiceDto>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        return Ok(new ApiResponse<InvoiceDto>
        {
            Success = true,
            Message = "Invoice loaded",
            Data = MapInvoiceDto(invoice)
        });
    }

    [HttpGet("pdf-settings")]
    public async Task<ActionResult<ApiResponse<InvoicePdfSettingsDto>>> GetInvoicePdfSettings(CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var defaults = InvoicePdfCustomization.FromOptions(_invoicePdfOptions.CurrentValue);
        var custom = await _invoicePdfSettingsStore.GetRevendeurCustomizationAsync(revendeurId.Value, cancellationToken);
        var effective = defaults.Merge(custom);

        return Ok(new ApiResponse<InvoicePdfSettingsDto>
        {
            Success = true,
            Message = "Invoice PDF settings loaded",
            Data = MapInvoicePdfSettingsDto(effective, custom is not null)
        });
    }

    [HttpPut("pdf-settings")]
    public async Task<ActionResult<ApiResponse<InvoicePdfSettingsDto>>> UpdateInvoicePdfSettings(
        [FromBody] UpdateInvoicePdfSettingsDto dto,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        if (dto is null)
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "Payload is required"
            });
        }

        var custom = dto.ResetToDefault
            ? null
            : MapUpdateDtoToCustomization(dto);

        var invalidColorField = custom is null ? null : GetFirstInvalidHexField(custom);
        if (invalidColorField is not null)
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = $"{invalidColorField} must be in #RRGGBB format"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.FontFamily) && !IsSupportedFontFamily(dto.FontFamily))
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "FontFamily must be Helvetica, Times, or Courier"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.LogoDataUrl) && dto.LogoDataUrl.Trim().Length > 1_600_000)
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "LogoDataUrl exceeds maximum allowed size (1.6 MB)"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.LogoDataUrl) && !IsValidImageDataUrl(dto.LogoDataUrl))
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "LogoDataUrl must be a valid data:image/*;base64 value"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.SignatureDataUrl) && dto.SignatureDataUrl.Trim().Length > 1_600_000)
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "SignatureDataUrl exceeds maximum allowed size (1.6 MB)"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.SignatureDataUrl) && !IsValidImageDataUrl(dto.SignatureDataUrl))
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "SignatureDataUrl must be a valid data:image/*;base64 value"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.StampDataUrl) && dto.StampDataUrl.Trim().Length > 1_600_000)
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "StampDataUrl exceeds maximum allowed size (1.6 MB)"
            });
        }

        if (!string.IsNullOrWhiteSpace(dto.StampDataUrl) && !IsValidImageDataUrl(dto.StampDataUrl))
        {
            return BadRequest(new ApiResponse<InvoicePdfSettingsDto>
            {
                Success = false,
                Message = "StampDataUrl must be a valid data:image/*;base64 value"
            });
        }

        if (custom is null || IsCustomizationEmpty(custom))
        {
            await _invoicePdfSettingsStore.DeleteRevendeurCustomizationAsync(revendeurId.Value, cancellationToken);
        }
        else
        {
            await _invoicePdfSettingsStore.SaveRevendeurCustomizationAsync(revendeurId.Value, custom, cancellationToken);
        }

        var defaults = InvoicePdfCustomization.FromOptions(_invoicePdfOptions.CurrentValue);
        var saved = await _invoicePdfSettingsStore.GetRevendeurCustomizationAsync(revendeurId.Value, cancellationToken);
        var effective = defaults.Merge(saved);

        return Ok(new ApiResponse<InvoicePdfSettingsDto>
        {
            Success = true,
            Message = "Invoice PDF settings saved",
            Data = MapInvoicePdfSettingsDto(effective, saved is not null)
        });
    }

    [HttpGet("invoice-settings")]
    public async Task<ActionResult<ApiResponse<GetInvoiceSettingsDto>>> GetInvoiceSettings()
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var settings = await _invoiceSettingsService.GetSettingsAsync(revendeurId.Value);

        return Ok(new ApiResponse<GetInvoiceSettingsDto>
        {
            Success = true,
            Message = "Invoice settings retrieved",
            Data = new GetInvoiceSettingsDto
            {
                CompanyName = settings?.CompanyName ?? string.Empty,
                HasLogo = settings?.LogoImage != null,
                HasSignature = settings?.SignatureImage != null
            }
        });
    }

    [HttpPut("invoice-settings")]
    public async Task<ActionResult<ApiResponse<GetInvoiceSettingsDto>>> UpdateInvoiceSettings(
        [FromForm] UpdateInvoiceSettingsFormRequest request)
    {
        try
        {
            if (!TryGetCurrentUser(out var currentUserId, out var role))
            {
                return Unauthorized();
            }

            if (role != UserRole.Revendeur)
            {
                return Forbid();
            }

            var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
            if (!revendeurId.HasValue)
            {
                _logger.LogWarning("Could not get revendeur ID for user {UserId}", currentUserId);
                return Forbid();
            }

            if (request == null)
            {
                _logger.LogWarning("Request is null");
                return BadRequest(new ApiResponse<GetInvoiceSettingsDto>
                {
                    Success = false,
                    Message = "Request is required"
                });
            }

            if (string.IsNullOrWhiteSpace(request.CompanyName))
            {
                _logger.LogWarning("Company name is empty for revendeur {RevendeurId}", revendeurId.Value);
                return BadRequest(new ApiResponse<GetInvoiceSettingsDto>
                {
                    Success = false,
                    Message = "Company name is required"
                });
            }

            var logoUploadError = ValidateInvoiceSettingsImageUpload(request.LogoFile, "Logo");
            if (!string.IsNullOrWhiteSpace(logoUploadError))
            {
                return BadRequest(new ApiResponse<GetInvoiceSettingsDto>
                {
                    Success = false,
                    Message = logoUploadError
                });
            }

            var signatureUploadError = ValidateInvoiceSettingsImageUpload(request.SignatureFile, "Signature");
            if (!string.IsNullOrWhiteSpace(signatureUploadError))
            {
                return BadRequest(new ApiResponse<GetInvoiceSettingsDto>
                {
                    Success = false,
                    Message = signatureUploadError
                });
            }

            _logger.LogInformation("Updating invoice settings for revendeur {RevendeurId}, CompanyName={CompanyName}",
                revendeurId.Value, request.CompanyName);

            // Get or create settings
            var settings = await _invoiceSettingsService.GetSettingsAsync(revendeurId.Value);

            if (settings == null)
            {
                _logger.LogInformation("Creating new invoice settings for revendeur {RevendeurId}", revendeurId.Value);
                settings = new RevendeurInvoiceSettings { RevendeurId = revendeurId.Value };
            }

            settings.CompanyName = request.CompanyName?.Trim() ?? string.Empty;

            // Process logo file
            if (request.LogoFile != null)
            {
                _logger.LogInformation("Processing logo file for revendeur {RevendeurId}, size={Size}",
                    revendeurId.Value, request.LogoFile.Length);

                using (var memoryStream = new MemoryStream())
                {
                    await request.LogoFile.CopyToAsync(memoryStream);
                    settings.LogoImage = memoryStream.ToArray();
                }
            }

            // Process signature file
            if (request.SignatureFile != null)
            {
                _logger.LogInformation("Processing signature file for revendeur {RevendeurId}, size={Size}",
                    revendeurId.Value, request.SignatureFile.Length);

                using (var memoryStream = new MemoryStream())
                {
                    await request.SignatureFile.CopyToAsync(memoryStream);
                    settings.SignatureImage = memoryStream.ToArray();
                }
            }

            _logger.LogInformation("Saving invoice settings for revendeur {RevendeurId}", revendeurId.Value);
            await _invoiceSettingsService.SaveSettingsAsync(revendeurId.Value, settings);

            _logger.LogInformation("Successfully saved invoice settings for revendeur {RevendeurId}", revendeurId.Value);

            return Ok(new ApiResponse<GetInvoiceSettingsDto>
            {
                Success = true,
                Message = "Invoice settings updated",
                Data = new GetInvoiceSettingsDto
                {
                    CompanyName = settings.CompanyName,
                    HasLogo = settings.LogoImage != null,
                    HasSignature = settings.SignatureImage != null
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating invoice settings");
            return StatusCode(500, new ApiResponse<GetInvoiceSettingsDto>
            {
                Success = false,
                Message = "Failed to save invoice settings."
            });
        }
    }

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadInvoicePdf(int id, [FromQuery] InvoicePdfCustomizationQuery? customization = null)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == id && i.RevendeurId == revendeurId.Value)
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r.User)
            .Include(i => i.SoldMotorcycles)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        // Use simplified customization: professional template with logo only
        var pdfCustomization = new InvoicePdfCustomization();

        // Get invoice settings for logo
        var invoiceSettings = await _invoiceSettingsService.GetSettingsAsync(revendeurId.Value);
        if (invoiceSettings?.LogoImage != null)
        {
            try
            {
                var base64Logo = Convert.ToBase64String(invoiceSettings.LogoImage);
                pdfCustomization.LogoDataUrl = $"data:image/png;base64,{base64Logo}";
            }
            catch
            {
                // If conversion fails, just skip the logo
            }
        }

        var bytes = InvoicePdfBuilder.Build(invoice, pdfCustomization);
        var fileName = BuildFactureFileName(invoice);

        return File(bytes, "application/pdf", fileName);
    }

    [HttpPost("preview-pdf")]
    public async Task<IActionResult> PreviewInvoicePdf([FromBody] CreateInvoiceDto dto, CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var revendeur = await _context.Revendeurs
            .AsNoTracking()
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == revendeurId.Value, cancellationToken);

        if (revendeur is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Revendeur not found"
            });
        }

        var soldDtos = GetSoldMotorcycleInputs(dto);
        if (soldDtos.Count == 0)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "At least one sold motorcycle is required"
            });
        }

        if (soldDtos.Count > 100)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Too many sold motorcycles in one invoice"
            });
        }

        var normalizedChassisNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var stockIds = soldDtos
            .Where(item => item.StockMotorcycleId.HasValue)
            .Select(item => item.StockMotorcycleId!.Value)
            .Distinct()
            .ToList();

        var stockById = stockIds.Count == 0
            ? new Dictionary<int, Motorcycle>()
            : await _context.Motorcycles
                .AsNoTracking()
                .Where(m => m.RevendeurId == revendeurId.Value && stockIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id, cancellationToken);

        foreach (var stockId in stockIds)
        {
            if (!stockById.ContainsKey(stockId))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Stock motorcycle not found"
                });
            }
        }

        var soldItems = new List<PreparedSoldMotorcycle>(soldDtos.Count);
        foreach (var soldDto in soldDtos)
        {
            var chassisNumber = NormalizeString(soldDto.ChassisNumber)?.ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(chassisNumber))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "ChassisNumber is required"
                });
            }

            if (!normalizedChassisNumbers.Add(chassisNumber))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = $"Duplicate chassis number in request: {chassisNumber}"
                });
            }

            Motorcycle? stock = null;
            if (soldDto.StockMotorcycleId.HasValue)
            {
                stockById.TryGetValue(soldDto.StockMotorcycleId.Value, out stock);
            }

            var company = NormalizeString(stock?.Company ?? soldDto.Company);
            var brand = NormalizeString(stock?.Brand ?? soldDto.Brand);
            var model = NormalizeString(stock?.Model ?? soldDto.Model);

            if (string.IsNullOrWhiteSpace(company) || string.IsNullOrWhiteSpace(brand) || string.IsNullOrWhiteSpace(model))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Company, Brand and Model are required"
                });
            }

            var purchasePrice = soldDto.PurchasePrice ?? stock?.PurchasePrice ?? 0m;
            var salePrice = soldDto.SalePrice ?? stock?.SalePrice ?? 0m;

            if (purchasePrice < 0m)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "PurchasePrice must be greater than or equal to 0"
                });
            }

            if (salePrice <= 0m)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "SalePrice must be greater than 0"
                });
            }

            soldItems.Add(new PreparedSoldMotorcycle
            {
                StockMotorcycleId = stock?.Id,
                Company = company,
                Brand = brand,
                Model = model,
                ChassisNumber = chassisNumber,
                PurchasePrice = purchasePrice,
                SalePrice = salePrice
            });
        }

        Client? client;
        if (dto.ClientId.HasValue && dto.ClientId.Value > 0)
        {
            client = await _context.Clients
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.ClientId.Value && c.RevendeurId == revendeurId.Value, cancellationToken);

            if (client is null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Client not found"
                });
            }
        }
        else if (dto.Client is not null)
        {
            var fullName = NormalizeString(dto.Client.FullName);
            var cin = NormalizeString(dto.Client.CIN)?.ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(cin))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Client full name and CIN are required"
                });
            }

            client = new Client
            {
                FullName = fullName,
                CIN = cin,
                Email = NormalizeString(dto.Client.Email),
                Phone = NormalizeString(dto.Client.Phone),
                Address = NormalizeString(dto.Client.Address) ?? string.Empty,
                City = NormalizeString(dto.Client.City) ?? string.Empty,
                RevendeurId = revendeurId.Value,
                Status = ClientStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
        }
        else
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "ClientId or Client data is required"
            });
        }

        var utcNow = DateTime.UtcNow;
        var previewInvoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber)
            ? await GenerateNextInvoiceNumberAsync(revendeurId.Value, cancellationToken)
            : dto.InvoiceNumber.Trim();

        var invoice = new Invoice
        {
            RevendeurId = revendeurId.Value,
            Revendeur = revendeur,
            ClientId = client.Id,
            Client = client,
            InvoiceNumber = previewInvoiceNumber,
            InvoiceDate = dto.InvoiceDate?.ToUniversalTime() ?? utcNow,
            Notes = NormalizeString(dto.Notes),
            Status = InvoiceStatus.Draft,
            CarteGriseStatus = CarteGriseStatus.PendingDocuments,
            TotalAmount = soldItems.Sum(item => item.SalePrice),
            CreatedAt = utcNow,
            UpdatedAt = utcNow
        };

        invoice.SoldMotorcycles = soldItems
            .Select((item, index) => new SoldMotorcycle
            {
                Id = index + 1,
                Invoice = invoice,
                RevendeurId = revendeurId.Value,
                Company = item.Company,
                Brand = item.Brand,
                Model = item.Model,
                ChassisNumber = item.ChassisNumber,
                PurchasePrice = item.PurchasePrice,
                SalePrice = item.SalePrice,
                CreatedAt = utcNow
            })
            .ToList();

        var pdfCustomization = new InvoicePdfCustomization();

        // Get invoice settings for logo
        var invoiceSettings = await _invoiceSettingsService.GetSettingsAsync(revendeurId.Value);
        if (invoiceSettings?.LogoImage != null)
        {
            try
            {
                var base64Logo = Convert.ToBase64String(invoiceSettings.LogoImage);
                pdfCustomization.LogoDataUrl = $"data:image/png;base64,{base64Logo}";
            }
            catch
            {
                // If conversion fails, just skip the logo
            }
        }

        var bytes = InvoicePdfBuilder.Build(invoice, pdfCustomization);
        var fileName = $"facture-preview-{utcNow:yyyyMMddHHmmss}.pdf";

        return File(bytes, "application/pdf", fileName);
    }

    [HttpGet("{id:int}/timeline")]
    public async Task<ActionResult<ApiResponse<List<InvoiceTimelineEventDto>>>> GetInvoiceTimeline(int id)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.Id == id)
            .Include(i => i.TimelineEvents)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<List<InvoiceTimelineEventDto>>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        if (!await CanAccessInvoiceAsync(invoice, role, currentUserId))
        {
            return Forbid();
        }

        var timeline = invoice.TimelineEvents
            .OrderByDescending(e => e.CreatedAt)
            .ThenByDescending(e => e.Id)
            .Select(MapTimelineEventDto)
            .ToList();

        return Ok(new ApiResponse<List<InvoiceTimelineEventDto>>
        {
            Success = true,
            Message = "Invoice timeline loaded",
            Data = timeline
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteInvoice(int id)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync(i => i.Id == id && i.RevendeurId == revendeurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var documentPaths = invoice.ClientPortalDocuments
            .Select(d => d.RelativePath)
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Cast<string>()
            .ToList();

        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync();

        foreach (var relativePath in documentPaths)
        {
            await _fileStorage.DeleteIfExistsAsync(relativePath, HttpContext.RequestAborted);
        }

        TryDeleteStorageDirectory(invoice.Id);

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Invoice deleted",
            Data = new { invoiceId = invoice.Id }
        });
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CreateInvoiceResultDto>>> Create([FromBody] CreateInvoiceDto dto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var effectiveSettings = await GetEffectiveRevendeurSettingsAsync(revendeurId.Value);
        var currentMonthInvoiceCount = await GetCurrentMonthInvoiceCountAsync(revendeurId.Value, DateTime.UtcNow);
        if (currentMonthInvoiceCount >= effectiveSettings.MonthlyInvoiceLimit)
        {
            return Conflict(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = $"Monthly invoice limit reached for {effectiveSettings.PlanTier} plan ({effectiveSettings.MonthlyInvoiceLimit})."
            });
        }

        var soldDtos = GetSoldMotorcycleInputs(dto);
        if (soldDtos.Count == 0)
        {
            return BadRequest(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = "At least one sold motorcycle is required"
            });
        }

        if (soldDtos.Count > 100)
        {
            return BadRequest(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = "Too many sold motorcycles in one invoice"
            });
        }

        var invoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber)
            ? await GenerateNextInvoiceNumberAsync(revendeurId.Value, HttpContext.RequestAborted)
            : dto.InvoiceNumber.Trim();

        var invoiceNumberExists = await _context.Invoices
            .AnyAsync(i => i.RevendeurId == revendeurId.Value && i.InvoiceNumber == invoiceNumber);

        if (invoiceNumberExists)
        {
            return Conflict(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = "Invoice number already exists"
            });
        }

        var normalizedChassisNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var stockUsageCounts = new Dictionary<int, int>();
        foreach (var soldDto in soldDtos)
        {
            var chassisNumber = NormalizeString(soldDto.ChassisNumber)?.ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(chassisNumber))
            {
                return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                {
                    Success = false,
                    Message = "ChassisNumber is required"
                });
            }

            if (!normalizedChassisNumbers.Add(chassisNumber))
            {
                return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                {
                    Success = false,
                    Message = $"Duplicate chassis number in request: {chassisNumber}"
                });
            }

            if (soldDto.StockMotorcycleId.HasValue)
            {
                var stockId = soldDto.StockMotorcycleId.Value;
                stockUsageCounts.TryGetValue(stockId, out var currentCount);
                stockUsageCounts[stockId] = currentCount + 1;
            }
        }

        var stockById = new Dictionary<int, Motorcycle>();
        if (stockUsageCounts.Count > 0)
        {
            var stockIds = stockUsageCounts.Keys.ToList();
            stockById = await _context.Motorcycles
                .AsNoTracking()
                .Where(m => m.RevendeurId == revendeurId.Value && stockIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id);

            foreach (var stockId in stockIds)
            {
                if (!stockById.ContainsKey(stockId))
                {
                    return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                    {
                        Success = false,
                        Message = "Stock motorcycle not found"
                    });
                }
            }

            foreach (var (stockId, requestedQty) in stockUsageCounts)
            {
                if (stockById[stockId].Qty < requestedQty)
                {
                    return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                    {
                        Success = false,
                        Message = "Stock not available"
                    });
                }
            }
        }

        var existingChassisInDb = await _context.SoldMotorcycles
            .AsNoTracking()
            .Where(s => s.RevendeurId == revendeurId.Value && normalizedChassisNumbers.Contains(s.ChassisNumber))
            .Select(s => s.ChassisNumber)
            .ToListAsync();

        if (existingChassisInDb.Count > 0)
        {
            var existingDisplay = string.Join(", ", existingChassisInDb
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(ch => ch));

            return Conflict(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = $"Chassis number already exists: {existingDisplay}"
            });
        }

        var soldItems = new List<PreparedSoldMotorcycle>(soldDtos.Count);
        foreach (var soldDto in soldDtos)
        {
            Motorcycle? stock = null;
            if (soldDto.StockMotorcycleId.HasValue)
            {
                stockById.TryGetValue(soldDto.StockMotorcycleId.Value, out stock);
            }

            var company = NormalizeString(stock?.Company ?? soldDto.Company);
            var brand = NormalizeString(stock?.Brand ?? soldDto.Brand);
            var model = NormalizeString(stock?.Model ?? soldDto.Model);
            var chassisNumber = NormalizeString(soldDto.ChassisNumber)?.ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(company) || string.IsNullOrWhiteSpace(brand) || string.IsNullOrWhiteSpace(model))
            {
                return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                {
                    Success = false,
                    Message = "Company, Brand and Model are required"
                });
            }

            if (string.IsNullOrWhiteSpace(chassisNumber))
            {
                return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                {
                    Success = false,
                    Message = "ChassisNumber is required"
                });
            }

            var purchasePrice = soldDto.PurchasePrice ?? stock?.PurchasePrice ?? 0m;
            var salePrice = soldDto.SalePrice ?? stock?.SalePrice ?? 0m;

            if (purchasePrice < 0m)
            {
                return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                {
                    Success = false,
                    Message = "PurchasePrice must be greater than or equal to 0"
                });
            }

            if (salePrice <= 0m)
            {
                return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                {
                    Success = false,
                    Message = "SalePrice must be greater than 0"
                });
            }

            soldItems.Add(new PreparedSoldMotorcycle
            {
                StockMotorcycleId = stock?.Id,
                Company = company,
                Brand = brand,
                Model = model,
                ChassisNumber = chassisNumber,
                PurchasePrice = purchasePrice,
                SalePrice = salePrice
            });
        }

        var (client, clientError) = await ResolveClientAsync(revendeurId.Value, dto, effectiveSettings.ActiveClientLimit);
        if (client is null)
        {
            return BadRequest(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = clientError ?? "Client data is invalid"
            });
        }

        var utcNow = DateTime.UtcNow;

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var (stockId, requestedQty) in stockUsageCounts)
            {
                var affectedRows = await _context.Motorcycles
                    .Where(m => m.Id == stockId && m.RevendeurId == revendeurId.Value && m.Qty >= requestedQty)
                    .ExecuteUpdateAsync(update => update
                        .SetProperty(m => m.Qty, m => m.Qty - requestedQty)
                        .SetProperty(m => m.UpdatedAt, utcNow));

                if (affectedRows == 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new ApiResponse<CreateInvoiceResultDto>
                    {
                        Success = false,
                        Message = "Stock not available"
                    });
                }
            }

            var invoice = new Invoice
            {
                RevendeurId = revendeurId.Value,
                Client = client,
                InvoiceNumber = invoiceNumber,
                ClientPortalAccessCode = GenerateClientPortalAccessCode(),
                InvoiceDate = dto.InvoiceDate?.ToUniversalTime() ?? utcNow,
                Notes = NormalizeString(dto.Notes),
                Status = InvoiceStatus.Draft,
                CarteGriseStatus = CarteGriseStatus.PendingDocuments,
                CarteGriseStatusUpdatedByUserId = currentUserId,
                CarteGriseStatusUpdatedAt = utcNow,
                TotalAmount = soldItems.Sum(item => item.SalePrice),
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            };

            var soldEntities = soldItems
                .Select(item => new SoldMotorcycle
                {
                    Invoice = invoice,
                    RevendeurId = revendeurId.Value,
                    StockMotorcycleId = item.StockMotorcycleId,
                    Company = item.Company,
                    Brand = item.Brand,
                    Model = item.Model,
                    ChassisNumber = item.ChassisNumber,
                    EngineNumber = null,
                    Matricule = null,
                    PurchasePrice = item.PurchasePrice,
                    SalePrice = item.SalePrice,
                    CreatedAt = utcNow
                })
                .ToList();

            invoice.TimelineEvents.Add(new InvoiceTimelineEvent
            {
                EventType = InvoiceTimelineEventType.InvoiceCreated,
                ActorUserId = currentUserId,
                ActorRole = UserRole.Revendeur,
                Title = "Dossier cree",
                Message = $"Dossier de vente cree pour {client.FullName} ({soldEntities.Count} moto(s))",
                CreatedAt = utcNow
            });

            _context.Invoices.Add(invoice);
            _context.SoldMotorcycles.AddRange(soldEntities);

            await _context.SaveChangesAsync();

            ApplyCarteGriseProgress(invoice);
            invoice.UpdatedAt = utcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            await TrySendInvoiceCreatedEmailAsync(client, invoice, HttpContext.RequestAborted);

            var created = new CreateInvoiceResultDto
            {
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                ClientPortalAccessCode = invoice.ClientPortalAccessCode,
                Status = invoice.Status,
                TotalAmount = invoice.TotalAmount
            };

            return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, new ApiResponse<CreateInvoiceResultDto>
            {
                Success = true,
                Message = "Invoice created",
                Data = created
            });
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            await transaction.RollbackAsync();

            return Conflict(new ApiResponse<CreateInvoiceResultDto>
            {
                Success = false,
                Message = "Invoice number or chassis number already exists"
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateStatus(int id, [FromBody] UpdateInvoiceStatusDto dto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        if (!Enum.IsDefined(dto.Status))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Invalid status"
            });
        }

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id && i.RevendeurId == revendeurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var previousStatus = invoice.Status;
        var now = DateTime.UtcNow;
        invoice.Status = dto.Status;
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.InvoiceStatusUpdated,
            ActorUserId = currentUserId,
            ActorRole = UserRole.Revendeur,
            Title = "Statut facture mis a jour",
            Message = $"Statut facture: {previousStatus} -> {invoice.Status}",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Status updated",
            Data = new { invoiceId = invoice.Id, status = invoice.Status }
        });
    }

    [HttpPatch("{id:int}/carte-grise/status")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateCarteGriseStatus(int id, [FromBody] UpdateCarteGriseStatusDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (!Enum.IsDefined(dto.Status))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Invalid carte grise status"
            });
        }

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        if (!await CanAccessInvoiceAsync(invoice, role, currentUserId))
        {
            return Forbid();
        }

        if (dto.Status == CarteGriseStatus.Delivered)
        {
            if (role != UserRole.Revendeur)
            {
                return Forbid();
            }

            if (invoice.CarteGriseStatus is not (CarteGriseStatus.Ready or CarteGriseStatus.Delivered))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Le dossier doit etre Pret avant de le marquer Livree"
                });
            }
        }

        var previousStatus = invoice.CarteGriseStatus;
        var now = DateTime.UtcNow;
        invoice.CarteGriseStatus = dto.Status;
        invoice.CarteGriseStatusUpdatedByUserId = currentUserId;
        invoice.CarteGriseStatusUpdatedAt = now;
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.CarteGriseStatusUpdated,
            ActorUserId = currentUserId,
            ActorRole = role,
            Title = "Statut carte grise mis a jour",
            Message = $"Statut carte grise: {ToCarteGriseStatusLabel(previousStatus)} -> {ToCarteGriseStatusLabel(dto.Status)}",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Carte grise status updated",
            Data = new
            {
                invoiceId = invoice.Id,
                carteGriseStatus = invoice.CarteGriseStatus,
                updatedAt = invoice.CarteGriseStatusUpdatedAt
            }
        });
    }

    [HttpPatch("{id:int}/carte-grise/document-issue")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateDocumentIssueMessage(int id, [FromBody] UpdateDocumentIssueMessageDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        if (!await CanAccessInvoiceAsync(invoice, role, currentUserId))
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        invoice.DocumentIssueMessage = NormalizeOptionalMessage(dto?.Message);
        invoice.DocumentIssueUpdatedByUserId = currentUserId;
        invoice.DocumentIssueUpdatedAt = now;
        invoice.UpdatedAt = now;

        var issueAction = string.IsNullOrWhiteSpace(invoice.DocumentIssueMessage)
            ? "Remarque dossier effacee"
            : "Remarque dossier mise a jour";

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.DocumentIssueUpdated,
            ActorUserId = currentUserId,
            ActorRole = role,
            Title = issueAction,
            Message = string.IsNullOrWhiteSpace(invoice.DocumentIssueMessage)
                ? "Aucune remarque active."
                : invoice.DocumentIssueMessage!,
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Document issue message updated",
            Data = new
            {
                invoiceId = invoice.Id,
                documentIssueMessage = invoice.DocumentIssueMessage,
                updatedAt = invoice.DocumentIssueUpdatedAt,
                updatedByUserId = invoice.DocumentIssueUpdatedByUserId
            }
        });
    }

    [HttpPatch("{id:int}/carte-grise/document-validation")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateDocumentValidation(int id, [FromBody] UpdateDocumentValidationDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        if (!await CanAccessInvoiceAsync(invoice, role, currentUserId))
        {
            return Forbid();
        }

        if (dto is null)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Payload is required"
            });
        }

        if (dto.SendChecklistToClient && role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var reasons = NormalizeValidationReasons(dto.Reasons);
        var checklist = NormalizeChecklistItems(dto.Checklist);
        var additionalMessage = NormalizeOptionalMessage(dto.AdditionalMessage);

        var now = DateTime.UtcNow;
        invoice.DocumentIssueReasonsJson = SerializeValidationReasons(reasons);
        invoice.DocumentFixChecklistJson = SerializeChecklistItems(checklist);
        invoice.DocumentIssueMessage = ComposeValidationIssueMessage(reasons, checklist, additionalMessage);
        invoice.DocumentIssueUpdatedByUserId = currentUserId;
        invoice.DocumentIssueUpdatedAt = now;
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.DocumentValidationChecklistUpdated,
            ActorUserId = currentUserId,
            ActorRole = role,
            Title = "Checklist de correction mis a jour",
            Message = BuildValidationTimelineSummary(reasons, checklist, additionalMessage),
            CreatedAt = now
        });

        if (dto.SendChecklistToClient)
        {
            invoice.ClientUpdateMessage = BuildClientChecklistMessage(reasons, checklist, additionalMessage);
            invoice.ClientUpdateUpdatedByUserId = currentUserId;
            invoice.ClientUpdateUpdatedAt = now;

            _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
            {
                InvoiceId = invoice.Id,
                EventType = InvoiceTimelineEventType.DocumentValidationChecklistPublishedToClient,
                ActorUserId = currentUserId,
                ActorRole = role,
                Title = "Checklist de correction envoye au client",
                Message = "Le client a recu les actions a corriger via le portail client.",
                CreatedAt = now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Document validation checklist updated",
            Data = new
            {
                invoiceId = invoice.Id,
                reasons,
                checklist,
                additionalMessage,
                documentIssueMessage = invoice.DocumentIssueMessage,
                sentToClient = dto.SendChecklistToClient,
                clientUpdateMessage = invoice.ClientUpdateMessage,
                updatedAt = now
            }
        });
    }

    [HttpPatch("{id:int}/carte-grise/client-message")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateClientUpdateMessage(int id, [FromBody] UpdateClientUpdateMessageDto dto)
    {
        if (!TryGetCurrentUser(out var currentUserId, out var role))
        {
            return Unauthorized();
        }

        if (role != UserRole.Revendeur)
        {
            return Forbid();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id && i.RevendeurId == revendeurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var now = DateTime.UtcNow;
        invoice.ClientUpdateMessage = NormalizeOptionalMessage(dto?.Message);
        invoice.ClientUpdateUpdatedByUserId = currentUserId;
        invoice.ClientUpdateUpdatedAt = now;
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.ClientMessageUpdated,
            ActorUserId = currentUserId,
            ActorRole = UserRole.Revendeur,
            Title = string.IsNullOrWhiteSpace(invoice.ClientUpdateMessage)
                ? "Message client retire"
                : "Message client publie",
            Message = string.IsNullOrWhiteSpace(invoice.ClientUpdateMessage)
                ? "Aucun message client."
                : invoice.ClientUpdateMessage!,
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Client update message updated",
            Data = new
            {
                invoiceId = invoice.Id,
                clientUpdateMessage = invoice.ClientUpdateMessage,
                updatedAt = invoice.ClientUpdateUpdatedAt,
                updatedByUserId = invoice.ClientUpdateUpdatedByUserId
            }
        });
    }

    [HttpPost("{id:int}/carte-grise/send-to-company")]
    public async Task<ActionResult<ApiResponse<object>>> SendDossierToCompany(int id, [FromBody] SendToFournisseurDto dto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        if (dto is null || dto.FournisseurId <= 0)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "FournisseurId is required"
            });
        }

        var invoice = await _context.Invoices
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync(i => i.Id == id && i.RevendeurId == revendeurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var hasLegacyCin = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);

        if (!hasCin || !hasDeclaration || !hasFacture)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Documents incomplets. CIN recto/verso, facture et declaration sont requis"
            });
        }

        var connectionAccepted = await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .AnyAsync(c =>
                c.RevendeurId == revendeurId.Value
                && c.FournisseurId == dto.FournisseurId
                && c.Status == PartnershipRequestStatus.Accepted);

        if (!connectionAccepted)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Fournisseur non connecte. Acceptez la demande de partenariat avant envoi."
            });
        }

        var fournisseur = await _context.Fournisseurs
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == dto.FournisseurId);

        if (fournisseur is null)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Fournisseur not found"
            });
        }

        var now = DateTime.UtcNow;
        invoice.AssignedFournisseurId = dto.FournisseurId;
        invoice.SentToFournisseurAt = now;
        invoice.CarteGriseStatus = CarteGriseStatus.InProgress;
        invoice.CarteGriseStatusUpdatedByUserId = currentUserId;
        invoice.CarteGriseStatusUpdatedAt = now;
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.DossierSentToFournisseur,
            ActorUserId = currentUserId,
            ActorRole = UserRole.Revendeur,
            Title = "Dossier envoye au fournisseur",
            Message = $"Transmission vers {fournisseur.BusinessName}",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Dossier envoye au fournisseur",
            Data = new
            {
                invoiceId = invoice.Id,
                carteGriseStatus = invoice.CarteGriseStatus,
                fournisseurId = fournisseur.Id,
                fournisseurBusinessName = fournisseur.BusinessName
            }
        });
    }

    [HttpPost("{id:int}/carte-grise/send-email")]
    public async Task<ActionResult<ApiResponse<object>>> SendDossierEmail(int id, [FromBody] SendDossierEmailDto dto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(dto.To))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Email destinataire requis"
            });
        }

        var recipient = dto.To.Trim();
        if (!IsValidEmail(recipient))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Email destinataire invalide"
            });
        }

        var invoice = await _context.Invoices
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r.User)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync(i => i.Id == id && i.RevendeurId == revendeurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var sold = invoice.SoldMotorcycles
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefault();

        var subject = string.IsNullOrWhiteSpace(dto.Subject)
            ? $"Dossier Carte Grise - {invoice.InvoiceNumber}"
            : dto.Subject.Trim();

        var htmlBody = BuildDossierEmailHtml(invoice, sold, dto.Message);
        var attachments = await BuildDossierEmailAttachmentsAsync(invoice, HttpContext.RequestAborted);
        try
        {
            await _emailSender.SendHtmlAsync(recipient, subject, htmlBody, attachments, HttpContext.RequestAborted);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch
        {
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Echec envoi email. Verifiez la configuration Resend."
            });
        }

        var eventAt = DateTime.UtcNow;
        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.DossierEmailSent,
            ActorUserId = currentUserId,
            ActorRole = UserRole.Revendeur,
            Title = "Email dossier envoye",
            Message = $"Email envoye a {recipient}",
            CreatedAt = eventAt
        });

        if (dto.MarkAsSentToCompany)
        {
            invoice.CarteGriseStatus = CarteGriseStatus.InProgress;
            invoice.CarteGriseStatusUpdatedByUserId = currentUserId;
            invoice.CarteGriseStatusUpdatedAt = eventAt;
            invoice.SentToFournisseurAt ??= eventAt;
            invoice.UpdatedAt = eventAt;
        }

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Email envoye avec succes",
            Data = new
            {
                invoiceId = invoice.Id,
                to = recipient
            }
        });
    }

    [HttpGet("fournisseur/carte-grise")]
    public async Task<ActionResult<ApiResponse<List<InvoiceDto>>>> GetFournisseurCarteGriseDossiers()
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var invoices = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.AssignedFournisseurId == fournisseurId.Value)
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r!.User)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .Include(i => i.TimelineEvents)
            .Include(i => i.AssignedFournisseur)
                .ThenInclude(f => f!.User)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync();

        return Ok(new ApiResponse<List<InvoiceDto>>
        {
            Success = true,
            Message = "Fournisseur dossiers loaded",
            Data = invoices.Select(MapInvoiceDto).ToList()
        });
    }

    [HttpGet("fournisseur/carte-grise/{id:int}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetFournisseurCarteGriseDossier(int id)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == id && i.AssignedFournisseurId == fournisseurId.Value)
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r!.User)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .Include(i => i.TimelineEvents)
            .Include(i => i.AssignedFournisseur)
                .ThenInclude(f => f!.User)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<InvoiceDto>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        return Ok(new ApiResponse<InvoiceDto>
        {
            Success = true,
            Message = "Fournisseur dossier loaded",
            Data = MapInvoiceDto(invoice)
        });
    }

    [HttpPost("{id:int}/documents")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<ActionResult<ApiResponse<InvoiceDocumentDto>>> UploadDocument(int id, [FromForm] UploadInvoiceDocumentForm form)
    {
        var uploadStopwatch = Stopwatch.StartNew();
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        if (form.File is null || form.File.Length <= 0)
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Fichier manquant"
            });
        }

        if (form.File.Length > MaxUploadBytes)
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Le fichier depasse 50 MB"
            });
        }

        if (!Enum.IsDefined(typeof(ClientPortalDocumentType), form.DocumentType))
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Type de document invalide"
            });
        }

        var documentType = (ClientPortalDocumentType)form.DocumentType;

        var extension = ResolveUploadExtension(form.File);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedDocumentExtensions.Contains(extension))
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = $"Format non supporte ({form.File.ContentType}). Utilisez PDF, PNG, JPG, WEBP, BMP, JFIF, HEIC/HEIF ou AVIF"
            });
        }

        var invoice = await _context.Invoices
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync(i => i.Id == id && i.RevendeurId == revendeurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var storageKey = ClientPortalStoragePaths.BuildRelativePath(invoice.Id, storedFileName);
        var tempFilePath = await CreateTemporaryUploadFileAsync(form.File, extension, HttpContext.RequestAborted);

        var now = DateTime.UtcNow;
        var storedFile = new ClientPortalStoredFile(
            SanitizeUploadFileName(form.File.FileName),
            storedFileName,
            string.IsNullOrWhiteSpace(form.File.ContentType) ? "application/octet-stream" : form.File.ContentType,
            form.File.Length,
            storageKey);
        var mutation = ClientPortalDocumentMutation.Upsert(
            invoice.ClientPortalDocuments,
            invoice.Id,
            documentType,
            storedFile,
            uploadedByClient: false,
            now);
        var existing = mutation.Document;

        if (mutation.DuplicateDocuments.Count > 0)
        {
            _context.ClientPortalDocuments.RemoveRange(mutation.DuplicateDocuments);
        }

        var autoReasons = await TryApplyAutomaticValidationAsync(
            invoice,
            documentType,
            tempFilePath,
            currentUserId,
            UserRole.Revendeur,
            now,
            HttpContext.RequestAborted);

        if (ShouldRejectUploadedDocument(documentType, autoReasons))
        {
            TryDeleteTemporaryFile(tempFilePath);

            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = BuildUploadRejectedMessage(documentType)
            });
        }

        await using (var storageStream = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            await _fileStorage.SaveAsync(storageKey, storageStream, storedFile.ContentType, HttpContext.RequestAborted);
        }

        var previousCarteGriseStatus = invoice.CarteGriseStatus;
        ApplyCarteGriseProgress(invoice);
        if (previousCarteGriseStatus != invoice.CarteGriseStatus)
        {
            invoice.CarteGriseStatusUpdatedByUserId = currentUserId;
            invoice.CarteGriseStatusUpdatedAt = now;
        }
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.DocumentUploadedByRevendeur,
            ActorUserId = currentUserId,
            ActorRole = UserRole.Revendeur,
            Title = "Document charge par revendeur",
            Message = $"{ToDocumentLabel(documentType)} ({existing.OriginalFileName})",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        await DeleteStoredFilesAsync(mutation.ReplacedRelativePath, mutation.DuplicateRelativePaths, HttpContext.RequestAborted);
        TryDeleteTemporaryFile(tempFilePath);
        uploadStopwatch.Stop();

        _logger.LogInformation(
            "Revendeur document upload stored for invoice {InvoiceId}. DocumentType={DocumentType}. SizeBytes={SizeBytes}. ContentType={ContentType}. OptimizationApplied={OptimizationApplied}. TotalMs={TotalMs}",
            invoice.Id,
            documentType,
            form.File.Length,
            storedFile.ContentType,
            false,
            uploadStopwatch.ElapsedMilliseconds);

        return Ok(new ApiResponse<InvoiceDocumentDto>
        {
            Success = true,
            Message = "Document charge",
            Data = new InvoiceDocumentDto
            {
                DocumentId = existing.Id,
                DocumentType = existing.DocumentType,
                FileName = existing.OriginalFileName,
                ContentType = existing.ContentType,
                SizeBytes = existing.SizeBytes,
                UploadedByClient = existing.UploadedByClient,
                UpdatedAt = existing.UpdatedAt
            }
        });
    }

    [HttpGet("{id:int}/documents/{documentId:int}/download")]
    public async Task<IActionResult> DownloadDocument(int id, int documentId)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.Id == id && i.RevendeurId == revendeurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Document not found"
            });
        }

        var stream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
        if (stream is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "File not found"
            });
        }

        return CreateAttachmentDocumentResponse(stream, document);
    }

    [HttpGet("{id:int}/documents/{documentId:int}/inline")]
    public async Task<IActionResult> PreviewDocumentInline(int id, int documentId)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.Id == id && i.RevendeurId == revendeurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Document not found"
            });
        }

        var stream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
        if (stream is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "File not found"
            });
        }

        return CreateInlineDocumentResponse(stream, document);
    }

    [HttpGet("{id:int}/documents/{documentId:int}/sas-url")]
    public async Task<ActionResult<ApiResponse<DocumentAccessUrlDto>>> GetDocumentSasUrl(int id, int documentId)
    {
        var authorizationStopwatch = Stopwatch.StartNew();
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
        if (!revendeurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.Id == id && i.RevendeurId == revendeurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();
        authorizationStopwatch.Stop();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Document not found"
            });
        }

        var accessStopwatch = Stopwatch.StartNew();
        var inlineUrl = Url.ActionLink(
            nameof(PreviewDocumentInline),
            values: new { id, documentId });
        var sasUri = await _fileStorage.GenerateSasUriAsync(
            document.RelativePath,
            TimeSpan.FromMinutes(10),
            HttpContext.RequestAborted);
        accessStopwatch.Stop();

        var resolvedUrl = sasUri?.ToString() ?? inlineUrl;
        if (string.IsNullOrWhiteSpace(resolvedUrl))
        {
            _logger.LogWarning("Failed to build preview access URL for revendeur document {DocumentId} in invoice {InvoiceId}", documentId, id);
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "File not found"
            });
        }

        _logger.LogInformation(
            "Prepared revendeur document access URL for invoice {InvoiceId} document {DocumentId}. DeliveryMode={DeliveryMode}. AuthMs={AuthMs}. AccessMs={AccessMs}. SizeBytes={SizeBytes}. ContentType={ContentType}",
            id,
            documentId,
            sasUri is null ? "inline-proxy" : "blob-sas",
            authorizationStopwatch.ElapsedMilliseconds,
            accessStopwatch.ElapsedMilliseconds,
            document.SizeBytes,
            document.ContentType);

        return Ok(new ApiResponse<DocumentAccessUrlDto>
        {
            Success = true,
            Data = new DocumentAccessUrlDto
            {
                Url = resolvedUrl,
                ExpiresIn = 600 // 10 minutes in seconds
            }
        });
    }

    [HttpPost("fournisseur/carte-grise/{id:int}/documents")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<ActionResult<ApiResponse<InvoiceDocumentDto>>> UploadDocumentAsFournisseur(int id, [FromForm] UploadInvoiceDocumentForm form)
    {
        var uploadStopwatch = Stopwatch.StartNew();
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        if (form.File is null || form.File.Length <= 0)
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Fichier manquant"
            });
        }

        if (form.File.Length > MaxUploadBytes)
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Le fichier depasse 50 MB"
            });
        }

        if (!Enum.IsDefined(typeof(ClientPortalDocumentType), form.DocumentType))
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Type de document invalide"
            });
        }

        var documentType = (ClientPortalDocumentType)form.DocumentType;
        var extension = ResolveUploadExtension(form.File);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedDocumentExtensions.Contains(extension))
        {
            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = $"Format non supporte ({form.File.ContentType}). Utilisez PDF, PNG, JPG, WEBP, BMP, JFIF, HEIC/HEIF ou AVIF"
            });
        }

        var invoice = await _context.Invoices
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync(i => i.Id == id && i.AssignedFournisseurId == fournisseurId.Value);

        if (invoice is null)
        {
            return NotFound(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var storageKey = ClientPortalStoragePaths.BuildRelativePath(invoice.Id, storedFileName);
        var tempFilePath = await CreateTemporaryUploadFileAsync(form.File, extension, HttpContext.RequestAborted);

        var now = DateTime.UtcNow;
        var storedFile = new ClientPortalStoredFile(
            SanitizeUploadFileName(form.File.FileName),
            storedFileName,
            string.IsNullOrWhiteSpace(form.File.ContentType) ? "application/octet-stream" : form.File.ContentType,
            form.File.Length,
            storageKey);
        var mutation = ClientPortalDocumentMutation.Upsert(
            invoice.ClientPortalDocuments,
            invoice.Id,
            documentType,
            storedFile,
            uploadedByClient: false,
            now);
        var existing = mutation.Document;

        if (mutation.DuplicateDocuments.Count > 0)
        {
            _context.ClientPortalDocuments.RemoveRange(mutation.DuplicateDocuments);
        }

        var autoReasons = await TryApplyAutomaticValidationAsync(
            invoice,
            documentType,
            tempFilePath,
            currentUserId,
            UserRole.Fournisseur,
            now,
            HttpContext.RequestAborted);

        if (ShouldRejectUploadedDocument(documentType, autoReasons))
        {
            TryDeleteTemporaryFile(tempFilePath);

            return BadRequest(new ApiResponse<InvoiceDocumentDto>
            {
                Success = false,
                Message = BuildUploadRejectedMessage(documentType)
            });
        }

        await using (var storageStream = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            await _fileStorage.SaveAsync(storageKey, storageStream, storedFile.ContentType, HttpContext.RequestAborted);
        }

        var previousCarteGriseStatus = invoice.CarteGriseStatus;
        ApplyCarteGriseProgress(invoice);
        if (previousCarteGriseStatus != invoice.CarteGriseStatus)
        {
            invoice.CarteGriseStatusUpdatedByUserId = currentUserId;
            invoice.CarteGriseStatusUpdatedAt = now;
        }
        invoice.UpdatedAt = now;

        _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
        {
            InvoiceId = invoice.Id,
            EventType = InvoiceTimelineEventType.DocumentUploadedByFournisseur,
            ActorUserId = currentUserId,
            ActorRole = UserRole.Fournisseur,
            Title = "Document charge par fournisseur",
            Message = $"{ToDocumentLabel(documentType)} ({existing.OriginalFileName})",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        await DeleteStoredFilesAsync(mutation.ReplacedRelativePath, mutation.DuplicateRelativePaths, HttpContext.RequestAborted);
        TryDeleteTemporaryFile(tempFilePath);
        uploadStopwatch.Stop();

        _logger.LogInformation(
            "Fournisseur document upload stored for invoice {InvoiceId}. DocumentType={DocumentType}. SizeBytes={SizeBytes}. ContentType={ContentType}. OptimizationApplied={OptimizationApplied}. TotalMs={TotalMs}",
            invoice.Id,
            documentType,
            form.File.Length,
            storedFile.ContentType,
            false,
            uploadStopwatch.ElapsedMilliseconds);

        return Ok(new ApiResponse<InvoiceDocumentDto>
        {
            Success = true,
            Message = "Document charge",
            Data = new InvoiceDocumentDto
            {
                DocumentId = existing.Id,
                DocumentType = existing.DocumentType,
                FileName = existing.OriginalFileName,
                ContentType = existing.ContentType,
                SizeBytes = existing.SizeBytes,
                UploadedByClient = existing.UploadedByClient,
                UpdatedAt = existing.UpdatedAt
            }
        });
    }

    [HttpGet("fournisseur/carte-grise/{id:int}/documents/{documentId:int}/download")]
    public async Task<IActionResult> DownloadDocumentAsFournisseur(int id, int documentId)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == id && i.AssignedFournisseurId == fournisseurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Document not found"
            });
        }

        var stream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
        if (stream is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "File not found"
            });
        }

        return CreateAttachmentDocumentResponse(stream, document);
    }

    [HttpGet("fournisseur/carte-grise/{id:int}/documents/{documentId:int}/inline")]
    public async Task<IActionResult> PreviewDocumentInlineAsFournisseur(int id, int documentId)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == id && i.AssignedFournisseurId == fournisseurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Document not found"
            });
        }

        var stream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
        if (stream is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "File not found"
            });
        }

        return CreateInlineDocumentResponse(stream, document);
    }

    [HttpGet("fournisseur/carte-grise/{id:int}/documents/{documentId:int}/sas-url")]
    public async Task<ActionResult<ApiResponse<DocumentAccessUrlDto>>> GetDocumentSasUrlAsFournisseur(int id, int documentId)
    {
        var authorizationStopwatch = Stopwatch.StartNew();
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == id && i.AssignedFournisseurId == fournisseurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();
        authorizationStopwatch.Stop();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Document not found"
            });
        }

        var accessStopwatch = Stopwatch.StartNew();
        var inlineUrl = Url.ActionLink(
            nameof(PreviewDocumentInlineAsFournisseur),
            values: new { id, documentId });
        var sasUri = await _fileStorage.GenerateSasUriAsync(
            document.RelativePath,
            TimeSpan.FromMinutes(10),
            HttpContext.RequestAborted);
        accessStopwatch.Stop();

        var resolvedUrl = sasUri?.ToString() ?? inlineUrl;
        if (string.IsNullOrWhiteSpace(resolvedUrl))
        {
            _logger.LogWarning("Failed to build preview access URL for fournisseur document {DocumentId} in invoice {InvoiceId}", documentId, id);
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "File not found"
            });
        }

        _logger.LogInformation(
            "Prepared fournisseur document access URL for invoice {InvoiceId} document {DocumentId}. DeliveryMode={DeliveryMode}. AuthMs={AuthMs}. AccessMs={AccessMs}. SizeBytes={SizeBytes}. ContentType={ContentType}",
            id,
            documentId,
            sasUri is null ? "inline-proxy" : "blob-sas",
            authorizationStopwatch.ElapsedMilliseconds,
            accessStopwatch.ElapsedMilliseconds,
            document.SizeBytes,
            document.ContentType);

        return Ok(new ApiResponse<DocumentAccessUrlDto>
        {
            Success = true,
            Data = new DocumentAccessUrlDto
            {
                Url = resolvedUrl,
                ExpiresIn = 600
            }
        });
    }

    [HttpGet("fournisseur/carte-grise/{id:int}/documents/download-all")]
    public async Task<IActionResult> DownloadAllDocumentsAsFournisseur(int id)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
        if (!fournisseurId.HasValue)
        {
            return Forbid();
        }

        var invoice = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.Id == id && i.AssignedFournisseurId == fournisseurId.Value)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Invoice not found"
            });
        }

        var documents = invoice.ClientPortalDocuments
            .OrderBy(d => d.DocumentType)
            .ThenByDescending(d => d.UpdatedAt)
            .ThenBy(d => d.Id)
            .ToList();

        if (documents.Count == 0)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Aucun document disponible"
            });
        }

        var zipStream = new MemoryStream();
        var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var filesAdded = 0;

        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var document in documents)
            {
                await using var fileStream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
                if (fileStream is null)
                {
                    continue;
                }

                var fallbackName = $"{SanitizeFileNameToken(ToDocumentLabel(document.DocumentType), "document")}-{document.Id}";
                var entryName = SanitizeZipEntryName(document.OriginalFileName, fallbackName);
                if (string.IsNullOrWhiteSpace(Path.GetExtension(entryName)))
                {
                    var extension = Path.GetExtension(document.StoredFileName);
                    if (!string.IsNullOrWhiteSpace(extension))
                    {
                        entryName = $"{entryName}{extension}";
                    }
                }

                var uniqueEntryName = EnsureUniqueEntryName(entryName, usedNames);
                var entry = archive.CreateEntry(uniqueEntryName, CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await fileStream.CopyToAsync(entryStream);
                filesAdded += 1;
            }
        }

        if (filesAdded == 0)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Aucun fichier disponible"
            });
        }

        zipStream.Position = 0;
        var archiveFileName = $"dossier-carte-grise-{SanitizeFileNameToken(invoice.InvoiceNumber, $"invoice-{invoice.Id}")}.zip";
        return File(zipStream, "application/zip", archiveFileName);
    }

    private IActionResult CreateAttachmentDocumentResponse(Stream stream, ClientPortalDocument document)
    {
        ApplyPrivateDocumentCacheHeaders(document.Id, document.UpdatedAt);
        return new FileStreamResult(stream, ResolveContentType(document.ContentType))
        {
            FileDownloadName = document.OriginalFileName,
            EnableRangeProcessing = true
        };
    }

    private IActionResult CreateInlineDocumentResponse(Stream stream, ClientPortalDocument document)
    {
        ApplyPrivateDocumentCacheHeaders(document.Id, document.UpdatedAt);
        Response.Headers["Content-Disposition"] = BuildInlineContentDisposition(document.OriginalFileName);

        return new FileStreamResult(stream, ResolveContentType(document.ContentType))
        {
            EnableRangeProcessing = true
        };
    }

    private void ApplyPrivateDocumentCacheHeaders(int documentId, DateTime updatedAt)
    {
        Response.Headers.CacheControl = "private, max-age=600, must-revalidate";
        Response.Headers.ETag = $"\"doc-{documentId}-{updatedAt.Ticks}\"";
    }

    private static string ResolveContentType(string? contentType)
    {
        return string.IsNullOrWhiteSpace(contentType)
            ? "application/octet-stream"
            : contentType;
    }

    private static string BuildInlineContentDisposition(string? fileName)
    {
        var safeFileName = string.IsNullOrWhiteSpace(fileName)
            ? $"document-{Guid.NewGuid():N}"
            : fileName;
        return $"inline; filename*=UTF-8''{Uri.EscapeDataString(safeFileName)}";
    }

    private async Task<int?> GetCurrentRevendeurIdAsync(int currentUserId)
    {
        return await _context.Revendeurs
            .Where(r => r.UserId == currentUserId)
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<int?> GetCurrentFournisseurIdAsync(int currentUserId)
    {
        return await _context.Fournisseurs
            .Where(f => f.UserId == currentUserId)
            .Select(f => (int?)f.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<RevendeurSettingsPolicy.EffectiveRevendeurSettings> GetEffectiveRevendeurSettingsAsync(int revendeurId)
    {
        var settings = await _context.RevendeurSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RevendeurId == revendeurId);

        return RevendeurSettingsPolicy.BuildEffective(settings);
    }

    private async Task<int> GetCurrentMonthInvoiceCountAsync(int revendeurId, DateTime nowUtc)
    {
        var utcNow = NormalizeUtc(nowUtc);
        var periodStart = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1);

        return await _context.Invoices
            .AsNoTracking()
            .CountAsync(i =>
                i.RevendeurId == revendeurId
                && i.CreatedAt >= periodStart
                && i.CreatedAt < periodEnd);
    }

    private async Task<int> GetActiveClientCountAsync(int revendeurId)
    {
        return await _context.Clients
            .AsNoTracking()
            .CountAsync(c =>
                c.RevendeurId == revendeurId
                && c.Status != ClientStatus.Missing);
    }

    private async Task<bool> CanAccessInvoiceAsync(Invoice invoice, UserRole role, int currentUserId)
    {
        if (role == UserRole.Revendeur)
        {
            var revendeurId = await GetCurrentRevendeurIdAsync(currentUserId);
            return revendeurId.HasValue && invoice.RevendeurId == revendeurId.Value;
        }

        if (role == UserRole.Fournisseur)
        {
            var fournisseurId = await GetCurrentFournisseurIdAsync(currentUserId);
            return fournisseurId.HasValue && invoice.AssignedFournisseurId == fournisseurId.Value;
        }

        return false;
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static DateTime? NormalizeUtc(DateTime? value)
    {
        return value.HasValue ? NormalizeUtc(value.Value) : null;
    }

    private static void ApplyCarteGriseProgress(Invoice invoice)
    {
        var hasLegacyCin = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);

        if (hasCin && hasDeclaration && hasFacture && invoice.CarteGriseStatus == CarteGriseStatus.PendingDocuments)
        {
            invoice.CarteGriseStatus = CarteGriseStatus.DocumentsReceived;
        }
        else if ((!hasCin || !hasDeclaration || !hasFacture) && invoice.CarteGriseStatus == CarteGriseStatus.DocumentsReceived)
        {
            invoice.CarteGriseStatus = CarteGriseStatus.PendingDocuments;
        }
    }

    private async Task<InvoicePdfCustomization> BuildInvoicePdfCustomizationAsync(
        int revendeurId,
        InvoicePdfCustomizationQuery? query,
        CancellationToken cancellationToken = default)
    {
        var defaults = InvoicePdfCustomization.FromOptions(_invoicePdfOptions.CurrentValue);
        var custom = await _invoicePdfSettingsStore.GetRevendeurCustomizationAsync(revendeurId, cancellationToken);
        var merged = defaults.Merge(custom);
        var overrides = query is null
            ? null
            : MapQueryToCustomization(query);

        return merged.Merge(overrides);
    }

    private async Task<string> GenerateNextInvoiceNumberAsync(int revendeurId, CancellationToken cancellationToken = default)
    {
        var numbering = await GetInvoiceNumberingSettingsAsync(revendeurId, cancellationToken);
        var existingNumbers = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.RevendeurId == revendeurId)
            .Select(i => i.InvoiceNumber)
            .ToListAsync(cancellationToken);

        var maxSequenceIndex = -1;
        var usedValues = new HashSet<int>();

        foreach (var existingNumber in existingNumbers)
        {
            if (!TryExtractInvoiceNumberSequenceValue(existingNumber, numbering.Prefix, out var parsedValue))
            {
                continue;
            }

            if (parsedValue < numbering.Start)
            {
                continue;
            }

            usedValues.Add(parsedValue);
            var sequenceIndex = (parsedValue - numbering.Start) / InvoiceNumberIncrementStep;
            if (sequenceIndex > maxSequenceIndex)
            {
                maxSequenceIndex = sequenceIndex;
            }
        }

        var nextValue = numbering.Start;
        if (maxSequenceIndex >= 0)
        {
            var candidate = numbering.Start + ((maxSequenceIndex + 1) * InvoiceNumberIncrementStep);
            if (candidate > 0)
            {
                nextValue = candidate;
            }
        }

        while (usedValues.Contains(nextValue))
        {
            nextValue += InvoiceNumberIncrementStep;
        }

        return ComposeInvoiceNumber(numbering.Prefix, nextValue);
    }

    private async Task<InvoiceNumberingSettings> GetInvoiceNumberingSettingsAsync(int revendeurId, CancellationToken cancellationToken = default)
    {
        var defaults = InvoicePdfCustomization.FromOptions(_invoicePdfOptions.CurrentValue);
        var custom = await _invoicePdfSettingsStore.GetRevendeurCustomizationAsync(revendeurId, cancellationToken);
        var effective = defaults.Merge(custom);

        return new InvoiceNumberingSettings
        {
            Prefix = NormalizeInvoiceNumberPrefix(effective.InvoiceNumberPrefix),
            Start = NormalizeInvoiceNumberStart(effective.InvoiceNumberStart)
        };
    }

    private static string NormalizeInvoiceNumberPrefix(string? value)
    {
        var normalized = TrimToMaxLength(value, 16);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return InvoiceNumberPrefixDefault;
        }

        var trimmed = normalized.Trim();
        // Treat legacy default prefix "U" as no prefix so invoice numbers stay numeric.
        return string.Equals(trimmed, "U", StringComparison.OrdinalIgnoreCase) ? string.Empty : trimmed;
    }

    private static int NormalizeInvoiceNumberStart(int? value)
    {
        return value is > 0 ? value.Value : InvoiceNumberStartDefault;
    }

    private static string ComposeInvoiceNumber(string prefix, int sequenceValue)
    {
        var safePrefix = NormalizeInvoiceNumberPrefix(prefix);
        var safeValue = sequenceValue > 0 ? sequenceValue : InvoiceNumberStartDefault;
        return $"{safePrefix}{safeValue}";
    }

    private static bool TryExtractInvoiceNumberSequenceValue(string? invoiceNumber, string prefix, out int value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(invoiceNumber))
        {
            return false;
        }

        var normalizedPrefix = NormalizeInvoiceNumberPrefix(prefix);
        var normalizedNumber = invoiceNumber.Trim();
        if (!normalizedNumber.StartsWith(normalizedPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var suffix = normalizedNumber[normalizedPrefix.Length..].TrimStart('-', '_', '/', '#', ' ');
        if (string.IsNullOrWhiteSpace(suffix) || !suffix.All(char.IsDigit))
        {
            return false;
        }

        return int.TryParse(suffix, out value) && value > 0;
    }

    private async Task<byte[]> BuildInvoicePdfBytesAsync(int invoiceId, int revendeurId)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.Id == invoiceId && i.RevendeurId == revendeurId)
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r.User)
            .Include(i => i.SoldMotorcycles)
            .FirstOrDefaultAsync();

        if (invoice is null)
        {
            throw new InvalidOperationException("Invoice not found while generating facture PDF");
        }

        // Use simplified customization with professional template + logo
        var customization = new InvoicePdfCustomization();

        var invoiceSettings = await _invoiceSettingsService.GetSettingsAsync(revendeurId);
        if (invoiceSettings?.LogoImage != null)
        {
            try
            {
                var base64Logo = Convert.ToBase64String(invoiceSettings.LogoImage);
                customization.LogoDataUrl = $"data:image/png;base64,{base64Logo}";
            }
            catch
            {
                // If conversion fails, just skip the logo
            }
        }

        return InvoicePdfBuilder.Build(invoice, customization);
    }

    private static string? TrimToMaxLength(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength
            ? trimmed
            : trimmed[..maxLength];
    }

    private static double? NormalizeLayoutValue(double? value, double min, double max)
    {
        if (!value.HasValue || double.IsNaN(value.Value) || double.IsInfinity(value.Value))
        {
            return null;
        }

        return Math.Clamp(value.Value, min, max);
    }

    private static string? NormalizeFontFamily(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return IsSupportedFontFamily(normalized)
            ? normalized
            : null;
    }

    private static bool IsSupportedFontFamily(string value)
    {
        return value.Equals("Helvetica", StringComparison.OrdinalIgnoreCase)
            || value.Equals("Times", StringComparison.OrdinalIgnoreCase)
            || value.Equals("Courier", StringComparison.OrdinalIgnoreCase);
    }

    private static string? NormalizeLogoDataUrl(string? value)
    {
        var trimmed = TrimToMaxLength(value, 1_600_000);
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return null;
        }

        return IsValidImageDataUrl(trimmed)
            ? trimmed
            : null;
    }

    private static bool IsValidImageDataUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var normalized = value.Trim();
        if (!normalized.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var markerIndex = normalized.IndexOf(";base64,", StringComparison.OrdinalIgnoreCase);
        if (markerIndex <= 11 || markerIndex + 8 >= normalized.Length)
        {
            return false;
        }

        var payload = normalized[(markerIndex + 8)..];
        try
        {
            Convert.FromBase64String(payload);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static List<InvoicePdfCustomElement>? NormalizeCustomElements(IEnumerable<InvoicePdfCustomElementDto>? elements)
    {
        if (elements is null)
        {
            return null;
        }

        var prepared = new List<(InvoicePdfCustomElement Element, int RequestedZIndex, int Sequence)>();
        var usedIds = new HashSet<string>(StringComparer.Ordinal);
        var sequence = 0;

        static string NormalizeHexColor(string? rawValue, string fallback)
        {
            var trimmed = TrimToMaxLength(rawValue, 16);
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return fallback;
            }

            return IsValidHexColor(trimmed) ? trimmed : fallback;
        }

        foreach (var element in elements)
        {
            if (prepared.Count >= MaxCustomElements)
            {
                break;
            }

            var width = NormalizeLayoutValue(element.Width, 60, 560) ?? 220;
            var height = NormalizeLayoutValue(element.Height, 20, 300) ?? 36;
            var maxX = Math.Max(10, PdfPageWidth - width - 10);
            var minY = Math.Min(PdfPageHeight - 10, height + 10);
            var x = NormalizeLayoutValue(element.X, 10, maxX) ?? 60;
            var y = NormalizeLayoutValue(element.Y, minY, PdfPageHeight - 10) ?? 760;
            var fontSize = NormalizeLayoutValue(element.FontSize, 7, 36) ?? 10;
            var strokeWidth = NormalizeLayoutValue(element.StrokeWidth, 0.4, 12) ?? 1;
            var id = TrimToMaxLength(element.Id, 64);
            var type = NormalizeCustomElementType(element.Type);
            var text = TrimToMaxLength(element.Text, 240) ?? string.Empty;
            var colorHex = NormalizeHexColor(element.ColorHex, "#111827");
            var backgroundColorHex = NormalizeHexColor(element.BackgroundColorHex, "#FFFFFF");
            var strokeColorHex = NormalizeHexColor(element.StrokeColorHex, "#111827");
            var srcDataUrl = NormalizeLogoDataUrl(element.SrcDataUrl) ?? string.Empty;
            if (type is not ("image" or "signature" or "stamp"))
            {
                srcDataUrl = string.Empty;
            }

            var requestedZIndex = element.ZIndex is > 0 ? element.ZIndex.Value : sequence + 1;
            if (string.IsNullOrWhiteSpace(id))
            {
                id = $"el-{sequence + 1}";
            }

            if (!usedIds.Add(id))
            {
                continue;
            }

            prepared.Add((new InvoicePdfCustomElement
            {
                Id = id,
                Type = type,
                Text = text,
                X = x,
                Y = y,
                Width = width,
                Height = height,
                FontSize = fontSize,
                ColorHex = colorHex,
                BackgroundColorHex = backgroundColorHex,
                StrokeColorHex = strokeColorHex,
                StrokeWidth = strokeWidth,
                SrcDataUrl = srcDataUrl,
                Bold = element.Bold,
                Italic = element.Italic,
                Align = type == "text" ? NormalizeCustomElementAlign(element.Align) : "left",
                Visible = element.Visible
            }, requestedZIndex, sequence));

            sequence++;
        }

        return prepared
            .OrderBy(item => item.RequestedZIndex)
            .ThenBy(item => item.Sequence)
            .Select((item, index) =>
            {
                item.Element.ZIndex = index + 1;
                return item.Element;
            })
            .ToList();
    }

    private static string NormalizeCustomElementType(string? value)
    {
        var normalized = TrimToMaxLength(value, 16);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "text";
        }

        normalized = normalized.Trim().ToLowerInvariant();
        return AllowedCustomElementTypes.Contains(normalized) ? normalized : "text";
    }

    private static string NormalizeCustomElementAlign(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "left";
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "center" or "right" ? normalized : "left";
    }

    private static InvoicePdfCustomization MapUpdateDtoToCustomization(UpdateInvoicePdfSettingsDto dto)
    {
        return new InvoicePdfCustomization
        {
            BrandName = TrimToMaxLength(dto.BrandName, 40),
            BrandTagline = TrimToMaxLength(dto.BrandTagline, 80),
            DocumentTitle = TrimToMaxLength(dto.DocumentTitle, 40),
            SellerBlockTitle = TrimToMaxLength(dto.SellerBlockTitle, 32),
            ClientBlockTitle = TrimToMaxLength(dto.ClientBlockTitle, 32),
            InvoiceDateLabel = TrimToMaxLength(dto.InvoiceDateLabel, 48),
            InvoiceNumberLabel = TrimToMaxLength(dto.InvoiceNumberLabel, 48),
            InvoiceNumberPrefix = NormalizeInvoiceNumberPrefix(TrimToMaxLength(dto.InvoiceNumberPrefix, 16)),
            InvoiceNumberStart = dto.InvoiceNumberStart is > 0 ? dto.InvoiceNumberStart : null,
            DueDateLabel = TrimToMaxLength(dto.DueDateLabel, 48),
            PaymentLabel = TrimToMaxLength(dto.PaymentLabel, 48),
            ReferenceLabel = TrimToMaxLength(dto.ReferenceLabel, 48),
            AdditionalInfoLabel = TrimToMaxLength(dto.AdditionalInfoLabel, 80),
            AdditionalInfoValue = TrimToMaxLength(dto.AdditionalInfoValue, 220),
            PaymentTermText = TrimToMaxLength(dto.PaymentTermText, 64),
            ReferencePrefix = TrimToMaxLength(dto.ReferencePrefix, 20),
            DueInDays = dto.DueInDays is > 0 ? dto.DueInDays : null,
            DefaultUnit = TrimToMaxLength(dto.DefaultUnit, 16),
            TableHeaderDescription = TrimToMaxLength(dto.TableHeaderDescription, 32),
            TableHeaderQuantity = TrimToMaxLength(dto.TableHeaderQuantity, 24),
            TableHeaderUnit = TrimToMaxLength(dto.TableHeaderUnit, 24),
            TableHeaderUnitPrice = TrimToMaxLength(dto.TableHeaderUnitPrice, 32),
            TableHeaderTaxRate = TrimToMaxLength(dto.TableHeaderTaxRate, 24),
            TableHeaderTaxAmount = TrimToMaxLength(dto.TableHeaderTaxAmount, 32),
            TableHeaderTotal = TrimToMaxLength(dto.TableHeaderTotal, 24),
            TotalsSubtotalLabel = TrimToMaxLength(dto.TotalsSubtotalLabel, 40),
            TotalsTaxLabel = TrimToMaxLength(dto.TotalsTaxLabel, 40),
            TotalsTotalLabel = TrimToMaxLength(dto.TotalsTotalLabel, 40),
            FooterColumn1Title = TrimToMaxLength(dto.FooterColumn1Title, 64),
            FooterColumn2Title = TrimToMaxLength(dto.FooterColumn2Title, 64),
            FooterColumn3Title = TrimToMaxLength(dto.FooterColumn3Title, 64),
            FooterColumn1Line1 = TrimToMaxLength(dto.FooterColumn1Line1, 120),
            FooterColumn1Line2 = TrimToMaxLength(dto.FooterColumn1Line2, 120),
            FooterColumn1Line3 = TrimToMaxLength(dto.FooterColumn1Line3, 120),
            FooterColumn2Line1 = TrimToMaxLength(dto.FooterColumn2Line1, 120),
            FooterColumn2Line2 = TrimToMaxLength(dto.FooterColumn2Line2, 120),
            FooterColumn2Line3 = TrimToMaxLength(dto.FooterColumn2Line3, 120),
            FooterColumn3Line1 = TrimToMaxLength(dto.FooterColumn3Line1, 120),
            FooterColumn3Line2 = TrimToMaxLength(dto.FooterColumn3Line2, 120),
            FooterColumn3Line3 = TrimToMaxLength(dto.FooterColumn3Line3, 120),
            FontFamily = NormalizeFontFamily(dto.FontFamily),
            TitleFontSize = NormalizeLayoutValue(dto.TitleFontSize, 24, 64),
            HeadingFontSize = NormalizeLayoutValue(dto.HeadingFontSize, 8, 18),
            BodyFontSize = NormalizeLayoutValue(dto.BodyFontSize, 7, 16),
            SmallFontSize = NormalizeLayoutValue(dto.SmallFontSize, 6, 14),
            LogoDataUrl = NormalizeLogoDataUrl(dto.LogoDataUrl),
            SignatureDataUrl = NormalizeLogoDataUrl(dto.SignatureDataUrl),
            StampDataUrl = NormalizeLogoDataUrl(dto.StampDataUrl),
            LogoX = NormalizeLayoutValue(dto.LogoX, 10, 540),
            LogoY = NormalizeLayoutValue(dto.LogoY, 680, 780),
            LogoSize = NormalizeLayoutValue(dto.LogoSize, 40, 140),
            SellerBlockX = NormalizeLayoutValue(dto.SellerBlockX, 10, 355),
            SellerBlockY = NormalizeLayoutValue(dto.SellerBlockY, 560, 720),
            SellerBlockWidth = NormalizeLayoutValue(dto.SellerBlockWidth, 150, 320),
            ClientBlockX = NormalizeLayoutValue(dto.ClientBlockX, 10, 355),
            ClientBlockY = NormalizeLayoutValue(dto.ClientBlockY, 500, 700),
            ClientBlockWidth = NormalizeLayoutValue(dto.ClientBlockWidth, 150, 320),
            MetadataX = NormalizeLayoutValue(dto.MetadataX, 10, 295),
            MetadataY = NormalizeLayoutValue(dto.MetadataY, 440, 640),
            MetadataWidth = NormalizeLayoutValue(dto.MetadataWidth, 260, 560),
            AdditionalInfoX = NormalizeLayoutValue(dto.AdditionalInfoX, 10, 295),
            AdditionalInfoY = NormalizeLayoutValue(dto.AdditionalInfoY, 390, 580),
            AdditionalInfoWidth = NormalizeLayoutValue(dto.AdditionalInfoWidth, 260, 560),
            TableX = NormalizeLayoutValue(dto.TableX, 10, 295),
            TableY = NormalizeLayoutValue(dto.TableY, 290, 520),
            TableWidth = NormalizeLayoutValue(dto.TableWidth, 280, 560),
            TotalsX = NormalizeLayoutValue(dto.TotalsX, 120, 470),
            TotalsY = NormalizeLayoutValue(dto.TotalsY, 120, 250),
            TotalsWidth = NormalizeLayoutValue(dto.TotalsWidth, 120, 240),
            TotalWordsX = NormalizeLayoutValue(dto.TotalWordsX, 10, 435),
            TotalWordsY = NormalizeLayoutValue(dto.TotalWordsY, 78, 250),
            TotalWordsWidth = NormalizeLayoutValue(dto.TotalWordsWidth, 160, 560),
            SignatureBlockX = NormalizeLayoutValue(dto.SignatureBlockX, 10, 445),
            SignatureBlockY = NormalizeLayoutValue(dto.SignatureBlockY, 78, 220),
            SignatureBlockWidth = NormalizeLayoutValue(dto.SignatureBlockWidth, 140, 560),
            FooterY = NormalizeLayoutValue(dto.FooterY, 78, 170),
            FooterWidth = NormalizeLayoutValue(dto.FooterWidth, 260, 560),
            AccentColorHex = TrimToMaxLength(dto.AccentColorHex, 16),
            PageBackgroundHex = TrimToMaxLength(dto.PageBackgroundHex, 16),
            BodyTextColorHex = TrimToMaxLength(dto.BodyTextColorHex, 16),
            MutedTextColorHex = TrimToMaxLength(dto.MutedTextColorHex, 16),
            DividerColorHex = TrimToMaxLength(dto.DividerColorHex, 16),
            TableHeaderBackgroundHex = TrimToMaxLength(dto.TableHeaderBackgroundHex, 16),
            TableHeaderTextColorHex = TrimToMaxLength(dto.TableHeaderTextColorHex, 16),
            TableBorderColorHex = TrimToMaxLength(dto.TableBorderColorHex, 16),
            TableAlternateRowColorHex = TrimToMaxLength(dto.TableAlternateRowColorHex, 16),
            ServiceTitle = TrimToMaxLength(dto.ServiceTitle, 64),
            FooterTitle = TrimToMaxLength(dto.FooterTitle, 64),
            FooterLine1 = TrimToMaxLength(dto.FooterLine1, 160),
            FooterLine2 = TrimToMaxLength(dto.FooterLine2, 160),
            ShowHeader = dto.ShowHeader,
            ShowLogo = dto.ShowLogo,
            ShowSellerBlock = dto.ShowSellerBlock,
            ShowClientBlock = dto.ShowClientBlock,
            ShowMetadata = dto.ShowMetadata,
            ShowAdditionalInfo = dto.ShowAdditionalInfo,
            ShowTable = dto.ShowTable,
            ShowTotals = dto.ShowTotals,
            ShowFooter = dto.ShowFooter,
            ShowTotalInWords = dto.ShowTotalInWords,
            TotalInWordsLabel = TrimToMaxLength(dto.TotalInWordsLabel, 120),
            CustomElements = NormalizeCustomElements(dto.CustomElements)
        };
    }

    private static InvoicePdfCustomization MapQueryToCustomization(InvoicePdfCustomizationQuery query)
    {
        return new InvoicePdfCustomization
        {
            BrandName = TrimToMaxLength(query.BrandName, 40),
            BrandTagline = TrimToMaxLength(query.BrandTagline, 80),
            DocumentTitle = TrimToMaxLength(query.DocumentTitle, 40),
            SellerBlockTitle = TrimToMaxLength(query.SellerBlockTitle, 32),
            ClientBlockTitle = TrimToMaxLength(query.ClientBlockTitle, 32),
            InvoiceDateLabel = TrimToMaxLength(query.InvoiceDateLabel, 48),
            InvoiceNumberLabel = TrimToMaxLength(query.InvoiceNumberLabel, 48),
            InvoiceNumberPrefix = NormalizeInvoiceNumberPrefix(TrimToMaxLength(query.InvoiceNumberPrefix, 16)),
            InvoiceNumberStart = query.InvoiceNumberStart is > 0 ? query.InvoiceNumberStart : null,
            DueDateLabel = TrimToMaxLength(query.DueDateLabel, 48),
            PaymentLabel = TrimToMaxLength(query.PaymentLabel, 48),
            ReferenceLabel = TrimToMaxLength(query.ReferenceLabel, 48),
            AdditionalInfoLabel = TrimToMaxLength(query.AdditionalInfoLabel, 80),
            AdditionalInfoValue = TrimToMaxLength(query.AdditionalInfoValue, 220),
            PaymentTermText = TrimToMaxLength(query.PaymentTermText, 64),
            ReferencePrefix = TrimToMaxLength(query.ReferencePrefix, 20),
            DueInDays = query.DueInDays is > 0 ? query.DueInDays : null,
            DefaultUnit = TrimToMaxLength(query.DefaultUnit, 16),
            TableHeaderDescription = TrimToMaxLength(query.TableHeaderDescription, 32),
            TableHeaderQuantity = TrimToMaxLength(query.TableHeaderQuantity, 24),
            TableHeaderUnit = TrimToMaxLength(query.TableHeaderUnit, 24),
            TableHeaderUnitPrice = TrimToMaxLength(query.TableHeaderUnitPrice, 32),
            TableHeaderTaxRate = TrimToMaxLength(query.TableHeaderTaxRate, 24),
            TableHeaderTaxAmount = TrimToMaxLength(query.TableHeaderTaxAmount, 32),
            TableHeaderTotal = TrimToMaxLength(query.TableHeaderTotal, 24),
            TotalsSubtotalLabel = TrimToMaxLength(query.TotalsSubtotalLabel, 40),
            TotalsTaxLabel = TrimToMaxLength(query.TotalsTaxLabel, 40),
            TotalsTotalLabel = TrimToMaxLength(query.TotalsTotalLabel, 40),
            FooterColumn1Title = TrimToMaxLength(query.FooterColumn1Title, 64),
            FooterColumn2Title = TrimToMaxLength(query.FooterColumn2Title, 64),
            FooterColumn3Title = TrimToMaxLength(query.FooterColumn3Title, 64),
            FooterColumn1Line1 = TrimToMaxLength(query.FooterColumn1Line1, 120),
            FooterColumn1Line2 = TrimToMaxLength(query.FooterColumn1Line2, 120),
            FooterColumn1Line3 = TrimToMaxLength(query.FooterColumn1Line3, 120),
            FooterColumn2Line1 = TrimToMaxLength(query.FooterColumn2Line1, 120),
            FooterColumn2Line2 = TrimToMaxLength(query.FooterColumn2Line2, 120),
            FooterColumn2Line3 = TrimToMaxLength(query.FooterColumn2Line3, 120),
            FooterColumn3Line1 = TrimToMaxLength(query.FooterColumn3Line1, 120),
            FooterColumn3Line2 = TrimToMaxLength(query.FooterColumn3Line2, 120),
            FooterColumn3Line3 = TrimToMaxLength(query.FooterColumn3Line3, 120),
            FontFamily = NormalizeFontFamily(query.FontFamily),
            TitleFontSize = NormalizeLayoutValue(query.TitleFontSize, 24, 64),
            HeadingFontSize = NormalizeLayoutValue(query.HeadingFontSize, 8, 18),
            BodyFontSize = NormalizeLayoutValue(query.BodyFontSize, 7, 16),
            SmallFontSize = NormalizeLayoutValue(query.SmallFontSize, 6, 14),
            LogoDataUrl = NormalizeLogoDataUrl(query.LogoDataUrl),
            SignatureDataUrl = NormalizeLogoDataUrl(query.SignatureDataUrl),
            StampDataUrl = NormalizeLogoDataUrl(query.StampDataUrl),
            LogoX = NormalizeLayoutValue(query.LogoX, 10, 540),
            LogoY = NormalizeLayoutValue(query.LogoY, 680, 780),
            LogoSize = NormalizeLayoutValue(query.LogoSize, 40, 140),
            SellerBlockX = NormalizeLayoutValue(query.SellerBlockX, 10, 355),
            SellerBlockY = NormalizeLayoutValue(query.SellerBlockY, 560, 720),
            SellerBlockWidth = NormalizeLayoutValue(query.SellerBlockWidth, 150, 320),
            ClientBlockX = NormalizeLayoutValue(query.ClientBlockX, 10, 355),
            ClientBlockY = NormalizeLayoutValue(query.ClientBlockY, 500, 700),
            ClientBlockWidth = NormalizeLayoutValue(query.ClientBlockWidth, 150, 320),
            MetadataX = NormalizeLayoutValue(query.MetadataX, 10, 295),
            MetadataY = NormalizeLayoutValue(query.MetadataY, 440, 640),
            MetadataWidth = NormalizeLayoutValue(query.MetadataWidth, 260, 560),
            AdditionalInfoX = NormalizeLayoutValue(query.AdditionalInfoX, 10, 295),
            AdditionalInfoY = NormalizeLayoutValue(query.AdditionalInfoY, 390, 580),
            AdditionalInfoWidth = NormalizeLayoutValue(query.AdditionalInfoWidth, 260, 560),
            TableX = NormalizeLayoutValue(query.TableX, 10, 295),
            TableY = NormalizeLayoutValue(query.TableY, 290, 520),
            TableWidth = NormalizeLayoutValue(query.TableWidth, 280, 560),
            TotalsX = NormalizeLayoutValue(query.TotalsX, 120, 470),
            TotalsY = NormalizeLayoutValue(query.TotalsY, 120, 250),
            TotalsWidth = NormalizeLayoutValue(query.TotalsWidth, 120, 240),
            TotalWordsX = NormalizeLayoutValue(query.TotalWordsX, 10, 435),
            TotalWordsY = NormalizeLayoutValue(query.TotalWordsY, 78, 250),
            TotalWordsWidth = NormalizeLayoutValue(query.TotalWordsWidth, 160, 560),
            SignatureBlockX = NormalizeLayoutValue(query.SignatureBlockX, 10, 445),
            SignatureBlockY = NormalizeLayoutValue(query.SignatureBlockY, 78, 220),
            SignatureBlockWidth = NormalizeLayoutValue(query.SignatureBlockWidth, 140, 560),
            FooterY = NormalizeLayoutValue(query.FooterY, 78, 170),
            FooterWidth = NormalizeLayoutValue(query.FooterWidth, 260, 560),
            AccentColorHex = TrimToMaxLength(query.AccentColorHex, 16),
            PageBackgroundHex = TrimToMaxLength(query.PageBackgroundHex, 16),
            BodyTextColorHex = TrimToMaxLength(query.BodyTextColorHex, 16),
            MutedTextColorHex = TrimToMaxLength(query.MutedTextColorHex, 16),
            DividerColorHex = TrimToMaxLength(query.DividerColorHex, 16),
            TableHeaderBackgroundHex = TrimToMaxLength(query.TableHeaderBackgroundHex, 16),
            TableHeaderTextColorHex = TrimToMaxLength(query.TableHeaderTextColorHex, 16),
            TableBorderColorHex = TrimToMaxLength(query.TableBorderColorHex, 16),
            TableAlternateRowColorHex = TrimToMaxLength(query.TableAlternateRowColorHex, 16),
            ServiceTitle = TrimToMaxLength(query.ServiceTitle, 64),
            FooterTitle = TrimToMaxLength(query.FooterTitle, 64),
            FooterLine1 = TrimToMaxLength(query.FooterLine1, 160),
            FooterLine2 = TrimToMaxLength(query.FooterLine2, 160),
            ShowHeader = query.ShowHeader,
            ShowLogo = query.ShowLogo,
            ShowSellerBlock = query.ShowSellerBlock,
            ShowClientBlock = query.ShowClientBlock,
            ShowMetadata = query.ShowMetadata,
            ShowAdditionalInfo = query.ShowAdditionalInfo,
            ShowTable = query.ShowTable,
            ShowTotals = query.ShowTotals,
            ShowFooter = query.ShowFooter,
            ShowTotalInWords = query.ShowTotalInWords,
            TotalInWordsLabel = TrimToMaxLength(query.TotalInWordsLabel, 120),
            CustomElements = NormalizeCustomElements(query.CustomElements)
        };
    }

    private static string? GetFirstInvalidHexField(InvoicePdfCustomization customization)
    {
        var colorCandidates = new Dictionary<string, string?>
        {
            [nameof(customization.AccentColorHex)] = customization.AccentColorHex,
            [nameof(customization.PageBackgroundHex)] = customization.PageBackgroundHex,
            [nameof(customization.BodyTextColorHex)] = customization.BodyTextColorHex,
            [nameof(customization.MutedTextColorHex)] = customization.MutedTextColorHex,
            [nameof(customization.DividerColorHex)] = customization.DividerColorHex,
            [nameof(customization.TableHeaderBackgroundHex)] = customization.TableHeaderBackgroundHex,
            [nameof(customization.TableHeaderTextColorHex)] = customization.TableHeaderTextColorHex,
            [nameof(customization.TableBorderColorHex)] = customization.TableBorderColorHex,
            [nameof(customization.TableAlternateRowColorHex)] = customization.TableAlternateRowColorHex
        };

        foreach (var candidate in colorCandidates)
        {
            if (!string.IsNullOrWhiteSpace(candidate.Value) && !IsValidHexColor(candidate.Value))
            {
                return candidate.Key;
            }
        }

        return null;
    }

    private static bool IsValidHexColor(string value)
    {
        var normalized = value.Trim();
        if (normalized.StartsWith('#'))
        {
            normalized = normalized[1..];
        }

        if (normalized.Length != 6)
        {
            return false;
        }

        return normalized.All(ch =>
            (ch >= '0' && ch <= '9')
            || (ch >= 'A' && ch <= 'F')
            || (ch >= 'a' && ch <= 'f'));
    }

    private static bool IsCustomizationEmpty(InvoicePdfCustomization customization)
    {
        return string.IsNullOrWhiteSpace(customization.BrandName)
            && string.IsNullOrWhiteSpace(customization.BrandTagline)
            && string.IsNullOrWhiteSpace(customization.DocumentTitle)
            && string.IsNullOrWhiteSpace(customization.SellerBlockTitle)
            && string.IsNullOrWhiteSpace(customization.ClientBlockTitle)
            && string.IsNullOrWhiteSpace(customization.InvoiceDateLabel)
            && string.IsNullOrWhiteSpace(customization.InvoiceNumberLabel)
            && string.IsNullOrWhiteSpace(customization.InvoiceNumberPrefix)
            && (!customization.InvoiceNumberStart.HasValue || customization.InvoiceNumberStart.Value <= 0)
            && string.IsNullOrWhiteSpace(customization.DueDateLabel)
            && string.IsNullOrWhiteSpace(customization.PaymentLabel)
            && string.IsNullOrWhiteSpace(customization.ReferenceLabel)
            && string.IsNullOrWhiteSpace(customization.AdditionalInfoLabel)
            && string.IsNullOrWhiteSpace(customization.AdditionalInfoValue)
            && string.IsNullOrWhiteSpace(customization.PaymentTermText)
            && string.IsNullOrWhiteSpace(customization.ReferencePrefix)
            && (!customization.DueInDays.HasValue || customization.DueInDays.Value <= 0)
            && string.IsNullOrWhiteSpace(customization.DefaultUnit)
            && string.IsNullOrWhiteSpace(customization.TableHeaderDescription)
            && string.IsNullOrWhiteSpace(customization.TableHeaderQuantity)
            && string.IsNullOrWhiteSpace(customization.TableHeaderUnit)
            && string.IsNullOrWhiteSpace(customization.TableHeaderUnitPrice)
            && string.IsNullOrWhiteSpace(customization.TableHeaderTaxRate)
            && string.IsNullOrWhiteSpace(customization.TableHeaderTaxAmount)
            && string.IsNullOrWhiteSpace(customization.TableHeaderTotal)
            && string.IsNullOrWhiteSpace(customization.TotalsSubtotalLabel)
            && string.IsNullOrWhiteSpace(customization.TotalsTaxLabel)
            && string.IsNullOrWhiteSpace(customization.TotalsTotalLabel)
            && string.IsNullOrWhiteSpace(customization.FooterColumn1Title)
            && string.IsNullOrWhiteSpace(customization.FooterColumn2Title)
            && string.IsNullOrWhiteSpace(customization.FooterColumn3Title)
            && string.IsNullOrWhiteSpace(customization.FooterColumn1Line1)
            && string.IsNullOrWhiteSpace(customization.FooterColumn1Line2)
            && string.IsNullOrWhiteSpace(customization.FooterColumn1Line3)
            && string.IsNullOrWhiteSpace(customization.FooterColumn2Line1)
            && string.IsNullOrWhiteSpace(customization.FooterColumn2Line2)
            && string.IsNullOrWhiteSpace(customization.FooterColumn2Line3)
            && string.IsNullOrWhiteSpace(customization.FooterColumn3Line1)
            && string.IsNullOrWhiteSpace(customization.FooterColumn3Line2)
            && string.IsNullOrWhiteSpace(customization.FooterColumn3Line3)
            && string.IsNullOrWhiteSpace(customization.FontFamily)
            && (!customization.TitleFontSize.HasValue || customization.TitleFontSize.Value <= 0)
            && (!customization.HeadingFontSize.HasValue || customization.HeadingFontSize.Value <= 0)
            && (!customization.BodyFontSize.HasValue || customization.BodyFontSize.Value <= 0)
            && (!customization.SmallFontSize.HasValue || customization.SmallFontSize.Value <= 0)
            && string.IsNullOrWhiteSpace(customization.LogoDataUrl)
            && string.IsNullOrWhiteSpace(customization.SignatureDataUrl)
            && string.IsNullOrWhiteSpace(customization.StampDataUrl)
            && (!customization.LogoX.HasValue || customization.LogoX.Value <= 0)
            && (!customization.LogoY.HasValue || customization.LogoY.Value <= 0)
            && (!customization.LogoSize.HasValue || customization.LogoSize.Value <= 0)
            && (!customization.SellerBlockX.HasValue || customization.SellerBlockX.Value <= 0)
            && (!customization.SellerBlockY.HasValue || customization.SellerBlockY.Value <= 0)
            && (!customization.SellerBlockWidth.HasValue || customization.SellerBlockWidth.Value <= 0)
            && (!customization.ClientBlockX.HasValue || customization.ClientBlockX.Value <= 0)
            && (!customization.ClientBlockY.HasValue || customization.ClientBlockY.Value <= 0)
            && (!customization.ClientBlockWidth.HasValue || customization.ClientBlockWidth.Value <= 0)
            && (!customization.MetadataX.HasValue || customization.MetadataX.Value <= 0)
            && (!customization.MetadataY.HasValue || customization.MetadataY.Value <= 0)
            && (!customization.MetadataWidth.HasValue || customization.MetadataWidth.Value <= 0)
            && (!customization.AdditionalInfoX.HasValue || customization.AdditionalInfoX.Value <= 0)
            && (!customization.AdditionalInfoY.HasValue || customization.AdditionalInfoY.Value <= 0)
            && (!customization.AdditionalInfoWidth.HasValue || customization.AdditionalInfoWidth.Value <= 0)
            && (!customization.TableX.HasValue || customization.TableX.Value <= 0)
            && (!customization.TableY.HasValue || customization.TableY.Value <= 0)
            && (!customization.TableWidth.HasValue || customization.TableWidth.Value <= 0)
            && (!customization.TotalsX.HasValue || customization.TotalsX.Value <= 0)
            && (!customization.TotalsY.HasValue || customization.TotalsY.Value <= 0)
            && (!customization.TotalsWidth.HasValue || customization.TotalsWidth.Value <= 0)
            && (!customization.TotalWordsX.HasValue || customization.TotalWordsX.Value <= 0)
            && (!customization.TotalWordsY.HasValue || customization.TotalWordsY.Value <= 0)
            && (!customization.TotalWordsWidth.HasValue || customization.TotalWordsWidth.Value <= 0)
            && (!customization.SignatureBlockX.HasValue || customization.SignatureBlockX.Value <= 0)
            && (!customization.SignatureBlockY.HasValue || customization.SignatureBlockY.Value <= 0)
            && (!customization.SignatureBlockWidth.HasValue || customization.SignatureBlockWidth.Value <= 0)
            && (!customization.FooterY.HasValue || customization.FooterY.Value <= 0)
            && (!customization.FooterWidth.HasValue || customization.FooterWidth.Value <= 0)
            && string.IsNullOrWhiteSpace(customization.AccentColorHex)
            && string.IsNullOrWhiteSpace(customization.PageBackgroundHex)
            && string.IsNullOrWhiteSpace(customization.BodyTextColorHex)
            && string.IsNullOrWhiteSpace(customization.MutedTextColorHex)
            && string.IsNullOrWhiteSpace(customization.DividerColorHex)
            && string.IsNullOrWhiteSpace(customization.TableHeaderBackgroundHex)
            && string.IsNullOrWhiteSpace(customization.TableHeaderTextColorHex)
            && string.IsNullOrWhiteSpace(customization.TableBorderColorHex)
            && string.IsNullOrWhiteSpace(customization.TableAlternateRowColorHex)
            && string.IsNullOrWhiteSpace(customization.ServiceTitle)
            && string.IsNullOrWhiteSpace(customization.FooterTitle)
            && string.IsNullOrWhiteSpace(customization.FooterLine1)
            && string.IsNullOrWhiteSpace(customization.FooterLine2)
            && !customization.ShowHeader.HasValue
            && !customization.ShowLogo.HasValue
            && !customization.ShowSellerBlock.HasValue
            && !customization.ShowClientBlock.HasValue
            && !customization.ShowMetadata.HasValue
            && !customization.ShowAdditionalInfo.HasValue
            && !customization.ShowTable.HasValue
            && !customization.ShowTotals.HasValue
            && !customization.ShowFooter.HasValue
            && !customization.ShowTotalInWords.HasValue
            && string.IsNullOrWhiteSpace(customization.TotalInWordsLabel)
            && (customization.CustomElements is null || customization.CustomElements.Count == 0);
    }

    private static InvoicePdfSettingsDto MapInvoicePdfSettingsDto(InvoicePdfCustomization customization, bool hasCustomSettings)
    {
        return new InvoicePdfSettingsDto
        {
            BrandName = customization.BrandName ?? string.Empty,
            BrandTagline = customization.BrandTagline ?? string.Empty,
            DocumentTitle = customization.DocumentTitle ?? string.Empty,
            SellerBlockTitle = customization.SellerBlockTitle ?? string.Empty,
            ClientBlockTitle = customization.ClientBlockTitle ?? string.Empty,
            InvoiceDateLabel = customization.InvoiceDateLabel ?? string.Empty,
            InvoiceNumberLabel = customization.InvoiceNumberLabel ?? string.Empty,
            InvoiceNumberPrefix = NormalizeInvoiceNumberPrefix(customization.InvoiceNumberPrefix),
            InvoiceNumberStart = customization.InvoiceNumberStart ?? 0,
            DueDateLabel = customization.DueDateLabel ?? string.Empty,
            PaymentLabel = customization.PaymentLabel ?? string.Empty,
            ReferenceLabel = customization.ReferenceLabel ?? string.Empty,
            AdditionalInfoLabel = customization.AdditionalInfoLabel ?? string.Empty,
            AdditionalInfoValue = customization.AdditionalInfoValue ?? string.Empty,
            PaymentTermText = customization.PaymentTermText ?? string.Empty,
            ReferencePrefix = customization.ReferencePrefix ?? string.Empty,
            DueInDays = customization.DueInDays ?? 0,
            DefaultUnit = customization.DefaultUnit ?? string.Empty,
            TableHeaderDescription = customization.TableHeaderDescription ?? string.Empty,
            TableHeaderQuantity = customization.TableHeaderQuantity ?? string.Empty,
            TableHeaderUnit = customization.TableHeaderUnit ?? string.Empty,
            TableHeaderUnitPrice = customization.TableHeaderUnitPrice ?? string.Empty,
            TableHeaderTaxRate = customization.TableHeaderTaxRate ?? string.Empty,
            TableHeaderTaxAmount = customization.TableHeaderTaxAmount ?? string.Empty,
            TableHeaderTotal = customization.TableHeaderTotal ?? string.Empty,
            TotalsSubtotalLabel = customization.TotalsSubtotalLabel ?? string.Empty,
            TotalsTaxLabel = customization.TotalsTaxLabel ?? string.Empty,
            TotalsTotalLabel = customization.TotalsTotalLabel ?? string.Empty,
            FooterColumn1Title = customization.FooterColumn1Title ?? string.Empty,
            FooterColumn2Title = customization.FooterColumn2Title ?? string.Empty,
            FooterColumn3Title = customization.FooterColumn3Title ?? string.Empty,
            FooterColumn1Line1 = customization.FooterColumn1Line1 ?? string.Empty,
            FooterColumn1Line2 = customization.FooterColumn1Line2 ?? string.Empty,
            FooterColumn1Line3 = customization.FooterColumn1Line3 ?? string.Empty,
            FooterColumn2Line1 = customization.FooterColumn2Line1 ?? string.Empty,
            FooterColumn2Line2 = customization.FooterColumn2Line2 ?? string.Empty,
            FooterColumn2Line3 = customization.FooterColumn2Line3 ?? string.Empty,
            FooterColumn3Line1 = customization.FooterColumn3Line1 ?? string.Empty,
            FooterColumn3Line2 = customization.FooterColumn3Line2 ?? string.Empty,
            FooterColumn3Line3 = customization.FooterColumn3Line3 ?? string.Empty,
            FontFamily = customization.FontFamily ?? string.Empty,
            TitleFontSize = customization.TitleFontSize ?? 0,
            HeadingFontSize = customization.HeadingFontSize ?? 0,
            BodyFontSize = customization.BodyFontSize ?? 0,
            SmallFontSize = customization.SmallFontSize ?? 0,
            LogoDataUrl = customization.LogoDataUrl ?? string.Empty,
            SignatureDataUrl = customization.SignatureDataUrl ?? string.Empty,
            StampDataUrl = customization.StampDataUrl ?? string.Empty,
            LogoX = customization.LogoX ?? 0,
            LogoY = customization.LogoY ?? 0,
            LogoSize = customization.LogoSize ?? 0,
            SellerBlockX = customization.SellerBlockX ?? 0,
            SellerBlockY = customization.SellerBlockY ?? 0,
            SellerBlockWidth = customization.SellerBlockWidth ?? 0,
            ClientBlockX = customization.ClientBlockX ?? 0,
            ClientBlockY = customization.ClientBlockY ?? 0,
            ClientBlockWidth = customization.ClientBlockWidth ?? 0,
            MetadataX = customization.MetadataX ?? 0,
            MetadataY = customization.MetadataY ?? 0,
            MetadataWidth = customization.MetadataWidth ?? 0,
            AdditionalInfoX = customization.AdditionalInfoX ?? 0,
            AdditionalInfoY = customization.AdditionalInfoY ?? 0,
            AdditionalInfoWidth = customization.AdditionalInfoWidth ?? 0,
            TableX = customization.TableX ?? 0,
            TableY = customization.TableY ?? 0,
            TableWidth = customization.TableWidth ?? 0,
            TotalsX = customization.TotalsX ?? 0,
            TotalsY = customization.TotalsY ?? 0,
            TotalsWidth = customization.TotalsWidth ?? 0,
            TotalWordsX = customization.TotalWordsX ?? 0,
            TotalWordsY = customization.TotalWordsY ?? 0,
            TotalWordsWidth = customization.TotalWordsWidth ?? 0,
            SignatureBlockX = customization.SignatureBlockX ?? 0,
            SignatureBlockY = customization.SignatureBlockY ?? 0,
            SignatureBlockWidth = customization.SignatureBlockWidth ?? 0,
            FooterY = customization.FooterY ?? 0,
            FooterWidth = customization.FooterWidth ?? 0,
            AccentColorHex = customization.AccentColorHex ?? string.Empty,
            PageBackgroundHex = customization.PageBackgroundHex ?? string.Empty,
            BodyTextColorHex = customization.BodyTextColorHex ?? string.Empty,
            MutedTextColorHex = customization.MutedTextColorHex ?? string.Empty,
            DividerColorHex = customization.DividerColorHex ?? string.Empty,
            TableHeaderBackgroundHex = customization.TableHeaderBackgroundHex ?? string.Empty,
            TableHeaderTextColorHex = customization.TableHeaderTextColorHex ?? string.Empty,
            TableBorderColorHex = customization.TableBorderColorHex ?? string.Empty,
            TableAlternateRowColorHex = customization.TableAlternateRowColorHex ?? string.Empty,
            ServiceTitle = customization.ServiceTitle ?? string.Empty,
            FooterTitle = customization.FooterTitle ?? string.Empty,
            FooterLine1 = customization.FooterLine1 ?? string.Empty,
            FooterLine2 = customization.FooterLine2 ?? string.Empty,
            ShowHeader = customization.ShowHeader ?? true,
            ShowLogo = customization.ShowLogo ?? true,
            ShowSellerBlock = customization.ShowSellerBlock ?? true,
            ShowClientBlock = customization.ShowClientBlock ?? true,
            ShowMetadata = customization.ShowMetadata ?? true,
            ShowAdditionalInfo = customization.ShowAdditionalInfo ?? true,
            ShowTable = customization.ShowTable ?? true,
            ShowTotals = customization.ShowTotals ?? true,
            ShowFooter = customization.ShowFooter ?? true,
            ShowTotalInWords = customization.ShowTotalInWords ?? true,
            TotalInWordsLabel = customization.TotalInWordsLabel ?? string.Empty,
            CustomElements = (customization.CustomElements ?? new List<InvoicePdfCustomElement>())
                .Select(element => new InvoicePdfCustomElementDto
                {
                    Id = element.Id,
                    Type = element.Type,
                    Text = element.Text,
                    X = element.X,
                    Y = element.Y,
                    Width = element.Width,
                    Height = element.Height,
                    FontSize = element.FontSize,
                    ColorHex = element.ColorHex,
                    BackgroundColorHex = element.BackgroundColorHex,
                    StrokeColorHex = element.StrokeColorHex,
                    StrokeWidth = element.StrokeWidth,
                    SrcDataUrl = element.SrcDataUrl,
                    Bold = element.Bold,
                    Italic = element.Italic,
                    Align = element.Align,
                    Visible = element.Visible,
                    ZIndex = element.ZIndex
                })
                .ToList(),
            HasCustomSettings = hasCustomSettings
        };
    }

    private void TryDeleteStorageDirectory(int invoiceId)
    {
        TryDeleteDirectory(Path.Combine(_environment.ContentRootPath, "Storage", "ClientPortal", invoiceId.ToString()));

        var stableRoot = ClientPortalStoragePaths.GetStableContentRoot(_environment.ContentRootPath);
        if (!string.Equals(stableRoot, _environment.ContentRootPath, StringComparison.OrdinalIgnoreCase))
        {
            TryDeleteDirectory(Path.Combine(stableRoot, "Storage", "ClientPortal", invoiceId.ToString()));
        }
    }

    private static void TryDeleteDirectory(string absolutePath)
    {
        if (!Directory.Exists(absolutePath))
        {
            return;
        }

        try
        {
            Directory.Delete(absolutePath, recursive: true);
        }
        catch
        {
        }
    }

    private static string GenerateClientPortalAccessCode()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
    }

    private static async Task<string> CreateTemporaryUploadFileAsync(IFormFile file, string extension, CancellationToken cancellationToken)
    {
        var tempFilePath = Path.Combine(Path.GetTempPath(), $"mototun-upload-{Guid.NewGuid():N}{extension.ToLowerInvariant()}");
        await using var stream = new FileStream(tempFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, cancellationToken);
        return tempFilePath;
    }

    private async Task DeleteStoredFilesAsync(string? replacedRelativePath, IEnumerable<string> duplicateRelativePaths, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(replacedRelativePath))
        {
            await _fileStorage.DeleteIfExistsAsync(replacedRelativePath, cancellationToken);
        }

        foreach (var duplicatePath in duplicateRelativePaths)
        {
            await _fileStorage.DeleteIfExistsAsync(duplicatePath, cancellationToken);
        }
    }

    private static void TryDeleteTemporaryFile(string tempFilePath)
    {
        if (string.IsNullOrWhiteSpace(tempFilePath) || !System.IO.File.Exists(tempFilePath))
        {
            return;
        }

        try
        {
            System.IO.File.Delete(tempFilePath);
        }
        catch
        {
        }
    }

    private static InvoiceDto MapInvoiceDto(Invoice invoice)
    {
        var hasLegacyCin = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);

        return new InvoiceDto
        {
            InvoiceId = invoice.Id,
            RevendeurId = invoice.RevendeurId,
            RevendeurBusinessName = invoice.Revendeur?.BusinessName,
            RevendeurAvatar = invoice.Revendeur?.User?.Avatar,
            ClientId = invoice.ClientId,
            ClientFullName = invoice.Client?.FullName ?? string.Empty,
            ClientCIN = invoice.Client?.CIN ?? string.Empty,
            ClientEmail = invoice.Client?.Email,
            ClientPhone = invoice.Client?.Phone,
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate,
            ClientPortalAccessCode = invoice.ClientPortalAccessCode,
            Status = invoice.Status,
            CarteGriseStatus = invoice.CarteGriseStatus,
            AssignedFournisseurId = invoice.AssignedFournisseurId,
            AssignedFournisseurBusinessName = invoice.AssignedFournisseur?.BusinessName,
            AssignedFournisseurAvatar = invoice.AssignedFournisseur?.User?.Avatar,
            AssignedFournisseurEmail = invoice.AssignedFournisseur?.User?.Email,
            SentToFournisseurAt = invoice.SentToFournisseurAt,
            CarteGriseStatusUpdatedByUserId = invoice.CarteGriseStatusUpdatedByUserId,
            CarteGriseStatusUpdatedAt = invoice.CarteGriseStatusUpdatedAt,
            DocumentIssueMessage = SanitizeDocumentIssueMessage(invoice.DocumentIssueMessage),
            DocumentIssueReasons = DeserializeValidationReasons(invoice.DocumentIssueReasonsJson),
            DocumentFixChecklist = DeserializeChecklistItems(invoice.DocumentFixChecklistJson),
            DocumentIssueUpdatedByUserId = invoice.DocumentIssueUpdatedByUserId,
            DocumentIssueUpdatedAt = invoice.DocumentIssueUpdatedAt,
            ClientUpdateMessage = invoice.ClientUpdateMessage,
            ClientUpdateUpdatedByUserId = invoice.ClientUpdateUpdatedByUserId,
            ClientUpdateUpdatedAt = invoice.ClientUpdateUpdatedAt,
            TotalAmount = invoice.TotalAmount,
            Notes = invoice.Notes,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            IsCinUploaded = hasCin,
            IsCinFrontUploaded = hasCinFront || hasLegacyCin,
            IsCinBackUploaded = hasCinBack || hasLegacyCin,
            IsDeclarationUploaded = hasDeclaration,
            IsFactureUploaded = hasFacture,
            IsJustificatifUploaded = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.JustificatifDomicile),
            IsCarteGriseUploaded = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CarteGrise),
            SoldMotorcycles = invoice.SoldMotorcycles
                .Select(s => new SoldMotorcycleDto
                {
                    SoldMotorcycleId = s.Id,
                    InvoiceId = s.InvoiceId,
                    StockMotorcycleId = s.StockMotorcycleId,
                    Company = s.Company,
                    Brand = s.Brand,
                    Model = s.Model,
                    ChassisNumber = s.ChassisNumber,
                    EngineNumber = s.EngineNumber,
                    Matricule = s.Matricule,
                    PurchasePrice = s.PurchasePrice,
                    SalePrice = s.SalePrice,
                    CreatedAt = s.CreatedAt
                })
                .ToList(),
            Documents = invoice.ClientPortalDocuments
                .OrderByDescending(d => d.UpdatedAt)
                .ThenByDescending(d => d.Id)
                .Select(d => new InvoiceDocumentDto
                {
                    DocumentId = d.Id,
                    DocumentType = d.DocumentType,
                    FileName = d.OriginalFileName,
                    ContentType = d.ContentType,
                    SizeBytes = d.SizeBytes,
                    UploadedByClient = d.UploadedByClient,
                    UpdatedAt = d.UpdatedAt
                })
                .ToList(),
            Timeline = invoice.TimelineEvents
                .OrderByDescending(e => e.CreatedAt)
                .ThenByDescending(e => e.Id)
                .Select(MapTimelineEventDto)
                .ToList()
        };
    }

    private static InvoiceTimelineEventDto MapTimelineEventDto(InvoiceTimelineEvent timelineEvent)
    {
        var title = string.Equals(timelineEvent.Title, "Controle automatique OCR", StringComparison.OrdinalIgnoreCase)
            ? "Controle automatique document"
            : timelineEvent.Title;
        var message = SanitizeDocumentIssueMessage(timelineEvent.Message) ?? timelineEvent.Message;

        return new InvoiceTimelineEventDto
        {
            EventId = timelineEvent.Id,
            EventType = timelineEvent.EventType,
            Title = title,
            Message = message,
            ActorUserId = timelineEvent.ActorUserId,
            ActorRole = timelineEvent.ActorRole,
            CreatedAt = timelineEvent.CreatedAt
        };
    }

    private static List<CreateSoldMotorcycleDto> GetSoldMotorcycleInputs(CreateInvoiceDto dto)
    {
        if (dto.SoldMotorcycles is { Count: > 0 })
        {
            return dto.SoldMotorcycles
                .Where(item => item is not null)
                .ToList();
        }

        return dto.SoldMotorcycle is null
            ? new List<CreateSoldMotorcycleDto>()
            : new List<CreateSoldMotorcycleDto> { dto.SoldMotorcycle };
    }

    private sealed class PreparedSoldMotorcycle
    {
        public int? StockMotorcycleId { get; init; }
        public string Company { get; init; } = string.Empty;
        public string Brand { get; init; } = string.Empty;
        public string Model { get; init; } = string.Empty;
        public string ChassisNumber { get; init; } = string.Empty;
        public decimal PurchasePrice { get; init; }
        public decimal SalePrice { get; init; }
    }

    private sealed class InvoiceNumberingSettings
    {
        public string Prefix { get; init; } = InvoiceNumberPrefixDefault;
        public int Start { get; init; } = InvoiceNumberStartDefault;
    }

    private static string? NormalizeString(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeOptionalMessage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= 2000 ? trimmed : trimmed[..2000];
    }

    private static string? SanitizeDocumentIssueMessage(string? value)
    {
        var normalized = NormalizeOptionalMessage(value);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        var keptLines = normalized
            .Split('\n')
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Where(line => !IsAutoValidationNoiseLine(line))
            .ToList();

        if (keptLines.Count == 0)
        {
            return null;
        }

        return NormalizeOptionalMessage(string.Join("\n", keptLines));
    }

    private static bool IsAutoValidationNoiseLine(string line)
    {
        var normalized = line.Trim().ToLowerInvariant();
        return normalized.Contains("[auto ocr", StringComparison.Ordinal)
            || normalized.Contains("[verification auto", StringComparison.Ordinal)
            || normalized.Contains("ocr termine", StringComparison.Ordinal)
            || normalized.Contains("zones texte:", StringComparison.Ordinal)
            || normalized.Contains("champs manquants:", StringComparison.Ordinal);
    }

    private static bool ShouldRejectUploadedDocument(
        ClientPortalDocumentType documentType,
        IReadOnlyCollection<DocumentValidationReason> reasons)
    {
        // For now, uploads are never auto-rejected: auto-validation only produces
        // warning reasons/checklists and revendeur remains the final reviewer.
        return false;
    }

    private static bool IsStrictDocumentType(ClientPortalDocumentType documentType)
    {
        return documentType is ClientPortalDocumentType.Cin
            or ClientPortalDocumentType.CinFront
            or ClientPortalDocumentType.CinBack
            or ClientPortalDocumentType.DeclarationImpot;
    }

    private static string BuildUploadRejectedMessage(ClientPortalDocumentType documentType)
    {
        return $"Le fichier televerse ne correspond pas a un {ToDocumentLabel(documentType)} valide. Merci d'envoyer une photo claire du vrai document.";
    }

    private static string ToCarteGriseStatusLabel(CarteGriseStatus status)
    {
        return status switch
        {
            CarteGriseStatus.PendingDocuments => "En attente",
            CarteGriseStatus.DocumentsReceived => "Documents recus",
            CarteGriseStatus.InProgress => "Controle qualite",
            CarteGriseStatus.DepotAntt => "Depot ANTT",
            CarteGriseStatus.Ready => "Carte grise prete",
            CarteGriseStatus.Rejected => "Rejete",
            CarteGriseStatus.Delivered => "Livree",
            _ => "Inconnu"
        };
    }

    private static string ToDocumentLabel(ClientPortalDocumentType type)
    {
        return type switch
        {
            ClientPortalDocumentType.Cin => "CIN",
            ClientPortalDocumentType.CinFront => "CIN Front",
            ClientPortalDocumentType.CinBack => "CIN Back",
            ClientPortalDocumentType.DeclarationImpot => "Declaration d'impot",
            ClientPortalDocumentType.Facture => "Facture",
            ClientPortalDocumentType.CarteGrise => "Carte grise",
            ClientPortalDocumentType.JustificatifDomicile => "Justificatif domicile",
            ClientPortalDocumentType.Other => "Autre document",
            _ => "Document"
        };
    }

    private async Task<IReadOnlyCollection<DocumentValidationReason>> TryApplyAutomaticValidationAsync(
        Invoice invoice,
        ClientPortalDocumentType documentType,
        string absolutePath,
        int actorUserId,
        UserRole actorRole,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (!_documentAutoValidationService.IsSupported(documentType))
        {
            return Array.Empty<DocumentValidationReason>();
        }

        DocumentAutoValidationResult autoValidationResult;
        try
        {
            autoValidationResult = await _documentAutoValidationService.AnalyzeAsync(
                documentType,
                absolutePath,
                Path.GetFileName(absolutePath),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Automatic document verification failed for invoice {InvoiceId}", invoice.Id);
            return Array.Empty<DocumentValidationReason>();
        }

        if (!autoValidationResult.WasAnalyzed)
        {
            return Array.Empty<DocumentValidationReason>();
        }

        var detectedReasons = NormalizeValidationReasons(autoValidationResult.Reasons);
        var detectedChecklist = NormalizeChecklistItems(autoValidationResult.Checklist);
        if (detectedReasons.Count == 0 && detectedChecklist.Count == 0)
        {
            return Array.Empty<DocumentValidationReason>();
        }

        var existingReasons = DeserializeValidationReasons(invoice.DocumentIssueReasonsJson);
        var existingChecklist = DeserializeChecklistItems(invoice.DocumentFixChecklistJson);

        var mergedReasons = NormalizeValidationReasons(existingReasons.Concat(detectedReasons));
        var mergedChecklist = NormalizeChecklistItems(existingChecklist.Concat(detectedChecklist));

        var reasonsChanged = !existingReasons.SequenceEqual(mergedReasons);
        var checklistChanged = !existingChecklist.SequenceEqual(mergedChecklist);
        var sanitizedIssueMessage = SanitizeDocumentIssueMessage(invoice.DocumentIssueMessage);
        var issueMessageChanged = !string.Equals(
            NormalizeOptionalMessage(invoice.DocumentIssueMessage),
            NormalizeOptionalMessage(sanitizedIssueMessage),
            StringComparison.Ordinal);

        if (!reasonsChanged && !checklistChanged && !issueMessageChanged)
        {
            return detectedReasons;
        }

        invoice.DocumentIssueReasonsJson = SerializeValidationReasons(mergedReasons);
        invoice.DocumentFixChecklistJson = SerializeChecklistItems(mergedChecklist);
        invoice.DocumentIssueUpdatedByUserId = actorUserId;
        invoice.DocumentIssueUpdatedAt = now;
        invoice.DocumentIssueMessage = sanitizedIssueMessage;
        invoice.UpdatedAt = now;

        if (reasonsChanged || checklistChanged)
        {
            _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
            {
                InvoiceId = invoice.Id,
                EventType = InvoiceTimelineEventType.DocumentIssueUpdated,
                ActorUserId = actorUserId,
                ActorRole = actorRole,
                Title = "Controle automatique document",
                Message = BuildAutoValidationTimelineMessage(documentType, detectedReasons),
                CreatedAt = now
            });
        }

        return detectedReasons;
    }

    private static string BuildAutoValidationTimelineMessage(
        ClientPortalDocumentType documentType,
        IReadOnlyCollection<DocumentValidationReason> reasons)
    {
        var reasonLabel = reasons.Count == 0
            ? "Anomalie detectee"
            : string.Join(", ", reasons.Select(ToValidationReasonLabel));

        var message = $"{ToDocumentLabel(documentType)}: {reasonLabel}.";

        return message.Length <= 2000 ? message : message[..2000];
    }

    private static List<DocumentValidationReason> NormalizeValidationReasons(IEnumerable<DocumentValidationReason>? reasons)
    {
        if (reasons is null)
        {
            return new List<DocumentValidationReason>();
        }

        return reasons
            .Where(reason => Enum.IsDefined(typeof(DocumentValidationReason), reason))
            .Distinct()
            .OrderBy(reason => (int)reason)
            .ToList();
    }

    private static List<string> NormalizeChecklistItems(IEnumerable<string>? checklist)
    {
        if (checklist is null)
        {
            return new List<string>();
        }

        return checklist
            .Select(item => item?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!.Length <= 240 ? item : item[..240])
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();
    }

    private static string? SerializeValidationReasons(IReadOnlyCollection<DocumentValidationReason> reasons)
    {
        return reasons.Count == 0 ? null : JsonSerializer.Serialize(reasons);
    }

    private static string? SerializeChecklistItems(IReadOnlyCollection<string> checklist)
    {
        return checklist.Count == 0 ? null : JsonSerializer.Serialize(checklist);
    }

    private static List<DocumentValidationReason> DeserializeValidationReasons(string? serialized)
    {
        if (string.IsNullOrWhiteSpace(serialized))
        {
            return new List<DocumentValidationReason>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<DocumentValidationReason>>(serialized);
            return NormalizeValidationReasons(parsed ?? new List<DocumentValidationReason>());
        }
        catch
        {
            return new List<DocumentValidationReason>();
        }
    }

    private static List<string> DeserializeChecklistItems(string? serialized)
    {
        if (string.IsNullOrWhiteSpace(serialized))
        {
            return new List<string>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(serialized);
            return NormalizeChecklistItems(parsed ?? new List<string>());
        }
        catch
        {
            return new List<string>();
        }
    }

    private static string? ComposeValidationIssueMessage(
        IReadOnlyCollection<DocumentValidationReason> reasons,
        IReadOnlyCollection<string> checklist,
        string? additionalMessage)
    {
        var lines = new List<string>();

        if (reasons.Count > 0)
        {
            lines.Add("Motifs: " + string.Join(", ", reasons.Select(ToValidationReasonLabel)));
        }

        if (checklist.Count > 0)
        {
            lines.Add("Corrections requises:");
            lines.AddRange(checklist.Select(item => $"- {item}"));
        }

        if (!string.IsNullOrWhiteSpace(additionalMessage))
        {
            lines.Add("Commentaire: " + additionalMessage);
        }

        if (lines.Count == 0)
        {
            return null;
        }

        var message = string.Join("\n", lines).Trim();
        return message.Length <= 2000 ? message : message[..2000];
    }

    private static string BuildValidationTimelineSummary(
        IReadOnlyCollection<DocumentValidationReason> reasons,
        IReadOnlyCollection<string> checklist,
        string? additionalMessage)
    {
        var reasonLabel = reasons.Count == 0
            ? "Aucun motif catalogue"
            : string.Join(", ", reasons.Select(ToValidationReasonLabel));

        var checklistCount = checklist.Count;
        var baseSummary = $"Motifs: {reasonLabel}. Corrections: {checklistCount} item(s).";

        if (string.IsNullOrWhiteSpace(additionalMessage))
        {
            return baseSummary;
        }

        var merged = $"{baseSummary} Note: {additionalMessage}";
        return merged.Length <= 2000 ? merged : merged[..2000];
    }

    private static string BuildClientChecklistMessage(
        IReadOnlyCollection<DocumentValidationReason> reasons,
        IReadOnlyCollection<string> checklist,
        string? additionalMessage)
    {
        var lines = new List<string>
        {
            "Votre dossier carte grise necessite des corrections."
        };

        if (reasons.Count > 0)
        {
            lines.Add("Motifs detectes: " + string.Join(", ", reasons.Select(ToValidationReasonLabel)));
        }

        if (checklist.Count > 0)
        {
            lines.Add("Merci de corriger les points suivants:");
            lines.AddRange(checklist.Select(item => $"- {item}"));
        }

        if (!string.IsNullOrWhiteSpace(additionalMessage))
        {
            lines.Add("Commentaire: " + additionalMessage);
        }

        lines.Add("Apres correction, rechargez les documents concernes.");

        var message = string.Join("\n", lines).Trim();
        return message.Length <= 2000 ? message : message[..2000];
    }

    private static string ToValidationReasonLabel(DocumentValidationReason reason)
    {
        return reason switch
        {
            DocumentValidationReason.Blurred => "Document flou",
            DocumentValidationReason.MissingSignature => "Signature manquante",
            DocumentValidationReason.Mismatch => "Incoherence des informations",
            DocumentValidationReason.MissingPage => "Page manquante",
            DocumentValidationReason.Expired => "Document expire",
            DocumentValidationReason.Incomplete => "Document incomplet",
            _ => "Motif inconnu"
        };
    }

    private async Task<(Client? Client, string? Error)> ResolveClientAsync(int revendeurId, CreateInvoiceDto dto, int activeClientLimit)
    {
        if (dto.ClientId.HasValue && dto.ClientId.Value > 0)
        {
            var existingById = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == dto.ClientId.Value && c.RevendeurId == revendeurId);

            return existingById is null
                ? (null, "Client not found")
                : (existingById, null);
        }

        if (dto.Client is null)
        {
            return (null, "ClientId or Client data is required");
        }

        var fullName = NormalizeString(dto.Client.FullName);
        var cin = NormalizeString(dto.Client.CIN)?.ToUpperInvariant();
        var email = NormalizeString(dto.Client.Email);
        var phone = NormalizeString(dto.Client.Phone);
        var address = NormalizeString(dto.Client.Address) ?? string.Empty;
        var city = NormalizeString(dto.Client.City) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(cin))
        {
            return (null, "Client full name and CIN are required");
        }

        var existingByCin = await _context.Clients
            .FirstOrDefaultAsync(c => c.CIN == cin);

        if (existingByCin is not null)
        {
            if (existingByCin.RevendeurId.HasValue && existingByCin.RevendeurId.Value != revendeurId)
            {
                return (null, "Client CIN already linked to another revendeur");
            }

            if (existingByCin.RevendeurId != revendeurId)
            {
                var activeClientCount = await GetActiveClientCountAsync(revendeurId);
                if (activeClientCount >= activeClientLimit)
                {
                    return (null, $"Active client limit reached ({activeClientLimit}).");
                }
            }

            if (!string.IsNullOrWhiteSpace(email) &&
                !string.Equals(existingByCin.Email, email, StringComparison.OrdinalIgnoreCase))
            {
                var emailInUse = await _context.Clients.AnyAsync(c => c.Email == email && c.Id != existingByCin.Id);
                if (emailInUse)
                {
                    return (null, "Client email already exists");
                }

                existingByCin.Email = email;
            }

            existingByCin.RevendeurId = revendeurId;
            existingByCin.FullName = fullName;
            existingByCin.Phone = phone;
            existingByCin.Address = address;
            existingByCin.City = city;

            return (existingByCin, null);
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var emailInUse = await _context.Clients.AnyAsync(c => c.Email == email);
            if (emailInUse)
            {
                return (null, "Client email already exists");
            }
        }

        var currentActiveClientCount = await GetActiveClientCountAsync(revendeurId);
        if (currentActiveClientCount >= activeClientLimit)
        {
            return (null, $"Active client limit reached ({activeClientLimit}).");
        }

        var client = new Client
        {
            FullName = fullName,
            Email = email,
            Phone = phone,
            RevendeurId = revendeurId,
            CIN = cin,
            Address = address,
            City = city,
            CreatedAt = DateTime.UtcNow
        };

        _context.Clients.Add(client);

        return (client, null);
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

    private bool TryGetCurrentUserId(out int currentUserId)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out currentUserId);
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        return ex.InnerException is SqlException sqlException
            && (sqlException.Number == 2601 || sqlException.Number == 2627);
    }

    private async Task TrySendInvoiceCreatedEmailAsync(Client client, Invoice invoice, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(client.Email))
        {
            _logger.LogInformation("Skipping invoice email for invoice {InvoiceId} because the client has no email address.", invoice.Id);
            return;
        }

        try
        {
            await _applicationEmailService.SendInvoiceCreatedAsync(
                client.Email.Trim(),
                client.FullName,
                string.IsNullOrWhiteSpace(invoice.InvoiceNumber) ? invoice.Id.ToString() : invoice.InvoiceNumber,
                invoice.TotalAmount,
                "Your invoice has been created successfully in Mototun.",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send invoice email for invoice {InvoiceId} to {Email}", invoice.Id, client.Email);
        }
    }

    private async Task<IReadOnlyCollection<EmailAttachment>> BuildDossierEmailAttachmentsAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        var latestDocuments = invoice.ClientPortalDocuments
            .OrderByDescending(document => document.UpdatedAt)
            .ThenByDescending(document => document.Id)
            .GroupBy(document => document.DocumentType)
            .Select(group => group.First())
            .ToList();

        if (latestDocuments.Count == 0)
        {
            return Array.Empty<EmailAttachment>();
        }

        var attachments = new List<EmailAttachment>(latestDocuments.Count);

        foreach (var document in latestDocuments)
        {
            var content = await _fileStorage.ReadAllBytesAsync(document.RelativePath, cancellationToken);
            if (content is null || content.Length == 0)
            {
                _logger.LogWarning(
                    "Skipping dossier email attachment for invoice {InvoiceId} because file {Path} was unavailable.",
                    invoice.Id,
                    document.RelativePath);
                continue;
            }

            var fallbackName = $"{SanitizeFileNameToken(ToDocumentLabel(document.DocumentType), "document")}-{document.Id}";
            var fileName = SanitizeZipEntryName(document.OriginalFileName, fallbackName);
            if (string.IsNullOrWhiteSpace(Path.GetExtension(fileName)))
            {
                var extension = Path.GetExtension(document.StoredFileName);
                if (!string.IsNullOrWhiteSpace(extension))
                {
                    fileName = $"{fileName}{extension}";
                }
            }

            attachments.Add(new EmailAttachment(fileName, content, document.ContentType));
        }

        return attachments;
    }

    private static bool IsValidEmail(string value)
    {
        try
        {
            _ = new MailAddress(value);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string BuildDossierEmailHtml(Invoice invoice, SoldMotorcycle? sold, string? customMessage)
    {
        var docs = invoice.ClientPortalDocuments
            .OrderByDescending(d => d.UpdatedAt)
            .ThenByDescending(d => d.Id)
            .GroupBy(d => d.DocumentType)
            .Select(g => g.First())
            .ToList();

        var hasLegacyCin = docs.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = docs.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = docs.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasFacture = docs.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);
        var hasDeclaration = docs.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);

        var rows = new StringBuilder();
        rows.AppendLine(BuildDocumentRow("CIN (recto)", hasCinFront || hasLegacyCin));
        rows.AppendLine(BuildDocumentRow("CIN (verso)", hasCinBack || hasLegacyCin));
        rows.AppendLine(BuildDocumentRow("Facture", hasFacture));
        rows.AppendLine(BuildDocumentRow("Declaration d'impot", hasDeclaration));

        var safeCustom = string.IsNullOrWhiteSpace(customMessage)
            ? string.Empty
            : $"<p style=\"margin:16px 0 0 0;color:#334155;line-height:1.7;\">{System.Net.WebUtility.HtmlEncode(customMessage).Replace("\n", "<br/>")}</p>";

        return $"""
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(90deg,#0ea5e9,#2563eb);padding:20px 24px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;opacity:.9;">Mototun - Dossier Carte Grise</div>
          <div style="margin-top:8px;font-size:22px;font-weight:700;">Facture {System.Net.WebUtility.HtmlEncode(invoice.InvoiceNumber)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0;color:#334155;line-height:1.7;">Bonjour,</p>
          <p style="margin:12px 0 0 0;color:#334155;line-height:1.7;">
            Veuillez trouver ci-dessous le recapitulatif du dossier carte grise.
          </p>
          {safeCustom}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr style="background:#eff6ff;">
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e3a8a;">Client</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">{System.Net.WebUtility.HtmlEncode(invoice.Client.FullName)}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e3a8a;">Moto</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">{System.Net.WebUtility.HtmlEncode($"{sold?.Company} {sold?.Brand} {sold?.Model}".Trim())}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e3a8a;">Chassis</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">{System.Net.WebUtility.HtmlEncode(sold?.ChassisNumber ?? "-")}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;font-weight:700;color:#1e3a8a;">Montant</td>
              <td style="padding:10px 12px;color:#0f172a;">{invoice.TotalAmount:0.000} TND</td>
            </tr>
          </table>

          <h3 style="margin:20px 0 10px 0;color:#0f172a;font-size:16px;">Etat des documents</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <th align="left" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.7px;">Document</th>
              <th align="left" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.7px;">Statut</th>
            </tr>
            {rows}
          </table>

          <p style="margin:20px 0 0 0;color:#64748b;font-size:12px;line-height:1.6;">
            Message automatique envoye par Mototun. Merci de ne pas repondre directement a cet email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
""";
    }

    private static string BuildDocumentRow(string label, bool uploaded)
    {
        var statusText = uploaded ? "Recu" : "Manquant";
        var statusColor = uploaded ? "#15803d" : "#b45309";
        return $"""
<tr>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">{System.Net.WebUtility.HtmlEncode(label)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:{statusColor};font-weight:700;">{statusText}</td>
</tr>
""";
    }

    private static string BuildFactureFileName(Invoice invoice)
    {
        var numberToken = SanitizeFileNameToken(invoice.InvoiceNumber, "numero_facture");
        var clientToken = SanitizeFileNameToken(invoice.Client?.FullName, "nomclient");
        return $"fac-{clientToken}-{numberToken}.pdf";
    }

    private static string SanitizeFileNameToken(string? value, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var cleaned = new string(value
            .Trim()
            .Select(ch => char.IsLetterOrDigit(ch) ? char.ToLowerInvariant(ch) : '-')
            .ToArray());

        while (cleaned.Contains("--", StringComparison.Ordinal))
        {
            cleaned = cleaned.Replace("--", "-", StringComparison.Ordinal);
        }

        cleaned = cleaned.Trim('-');

        return string.IsNullOrWhiteSpace(cleaned) ? fallback : cleaned;
    }

    private static string SanitizeUploadFileName(string fileName)
    {
        var safe = Path.GetFileName(fileName);
        return string.IsNullOrWhiteSpace(safe) ? $"document-{Guid.NewGuid():N}" : safe;
    }

    private static string SanitizeZipEntryName(string? fileName, string fallback)
    {
        var safe = Path.GetFileName(fileName ?? string.Empty);
        if (string.IsNullOrWhiteSpace(safe))
        {
            safe = fallback;
        }

        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(safe.Select(ch => invalid.Contains(ch) ? '-' : ch).ToArray())
            .Replace('/', '-')
            .Replace('\\', '-')
            .Trim();

        return string.IsNullOrWhiteSpace(cleaned) ? fallback : cleaned;
    }

    private static string EnsureUniqueEntryName(string entryName, ISet<string> usedNames)
    {
        var normalized = string.IsNullOrWhiteSpace(entryName) ? "document" : entryName;
        var baseName = Path.GetFileNameWithoutExtension(normalized);
        var extension = Path.GetExtension(normalized);
        var candidate = normalized;
        var suffix = 2;

        while (!usedNames.Add(candidate))
        {
            candidate = $"{baseName}-{suffix}{extension}";
            suffix += 1;
        }

        return candidate;
    }

    private static string? ValidateInvoiceSettingsImageUpload(IFormFile? file, string label)
    {
        if (file is null)
        {
            return null;
        }

        if (file.Length <= 0)
        {
            return $"{label} file is empty";
        }

        if (file.Length > MaxInvoiceSettingsImageUploadBytes)
        {
            return $"{label} file exceeds maximum allowed size (5 MB)";
        }

        var extension = ResolveUploadExtension(file);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedInvoiceSettingsImageExtensions.Contains(extension))
        {
            return $"{label} format non supporte ({file.ContentType}). Utilisez PNG, JPG, WEBP, BMP, JFIF, HEIC/HEIF ou AVIF";
        }

        return null;
    }

    private static string ResolveUploadExtension(IFormFile file)
    {
        var fromName = Path.GetExtension(file.FileName);
        if (!string.IsNullOrWhiteSpace(fromName) && AllowedDocumentExtensions.Contains(fromName))
        {
            return fromName.ToLowerInvariant();
        }

        var fromContentType = (file.ContentType ?? string.Empty).ToLowerInvariant() switch
        {
            "application/pdf" => ".pdf",
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

        var sniffed = TryDetectExtensionFromSignature(file);
        if (!string.IsNullOrWhiteSpace(sniffed))
        {
            return sniffed;
        }

        return string.IsNullOrWhiteSpace(fromName) ? string.Empty : fromName.ToLowerInvariant();
    }

    private static string TryDetectExtensionFromSignature(IFormFile file)
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

            if (read >= 4 && buffer[0] == 0x25 && buffer[1] == 0x50 && buffer[2] == 0x44 && buffer[3] == 0x46)
            {
                return ".pdf";
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
            return string.Empty;
        }

        return string.Empty;
    }

    public class UploadInvoiceDocumentForm
    {
        public int DocumentType { get; set; }
        public IFormFile? File { get; set; }
    }

    public class SendDossierEmailDto
    {
        public string To { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string? Message { get; set; }
        public bool MarkAsSentToCompany { get; set; }
    }

    public class InvoicePdfCustomizationQuery
    {
        public string? BrandName { get; set; }
        public string? BrandTagline { get; set; }
        public string? DocumentTitle { get; set; }
        public string? SellerBlockTitle { get; set; }
        public string? ClientBlockTitle { get; set; }
        public string? InvoiceDateLabel { get; set; }
        public string? InvoiceNumberLabel { get; set; }
        public string? InvoiceNumberPrefix { get; set; }
        public int? InvoiceNumberStart { get; set; }
        public string? DueDateLabel { get; set; }
        public string? PaymentLabel { get; set; }
        public string? ReferenceLabel { get; set; }
        public string? AdditionalInfoLabel { get; set; }
        public string? AdditionalInfoValue { get; set; }
        public string? PaymentTermText { get; set; }
        public string? ReferencePrefix { get; set; }
        public int? DueInDays { get; set; }
        public string? DefaultUnit { get; set; }
        public string? TableHeaderDescription { get; set; }
        public string? TableHeaderQuantity { get; set; }
        public string? TableHeaderUnit { get; set; }
        public string? TableHeaderUnitPrice { get; set; }
        public string? TableHeaderTaxRate { get; set; }
        public string? TableHeaderTaxAmount { get; set; }
        public string? TableHeaderTotal { get; set; }
        public string? TotalsSubtotalLabel { get; set; }
        public string? TotalsTaxLabel { get; set; }
        public string? TotalsTotalLabel { get; set; }
        public string? FooterColumn1Title { get; set; }
        public string? FooterColumn2Title { get; set; }
        public string? FooterColumn3Title { get; set; }
        public string? FooterColumn1Line1 { get; set; }
        public string? FooterColumn1Line2 { get; set; }
        public string? FooterColumn1Line3 { get; set; }
        public string? FooterColumn2Line1 { get; set; }
        public string? FooterColumn2Line2 { get; set; }
        public string? FooterColumn2Line3 { get; set; }
        public string? FooterColumn3Line1 { get; set; }
        public string? FooterColumn3Line2 { get; set; }
        public string? FooterColumn3Line3 { get; set; }
        public string? FontFamily { get; set; }
        public double? TitleFontSize { get; set; }
        public double? HeadingFontSize { get; set; }
        public double? BodyFontSize { get; set; }
        public double? SmallFontSize { get; set; }
        public string? LogoDataUrl { get; set; }
        public string? SignatureDataUrl { get; set; }
        public string? StampDataUrl { get; set; }
        public double? LogoX { get; set; }
        public double? LogoY { get; set; }
        public double? LogoSize { get; set; }
        public double? SellerBlockX { get; set; }
        public double? SellerBlockY { get; set; }
        public double? SellerBlockWidth { get; set; }
        public double? ClientBlockX { get; set; }
        public double? ClientBlockY { get; set; }
        public double? ClientBlockWidth { get; set; }
        public double? MetadataX { get; set; }
        public double? MetadataY { get; set; }
        public double? MetadataWidth { get; set; }
        public double? AdditionalInfoX { get; set; }
        public double? AdditionalInfoY { get; set; }
        public double? AdditionalInfoWidth { get; set; }
        public double? TableX { get; set; }
        public double? TableY { get; set; }
        public double? TableWidth { get; set; }
        public double? TotalsX { get; set; }
        public double? TotalsY { get; set; }
        public double? TotalsWidth { get; set; }
        public double? TotalWordsX { get; set; }
        public double? TotalWordsY { get; set; }
        public double? TotalWordsWidth { get; set; }
        public double? SignatureBlockX { get; set; }
        public double? SignatureBlockY { get; set; }
        public double? SignatureBlockWidth { get; set; }
        public double? FooterY { get; set; }
        public double? FooterWidth { get; set; }
        public string? AccentColorHex { get; set; }
        public string? PageBackgroundHex { get; set; }
        public string? BodyTextColorHex { get; set; }
        public string? MutedTextColorHex { get; set; }
        public string? DividerColorHex { get; set; }
        public string? TableHeaderBackgroundHex { get; set; }
        public string? TableHeaderTextColorHex { get; set; }
        public string? TableBorderColorHex { get; set; }
        public string? TableAlternateRowColorHex { get; set; }
        public string? ServiceTitle { get; set; }
        public string? FooterTitle { get; set; }
        public string? FooterLine1 { get; set; }
        public string? FooterLine2 { get; set; }
        public bool? ShowHeader { get; set; }
        public bool? ShowLogo { get; set; }
        public bool? ShowSellerBlock { get; set; }
        public bool? ShowClientBlock { get; set; }
        public bool? ShowMetadata { get; set; }
        public bool? ShowAdditionalInfo { get; set; }
        public bool? ShowTable { get; set; }
        public bool? ShowTotals { get; set; }
        public bool? ShowFooter { get; set; }
        public bool? ShowTotalInWords { get; set; }
        public string? TotalInWordsLabel { get; set; }
        public List<InvoicePdfCustomElementDto>? CustomElements { get; set; }
    }

    public class UpdateInvoicePdfSettingsDto
    {
        public string? BrandName { get; set; }
        public string? BrandTagline { get; set; }
        public string? DocumentTitle { get; set; }
        public string? SellerBlockTitle { get; set; }
        public string? ClientBlockTitle { get; set; }
        public string? InvoiceDateLabel { get; set; }
        public string? InvoiceNumberLabel { get; set; }
        public string? InvoiceNumberPrefix { get; set; }
        public int? InvoiceNumberStart { get; set; }
        public string? DueDateLabel { get; set; }
        public string? PaymentLabel { get; set; }
        public string? ReferenceLabel { get; set; }
        public string? AdditionalInfoLabel { get; set; }
        public string? AdditionalInfoValue { get; set; }
        public string? PaymentTermText { get; set; }
        public string? ReferencePrefix { get; set; }
        public int? DueInDays { get; set; }
        public string? DefaultUnit { get; set; }
        public string? TableHeaderDescription { get; set; }
        public string? TableHeaderQuantity { get; set; }
        public string? TableHeaderUnit { get; set; }
        public string? TableHeaderUnitPrice { get; set; }
        public string? TableHeaderTaxRate { get; set; }
        public string? TableHeaderTaxAmount { get; set; }
        public string? TableHeaderTotal { get; set; }
        public string? TotalsSubtotalLabel { get; set; }
        public string? TotalsTaxLabel { get; set; }
        public string? TotalsTotalLabel { get; set; }
        public string? FooterColumn1Title { get; set; }
        public string? FooterColumn2Title { get; set; }
        public string? FooterColumn3Title { get; set; }
        public string? FooterColumn1Line1 { get; set; }
        public string? FooterColumn1Line2 { get; set; }
        public string? FooterColumn1Line3 { get; set; }
        public string? FooterColumn2Line1 { get; set; }
        public string? FooterColumn2Line2 { get; set; }
        public string? FooterColumn2Line3 { get; set; }
        public string? FooterColumn3Line1 { get; set; }
        public string? FooterColumn3Line2 { get; set; }
        public string? FooterColumn3Line3 { get; set; }
        public string? FontFamily { get; set; }
        public double? TitleFontSize { get; set; }
        public double? HeadingFontSize { get; set; }
        public double? BodyFontSize { get; set; }
        public double? SmallFontSize { get; set; }
        public string? LogoDataUrl { get; set; }
        public string? SignatureDataUrl { get; set; }
        public string? StampDataUrl { get; set; }
        public double? LogoX { get; set; }
        public double? LogoY { get; set; }
        public double? LogoSize { get; set; }
        public double? SellerBlockX { get; set; }
        public double? SellerBlockY { get; set; }
        public double? SellerBlockWidth { get; set; }
        public double? ClientBlockX { get; set; }
        public double? ClientBlockY { get; set; }
        public double? ClientBlockWidth { get; set; }
        public double? MetadataX { get; set; }
        public double? MetadataY { get; set; }
        public double? MetadataWidth { get; set; }
        public double? AdditionalInfoX { get; set; }
        public double? AdditionalInfoY { get; set; }
        public double? AdditionalInfoWidth { get; set; }
        public double? TableX { get; set; }
        public double? TableY { get; set; }
        public double? TableWidth { get; set; }
        public double? TotalsX { get; set; }
        public double? TotalsY { get; set; }
        public double? TotalsWidth { get; set; }
        public double? TotalWordsX { get; set; }
        public double? TotalWordsY { get; set; }
        public double? TotalWordsWidth { get; set; }
        public double? SignatureBlockX { get; set; }
        public double? SignatureBlockY { get; set; }
        public double? SignatureBlockWidth { get; set; }
        public double? FooterY { get; set; }
        public double? FooterWidth { get; set; }
        public string? AccentColorHex { get; set; }
        public string? PageBackgroundHex { get; set; }
        public string? BodyTextColorHex { get; set; }
        public string? MutedTextColorHex { get; set; }
        public string? DividerColorHex { get; set; }
        public string? TableHeaderBackgroundHex { get; set; }
        public string? TableHeaderTextColorHex { get; set; }
        public string? TableBorderColorHex { get; set; }
        public string? TableAlternateRowColorHex { get; set; }
        public string? ServiceTitle { get; set; }
        public string? FooterTitle { get; set; }
        public string? FooterLine1 { get; set; }
        public string? FooterLine2 { get; set; }
        public bool? ShowHeader { get; set; }
        public bool? ShowLogo { get; set; }
        public bool? ShowSellerBlock { get; set; }
        public bool? ShowClientBlock { get; set; }
        public bool? ShowMetadata { get; set; }
        public bool? ShowAdditionalInfo { get; set; }
        public bool? ShowTable { get; set; }
        public bool? ShowTotals { get; set; }
        public bool? ShowFooter { get; set; }
        public bool? ShowTotalInWords { get; set; }
        public string? TotalInWordsLabel { get; set; }
        public List<InvoicePdfCustomElementDto>? CustomElements { get; set; }
        public bool ResetToDefault { get; set; }
    }

    public class InvoicePdfSettingsDto
    {
        public string BrandName { get; set; } = string.Empty;
        public string BrandTagline { get; set; } = string.Empty;
        public string DocumentTitle { get; set; } = string.Empty;
        public string SellerBlockTitle { get; set; } = string.Empty;
        public string ClientBlockTitle { get; set; } = string.Empty;
        public string InvoiceDateLabel { get; set; } = string.Empty;
        public string InvoiceNumberLabel { get; set; } = string.Empty;
        public string InvoiceNumberPrefix { get; set; } = string.Empty;
        public int InvoiceNumberStart { get; set; }
        public string DueDateLabel { get; set; } = string.Empty;
        public string PaymentLabel { get; set; } = string.Empty;
        public string ReferenceLabel { get; set; } = string.Empty;
        public string AdditionalInfoLabel { get; set; } = string.Empty;
        public string AdditionalInfoValue { get; set; } = string.Empty;
        public string PaymentTermText { get; set; } = string.Empty;
        public string ReferencePrefix { get; set; } = string.Empty;
        public int DueInDays { get; set; }
        public string DefaultUnit { get; set; } = string.Empty;
        public string TableHeaderDescription { get; set; } = string.Empty;
        public string TableHeaderQuantity { get; set; } = string.Empty;
        public string TableHeaderUnit { get; set; } = string.Empty;
        public string TableHeaderUnitPrice { get; set; } = string.Empty;
        public string TableHeaderTaxRate { get; set; } = string.Empty;
        public string TableHeaderTaxAmount { get; set; } = string.Empty;
        public string TableHeaderTotal { get; set; } = string.Empty;
        public string TotalsSubtotalLabel { get; set; } = string.Empty;
        public string TotalsTaxLabel { get; set; } = string.Empty;
        public string TotalsTotalLabel { get; set; } = string.Empty;
        public string FooterColumn1Title { get; set; } = string.Empty;
        public string FooterColumn2Title { get; set; } = string.Empty;
        public string FooterColumn3Title { get; set; } = string.Empty;
        public string FooterColumn1Line1 { get; set; } = string.Empty;
        public string FooterColumn1Line2 { get; set; } = string.Empty;
        public string FooterColumn1Line3 { get; set; } = string.Empty;
        public string FooterColumn2Line1 { get; set; } = string.Empty;
        public string FooterColumn2Line2 { get; set; } = string.Empty;
        public string FooterColumn2Line3 { get; set; } = string.Empty;
        public string FooterColumn3Line1 { get; set; } = string.Empty;
        public string FooterColumn3Line2 { get; set; } = string.Empty;
        public string FooterColumn3Line3 { get; set; } = string.Empty;
        public string FontFamily { get; set; } = string.Empty;
        public double TitleFontSize { get; set; }
        public double HeadingFontSize { get; set; }
        public double BodyFontSize { get; set; }
        public double SmallFontSize { get; set; }
        public string LogoDataUrl { get; set; } = string.Empty;
        public string SignatureDataUrl { get; set; } = string.Empty;
        public string StampDataUrl { get; set; } = string.Empty;
        public double LogoX { get; set; }
        public double LogoY { get; set; }
        public double LogoSize { get; set; }
        public double SellerBlockX { get; set; }
        public double SellerBlockY { get; set; }
        public double SellerBlockWidth { get; set; }
        public double ClientBlockX { get; set; }
        public double ClientBlockY { get; set; }
        public double ClientBlockWidth { get; set; }
        public double MetadataX { get; set; }
        public double MetadataY { get; set; }
        public double MetadataWidth { get; set; }
        public double AdditionalInfoX { get; set; }
        public double AdditionalInfoY { get; set; }
        public double AdditionalInfoWidth { get; set; }
        public double TableX { get; set; }
        public double TableY { get; set; }
        public double TableWidth { get; set; }
        public double TotalsX { get; set; }
        public double TotalsY { get; set; }
        public double TotalsWidth { get; set; }
        public double TotalWordsX { get; set; }
        public double TotalWordsY { get; set; }
        public double TotalWordsWidth { get; set; }
        public double SignatureBlockX { get; set; }
        public double SignatureBlockY { get; set; }
        public double SignatureBlockWidth { get; set; }
        public double FooterY { get; set; }
        public double FooterWidth { get; set; }
        public string AccentColorHex { get; set; } = string.Empty;
        public string PageBackgroundHex { get; set; } = string.Empty;
        public string BodyTextColorHex { get; set; } = string.Empty;
        public string MutedTextColorHex { get; set; } = string.Empty;
        public string DividerColorHex { get; set; } = string.Empty;
        public string TableHeaderBackgroundHex { get; set; } = string.Empty;
        public string TableHeaderTextColorHex { get; set; } = string.Empty;
        public string TableBorderColorHex { get; set; } = string.Empty;
        public string TableAlternateRowColorHex { get; set; } = string.Empty;
        public string ServiceTitle { get; set; } = string.Empty;
        public string FooterTitle { get; set; } = string.Empty;
        public string FooterLine1 { get; set; } = string.Empty;
        public string FooterLine2 { get; set; } = string.Empty;
        public bool ShowHeader { get; set; }
        public bool ShowLogo { get; set; }
        public bool ShowSellerBlock { get; set; }
        public bool ShowClientBlock { get; set; }
        public bool ShowMetadata { get; set; }
        public bool ShowAdditionalInfo { get; set; }
        public bool ShowTable { get; set; }
        public bool ShowTotals { get; set; }
        public bool ShowFooter { get; set; }
        public bool ShowTotalInWords { get; set; }
        public string TotalInWordsLabel { get; set; } = string.Empty;
        public List<InvoicePdfCustomElementDto> CustomElements { get; set; } = new();
        public bool HasCustomSettings { get; set; }
    }

    public class InvoicePdfCustomElementDto
    {
        public string? Id { get; set; }
        public string? Type { get; set; }
        public string? Text { get; set; }
        public double? X { get; set; }
        public double? Y { get; set; }
        public double? Width { get; set; }
        public double? Height { get; set; }
        public double? FontSize { get; set; }
        public string? ColorHex { get; set; }
        public string? BackgroundColorHex { get; set; }
        public string? StrokeColorHex { get; set; }
        public double? StrokeWidth { get; set; }
        public string? SrcDataUrl { get; set; }
        public bool Bold { get; set; }
        public bool Italic { get; set; }
        public string? Align { get; set; }
        public bool Visible { get; set; } = true;
        public int? ZIndex { get; set; }
    }
}
