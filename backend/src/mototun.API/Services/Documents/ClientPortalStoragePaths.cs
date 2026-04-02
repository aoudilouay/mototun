namespace mototun.API.Services.Documents;

public static class ClientPortalStoragePaths
{
    public static string GetStorageRoot(string contentRootPath, int invoiceId)
    {
        return Path.Combine(GetStableContentRoot(contentRootPath), "Storage", "ClientPortal", invoiceId.ToString());
    }

    public static string BuildRelativePath(int invoiceId, string storedFileName)
    {
        return Path.Combine("Storage", "ClientPortal", invoiceId.ToString(), storedFileName)
            .Replace('\\', '/');
    }

    public static string ResolveAbsolutePath(string contentRootPath, string relativePath)
    {
        var normalizedRelative = relativePath.Replace('/', Path.DirectorySeparatorChar);

        var primaryRoot = Path.GetFullPath(contentRootPath);
        var primaryPath = Path.GetFullPath(Path.Combine(primaryRoot, normalizedRelative));
        if (!primaryPath.StartsWith(primaryRoot, StringComparison.OrdinalIgnoreCase))
        {
            return Path.Combine(primaryRoot, "Storage", "__invalid__");
        }

        if (System.IO.File.Exists(primaryPath))
        {
            return primaryPath;
        }

        var stableRoot = GetStableContentRoot(contentRootPath);
        if (!string.Equals(stableRoot, contentRootPath, StringComparison.OrdinalIgnoreCase))
        {
            var stableRootFull = Path.GetFullPath(stableRoot);
            var fallbackPath = Path.GetFullPath(Path.Combine(stableRootFull, normalizedRelative));
            if (fallbackPath.StartsWith(stableRootFull, StringComparison.OrdinalIgnoreCase)
                && System.IO.File.Exists(fallbackPath))
            {
                return fallbackPath;
            }
        }

        return primaryPath;
    }

    public static void TryDeleteFile(string contentRootPath, string relativePath)
    {
        var absolutePath = ResolveAbsolutePath(contentRootPath, relativePath);
        if (System.IO.File.Exists(absolutePath))
        {
            System.IO.File.Delete(absolutePath);
        }
    }

    public static string GetStableContentRoot(string contentRootPath)
    {
        var marker = $"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}";
        var markerIndex = contentRootPath.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex > 0)
        {
            var projectRoot = contentRootPath[..markerIndex];
            if (Directory.Exists(projectRoot))
            {
                return projectRoot;
            }
        }

        return contentRootPath;
    }
}
