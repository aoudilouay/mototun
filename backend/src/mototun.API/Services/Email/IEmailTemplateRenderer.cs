namespace mototun.API.Services.Email;

public interface IEmailTemplateRenderer
{
    Task<string> RenderAsync(
        string templateName,
        IReadOnlyDictionary<string, string?> placeholders,
        CancellationToken cancellationToken = default);
}
