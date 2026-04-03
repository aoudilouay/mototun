namespace mototun.API.Services.Storage;

public interface IAvatarStorage
{
    Task SaveAsync(string storageKey, Stream content, string? contentType = null, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default);
    Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken = default);
}
