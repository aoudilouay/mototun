using mototun.API.Services.Documents;

namespace mototun.API.Services.Storage;

public sealed class LocalAvatarStorage : IAvatarStorage
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LocalAvatarStorage> _logger;

    public LocalAvatarStorage(
        IWebHostEnvironment environment,
        ILogger<LocalAvatarStorage> logger)
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
            _logger.LogWarning(ex, "Failed to delete local avatar for storage key {StorageKey}", storageKey);
        }

        return Task.CompletedTask;
    }

    private string ResolveAbsolutePath(string storageKey)
    {
        var normalizedStorageKey = NormalizeStorageKey(storageKey);
        return ClientPortalStoragePaths.ResolveAbsolutePath(_environment.ContentRootPath, normalizedStorageKey);
    }

    private static string NormalizeStorageKey(string storageKey)
    {
        var normalized = (storageKey ?? string.Empty)
            .Replace('\\', '/')
            .Trim()
            .TrimStart('/');

        if (!normalized.StartsWith("Storage/Avatars/", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Avatar storage key must stay within Storage/Avatars.");
        }

        return normalized;
    }
}
