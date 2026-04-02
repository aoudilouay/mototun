using mototun.API.Services.Documents;

namespace mototun.API.Services.Storage;

public sealed class LocalFileStorage : IFileStorage
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LocalFileStorage> _logger;

    public LocalFileStorage(
        IWebHostEnvironment environment,
        ILogger<LocalFileStorage> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async Task SaveAsync(string storageKey, Stream content, string? contentType = null, CancellationToken cancellationToken = default)
    {
        var absolutePath = ResolveAbsolutePath(storageKey);
        var directory = Path.GetDirectoryName(absolutePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        if (content.CanSeek)
        {
            content.Position = 0;
        }

        await using var stream = new FileStream(absolutePath, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(stream, cancellationToken);
    }

    public Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var absolutePath = ResolveAbsolutePath(storageKey);
        if (!File.Exists(absolutePath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public async Task<byte[]?> ReadAllBytesAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var absolutePath = ResolveAbsolutePath(storageKey);
        if (!File.Exists(absolutePath))
        {
            return null;
        }

        return await File.ReadAllBytesAsync(absolutePath, cancellationToken);
    }

    public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var absolutePath = ResolveAbsolutePath(storageKey);
        if (!File.Exists(absolutePath))
        {
            return Task.CompletedTask;
        }

        try
        {
            File.Delete(absolutePath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete local file for storage key {StorageKey}", storageKey);
        }

        return Task.CompletedTask;
    }

    private string ResolveAbsolutePath(string storageKey)
    {
        return ClientPortalStoragePaths.ResolveAbsolutePath(_environment.ContentRootPath, storageKey);
    }
}
