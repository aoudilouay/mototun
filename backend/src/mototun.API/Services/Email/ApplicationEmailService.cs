using System.Globalization;
using System.Net;

namespace mototun.API.Services.Email;

public sealed class ApplicationEmailService : IApplicationEmailService
{
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateRenderer _templateRenderer;

    public ApplicationEmailService(IEmailSender emailSender, IEmailTemplateRenderer templateRenderer)
    {
        _emailSender = emailSender;
        _templateRenderer = templateRenderer;
    }

    public async Task SendPasswordResetAsync(
        string recipientEmail,
        string? userName,
        string resetLink,
        int expiryMinutes,
        CancellationToken cancellationToken = default)
    {
        var subject = "Reset your Tunimoto password";
        var html = await _templateRenderer.RenderAsync(
            "PasswordResetTemplate",
            CreateBasePlaceholders(new Dictionary<string, string?>
            {
                ["USER_NAME"] = EncodeInlineText(userName, "there"),
                ["RESET_LINK"] = EncodeInlineText(resetLink),
                ["EXPIRY_MINUTES"] = expiryMinutes.ToString(CultureInfo.InvariantCulture),
                ["MESSAGE"] = EncodeMultilineText("We received a request to reset your Tunimoto password.")
            }),
            cancellationToken);

        await _emailSender.SendHtmlAsync(recipientEmail, subject, html, cancellationToken);
    }

    public async Task SendWelcomeAsync(
        string recipientEmail,
        string? userName,
        string? accountRole,
        CancellationToken cancellationToken = default)
    {
        var subject = "Welcome to Tunimoto";
        var roleMessage = string.IsNullOrWhiteSpace(accountRole)
            ? "Your account is ready."
            : $"Your {accountRole.Trim()} account is ready.";

        var html = await _templateRenderer.RenderAsync(
            "WelcomeTemplate",
            CreateBasePlaceholders(new Dictionary<string, string?>
            {
                ["USER_NAME"] = EncodeInlineText(userName, "there"),
                ["MESSAGE"] = EncodeMultilineText($"{roleMessage} You can now sign in and continue your workflow in Tunimoto.")
            }),
            cancellationToken);

        await _emailSender.SendHtmlAsync(recipientEmail, subject, html, cancellationToken);
    }

    public async Task SendNotificationAsync(
        string recipientEmail,
        string? userName,
        string subject,
        string message,
        CancellationToken cancellationToken = default)
    {
        var html = await _templateRenderer.RenderAsync(
            "NotificationTemplate",
            CreateBasePlaceholders(new Dictionary<string, string?>
            {
                ["USER_NAME"] = EncodeInlineText(userName, "there"),
                ["MESSAGE"] = EncodeMultilineText(message)
            }),
            cancellationToken);

        await _emailSender.SendHtmlAsync(recipientEmail, subject, html, cancellationToken);
    }

    public async Task SendInvoiceCreatedAsync(
        string recipientEmail,
        string? userName,
        string invoiceId,
        decimal amount,
        string? message,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Your Tunimoto invoice {invoiceId}";
        var html = await _templateRenderer.RenderAsync(
            "InvoiceTemplate",
            CreateBasePlaceholders(new Dictionary<string, string?>
            {
                ["USER_NAME"] = EncodeInlineText(userName, "there"),
                ["INVOICE_ID"] = EncodeInlineText(invoiceId),
                ["AMOUNT"] = WebUtility.HtmlEncode(amount.ToString("N2", CultureInfo.InvariantCulture)),
                ["MESSAGE"] = EncodeMultilineText(message ?? "Your invoice has been created and is now available in Tunimoto.")
            }),
            cancellationToken);

        await _emailSender.SendHtmlAsync(recipientEmail, subject, html, cancellationToken);
    }

    private static Dictionary<string, string?> CreateBasePlaceholders(Dictionary<string, string?> placeholders)
    {
        placeholders["CURRENT_YEAR"] = DateTime.UtcNow.Year.ToString(CultureInfo.InvariantCulture);
        return placeholders;
    }

    private static string EncodeInlineText(string? value, string fallback = "")
    {
        return WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(value) ? fallback : value.Trim());
    }

    private static string EncodeMultilineText(string? value)
    {
        var encoded = WebUtility.HtmlEncode(value ?? string.Empty);
        return encoded
            .Replace("\r\n", "<br />", StringComparison.Ordinal)
            .Replace("\n", "<br />", StringComparison.Ordinal);
    }
}
