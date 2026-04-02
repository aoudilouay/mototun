using mototun.Core.Entities;
using mototun.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace mototun.Infrastructure.Services;

/// <summary>
/// Simplified invoice settings service.
/// Stores and retrieves: company name, logo image, signature image.
/// No complex customization - uses fixed professional template.
/// </summary>
public interface IInvoiceSettingsService
{
    Task<RevendeurInvoiceSettings?> GetSettingsAsync(int revendeurId);
    Task SaveSettingsAsync(int revendeurId, RevendeurInvoiceSettings settings);
    Task<byte[]?> GetLogoAsync(int revendeurId);
    Task<byte[]?> GetSignatureAsync(int revendeurId);
    Task SetLogoAsync(int revendeurId, byte[]? logoBytes);
    Task SetSignatureAsync(int revendeurId, byte[]? signatureBytes);
}

public class InvoiceSettingsService : IInvoiceSettingsService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<InvoiceSettingsService> _logger;

    public InvoiceSettingsService(ApplicationDbContext dbContext, ILogger<InvoiceSettingsService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<RevendeurInvoiceSettings?> GetSettingsAsync(int revendeurId)
    {
        try
        {
            var settings = await _dbContext.RevendeurInvoiceSettings.FindAsync(revendeurId);
            return settings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoice settings for revendeur {RevendeurId}", revendeurId);
            return null;
        }
    }

    public async Task SaveSettingsAsync(int revendeurId, RevendeurInvoiceSettings settings)
    {
        try
        {
            var existing = await _dbContext.RevendeurInvoiceSettings.FindAsync(revendeurId);

            if (existing != null)
            {
                existing.CompanyName = settings.CompanyName;
                if (settings.LogoImage != null)
                {
                    existing.LogoImage = settings.LogoImage;
                }
                if (settings.SignatureImage != null)
                {
                    existing.SignatureImage = settings.SignatureImage;
                }
                _dbContext.RevendeurInvoiceSettings.Update(existing);
            }
            else
            {
                settings.RevendeurId = revendeurId;
                _dbContext.RevendeurInvoiceSettings.Add(settings);
            }

            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving invoice settings for revendeur {RevendeurId}", revendeurId);
            throw;
        }
    }

    public async Task<byte[]?> GetLogoAsync(int revendeurId)
    {
        var settings = await GetSettingsAsync(revendeurId);
        return settings?.LogoImage;
    }

    public async Task<byte[]?> GetSignatureAsync(int revendeurId)
    {
        var settings = await GetSettingsAsync(revendeurId);
        return settings?.SignatureImage;
    }

    public async Task SetLogoAsync(int revendeurId, byte[]? logoBytes)
    {
        var settings = await GetSettingsAsync(revendeurId) ?? new RevendeurInvoiceSettings { RevendeurId = revendeurId };
        settings.LogoImage = logoBytes;
        await SaveSettingsAsync(revendeurId, settings);
    }

    public async Task SetSignatureAsync(int revendeurId, byte[]? signatureBytes)
    {
        var settings = await GetSettingsAsync(revendeurId) ?? new RevendeurInvoiceSettings { RevendeurId = revendeurId };
        settings.SignatureImage = signatureBytes;
        await SaveSettingsAsync(revendeurId, settings);
    }
}
