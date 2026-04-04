namespace mototun.API.Services.Storage;

public interface IFileStorage
{
    Task SaveAsync(string storageKey, Stream content, string? contentType = null, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default);
    Task<byte[]?> ReadAllBytesAsync(string storageKey, CancellationToken cancellationToken = default);
    Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken = default);
    Task<Uri?> GenerateSasUriAsync(string storageKey, TimeSpan? expiry = null, CancellationToken cancellationToken = default);
}
