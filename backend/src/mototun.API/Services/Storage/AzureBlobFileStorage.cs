using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Options;

namespace mototun.API.Services.Storage;

public sealed class AzureBlobFileStorage : IFileStorage
{
    private readonly BlobContainerClient _documentsContainer;
    private readonly ILogger<AzureBlobFileStorage> _logger;

    public AzureBlobFileStorage(
        IOptions<AzureBlobOptions> options,
        ILogger<AzureBlobFileStorage> logger)
    {
        var blobOptions = options.Value;
        if (string.IsNullOrWhiteSpace(blobOptions.ConnectionString))
        {
            throw new InvalidOperationException("Azure Blob connection string is not configured.");
        }

        _documentsContainer = new BlobContainerClient(blobOptions.ConnectionString, blobOptions.DocumentsContainer);
        _logger = logger;
    }

    public async Task SaveAsync(string storageKey, Stream content, string? contentType = null, CancellationToken cancellationToken = default)
    {
        var blobClient = _documentsContainer.GetBlobClient(NormalizeKey(storageKey));
        await _documentsContainer.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

        if (content.CanSeek)
        {
            content.Position = 0;
        }

        var uploadOptions = new BlobUploadOptions();
        if (!string.IsNullOrWhiteSpace(contentType))
        {
            uploadOptions.HttpHeaders = new BlobHttpHeaders
            {
                ContentType = contentType
            };
        }

        await blobClient.UploadAsync(content, uploadOptions, cancellationToken);
    }

    public async Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var blobClient = _documentsContainer.GetBlobClient(NormalizeKey(storageKey));
            var response = await blobClient.OpenReadAsync(cancellationToken: cancellationToken);
            return response;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task<byte[]?> ReadAllBytesAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        await using var stream = await OpenReadAsync(storageKey, cancellationToken);
        if (stream is null)
        {
            return null;
        }

        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream, cancellationToken);
        return memoryStream.ToArray();
    }

    public async Task<Uri?> GenerateSasUriAsync(string storageKey, TimeSpan? expiry = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var blobClient = _documentsContainer.GetBlobClient(NormalizeKey(storageKey));

            // Verify blob exists
            var exists = await blobClient.ExistsAsync(cancellationToken);
            if (!exists.Value)
            {
                _logger.LogWarning("Attempted to generate SAS URL for non-existent blob: {StorageKey}", storageKey);
                return null;
            }

            // Generate SAS with read-only permissions, short expiry (default 10 minutes)
            var sasBuilder = new BlobSasBuilder(BlobSasPermissions.Read,
                DateTimeOffset.UtcNow.Add(expiry ?? TimeSpan.FromMinutes(10)))
            {
                BlobContainerName = _documentsContainer.Name,
                BlobName = NormalizeKey(storageKey)
            };

            // Generate the SAS URI
            var uri = blobClient.GenerateSasUri(sasBuilder);
            return uri;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate SAS URI for storage key {StorageKey}", storageKey);
            return null;
        }
    }

    public async Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var blobClient = _documentsContainer.GetBlobClient(NormalizeKey(storageKey));
            await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete blob for storage key {StorageKey}", storageKey);
        }
    }

    private static string NormalizeKey(string storageKey)
    {
        return storageKey.Replace('\\', '/').TrimStart('/');
    }
}
