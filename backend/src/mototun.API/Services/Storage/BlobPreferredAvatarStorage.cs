namespace mototun.API.Services.Storage;

public sealed class BlobPreferredAvatarStorage : IAvatarStorage
{
    private readonly AzureBlobAvatarStorage _blobStorage;
    private readonly LocalAvatarStorage _localStorage;

    public BlobPreferredAvatarStorage(
        AzureBlobAvatarStorage blobStorage,
        LocalAvatarStorage localStorage)
    {
        _blobStorage = blobStorage;
        _localStorage = localStorage;
    }

    public Task SaveAsync(string storageKey, Stream content, string? contentType = null, CancellationToken cancellationToken = default)
    {
        return _blobStorage.SaveAsync(storageKey, content, contentType, cancellationToken);
    }

    public async Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var blobStream = await _blobStorage.OpenReadAsync(storageKey, cancellationToken);
        if (blobStream is not null)
        {
            return blobStream;
        }

        return await _localStorage.OpenReadAsync(storageKey, cancellationToken);
    }

    public async Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        await _blobStorage.DeleteIfExistsAsync(storageKey, cancellationToken);
        await _localStorage.DeleteIfExistsAsync(storageKey, cancellationToken);
    }
}
