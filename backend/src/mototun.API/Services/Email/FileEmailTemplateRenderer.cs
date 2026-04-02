using System.Collections.Concurrent;

namespace mototun.API.Services.Email;

public sealed class FileEmailTemplateRenderer : IEmailTemplateRenderer
{
    private static readonly ConcurrentDictionary<string, string> TemplateCache = new(StringComparer.OrdinalIgnoreCase);

    private readonly IWebHostEnvironment _environment;

    public FileEmailTemplateRenderer(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> RenderAsync(
        string templateName,
        IReadOnlyDictionary<string, string?> placeholders,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(templateName))
        {
            throw new ArgumentException("Template name is required.", nameof(templateName));
        }

        var normalizedTemplateName = templateName.EndsWith(".html", StringComparison.OrdinalIgnoreCase)
            ? templateName
            : $"{templateName}.html";

        var template = await GetTemplateAsync(normalizedTemplateName, cancellationToken);
        var rendered = template;

        foreach (var placeholder in placeholders)
        {
            rendered = rendered.Replace(
                $"{{{{{placeholder.Key}}}}}",
                placeholder.Value ?? string.Empty,
                StringComparison.Ordinal);
        }

        return rendered;
    }

    private async Task<string> GetTemplateAsync(string templateName, CancellationToken cancellationToken)
    {
        if (TemplateCache.TryGetValue(templateName, out var cachedTemplate))
        {
            return cachedTemplate;
        }

        var templatePath = Path.Combine(_environment.ContentRootPath, "Templates", "Emails", templateName);
        if (!File.Exists(templatePath))
        {
            throw new FileNotFoundException($"Email template '{templateName}' was not found.", templatePath);
        }

        var template = await File.ReadAllTextAsync(templatePath, cancellationToken);
        TemplateCache[templateName] = template;
        return template;
    }
}
