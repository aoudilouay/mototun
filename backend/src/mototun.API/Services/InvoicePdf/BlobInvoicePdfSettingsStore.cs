using System.Text.Json;
using Azure;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Options;
using mototun.API.Extensions;
using mototun.API.Services.Storage;

namespace mototun.API.Services.InvoicePdf;

public sealed class BlobInvoicePdfSettingsStore : IInvoicePdfSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private readonly BlobContainerClient _containerClient;
    private readonly ILogger<BlobInvoicePdfSettingsStore> _logger;

    public BlobInvoicePdfSettingsStore(
        IOptions<AzureBlobOptions> options,
        ILogger<BlobInvoicePdfSettingsStore> logger)
    {
        var blobOptions = options.Value;
        if (string.IsNullOrWhiteSpace(blobOptions.ConnectionString))
        {
            throw new InvalidOperationException("Azure Blob connection string is not configured.");
        }

        _containerClient = new BlobContainerClient(blobOptions.ConnectionString, blobOptions.InvoiceSettingsContainer);
        _logger = logger;
    }

    public async Task<InvoicePdfCustomization?> GetRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default)
    {
        if (revendeurId <= 0)
        {
            return null;
        }

        try
        {
            var blobClient = _containerClient.GetBlobClient(BuildBlobName(revendeurId));
            await using var stream = await blobClient.OpenReadAsync(cancellationToken: cancellationToken);
            return await JsonSerializer.DeserializeAsync<InvoicePdfCustomization>(stream, JsonOptions, cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read invoice PDF customization from Blob for revendeur {RevendeurId}", revendeurId);
            return null;
        }
    }

    public async Task SaveRevendeurCustomizationAsync(int revendeurId, InvoicePdfCustomization customization, CancellationToken cancellationToken = default)
    {
        if (revendeurId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revendeurId));
        }

        await _containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

        var blobClient = _containerClient.GetBlobClient(BuildBlobName(revendeurId));
        await using var stream = new MemoryStream();
        await JsonSerializer.SerializeAsync(stream, customization, JsonOptions, cancellationToken);
        stream.Position = 0;
        await blobClient.UploadAsync(stream, overwrite: true, cancellationToken);
    }

    public async Task DeleteRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default)
    {
        if (revendeurId <= 0)
        {
            return;
        }

        try
        {
            var blobClient = _containerClient.GetBlobClient(BuildBlobName(revendeurId));
            await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete invoice PDF customization from Blob for revendeur {RevendeurId}", revendeurId);
        }
    }

    private static string BuildBlobName(int revendeurId)
    {
        return $"revendeurs/{revendeurId}/invoice-pdf-settings.json";
    }
}
