using System.Text.Json;
using mototun.API.Extensions;

namespace mototun.API.Services.InvoicePdf;

public class FileInvoicePdfSettingsStore : IInvoicePdfSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FileInvoicePdfSettingsStore> _logger;

    public FileInvoicePdfSettingsStore(
        IWebHostEnvironment environment,
        ILogger<FileInvoicePdfSettingsStore> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async Task<InvoicePdfCustomization?> GetRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default)
    {
        if (revendeurId <= 0)
        {
            return null;
        }

        var filePath = GetSettingsFilePath(revendeurId);
        if (!File.Exists(filePath))
        {
            return null;
        }

        try
        {
            await using var stream = File.OpenRead(filePath);
            return await JsonSerializer.DeserializeAsync<InvoicePdfCustomization>(stream, JsonOptions, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read invoice PDF customization for revendeur {RevendeurId}", revendeurId);
            return null;
        }
    }

    public async Task SaveRevendeurCustomizationAsync(int revendeurId, InvoicePdfCustomization customization, CancellationToken cancellationToken = default)
    {
        if (revendeurId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revendeurId));
        }

        var filePath = GetSettingsFilePath(revendeurId);
        var directory = Path.GetDirectoryName(filePath)!;
        Directory.CreateDirectory(directory);

        var tempFilePath = $"{filePath}.{Guid.NewGuid():N}.tmp";

        await using (var stream = File.Create(tempFilePath))
        {
            await JsonSerializer.SerializeAsync(stream, customization, JsonOptions, cancellationToken);
        }

        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        File.Move(tempFilePath, filePath);
    }

    public Task DeleteRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default)
    {
        if (revendeurId <= 0)
        {
            return Task.CompletedTask;
        }

        var filePath = GetSettingsFilePath(revendeurId);
        if (File.Exists(filePath))
        {
            try
            {
                File.Delete(filePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete invoice PDF customization for revendeur {RevendeurId}", revendeurId);
            }
        }

        return Task.CompletedTask;
    }

    private string GetSettingsFilePath(int revendeurId)
    {
        return Path.Combine(GetStableContentRoot(), "Storage", "InvoicePdfSettings", $"{revendeurId}.json");
    }

    private string GetStableContentRoot()
    {
        var contentRoot = _environment.ContentRootPath;
        var marker = $"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}";
        var markerIndex = contentRoot.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex > 0)
        {
            var projectRoot = contentRoot[..markerIndex];
            if (Directory.Exists(projectRoot))
            {
                return projectRoot;
            }
        }

        return contentRoot;
    }
}
