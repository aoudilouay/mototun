using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

namespace mototun.API.Services.Storage;

public sealed class AzureBlobAvatarStorage : IAvatarStorage
{
    private readonly BlobContainerClient _avatarsContainer;
    private readonly ILogger<AzureBlobAvatarStorage> _logger;

    public AzureBlobAvatarStorage(
        IOptions<AzureBlobOptions> options,
        ILogger<AzureBlobAvatarStorage> logger)
    {
        var blobOptions = options.Value;
        if (string.IsNullOrWhiteSpace(blobOptions.ConnectionString))
        {
            throw new InvalidOperationException("Azure Blob connection string is not configured.");
        }

        _avatarsContainer = new BlobContainerClient(blobOptions.ConnectionString, blobOptions.AvatarsContainer);
        _logger = logger;
    }

    public async Task SaveAsync(string storageKey, Stream content, string? contentType = null, CancellationToken cancellationToken = default)
    {
        var blobClient = _avatarsContainer.GetBlobClient(NormalizeKey(storageKey));
        await _avatarsContainer.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

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
            var blobClient = _avatarsContainer.GetBlobClient(NormalizeKey(storageKey));
            return await blobClient.OpenReadAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var blobClient = _avatarsContainer.GetBlobClient(NormalizeKey(storageKey));
            await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete blob avatar for storage key {StorageKey}", storageKey);
        }
    }

    private static string NormalizeKey(string storageKey)
    {
        return storageKey.Replace('\\', '/').TrimStart('/');
    }
}
