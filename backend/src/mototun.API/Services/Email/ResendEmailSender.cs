using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace mototun.API.Services.Email;

public sealed class ResendEmailSender : IEmailSender
{
    private const int MaxAttachmentPayloadBytes = 40 * 1024 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly ResendOptions _options;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        HttpClient httpClient,
        Microsoft.Extensions.Options.IOptions<ResendOptions> options,
        IHostEnvironment environment,
        ILogger<ResendEmailSender> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _environment = environment;
        _logger = logger;
    }

    public async Task SendHtmlAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        await SendHtmlAsync(to, subject, htmlBody, Array.Empty<EmailAttachment>(), cancellationToken);
    }

    public async Task SendHtmlAsync(
        string to,
        string subject,
        string htmlBody,
        IReadOnlyCollection<EmailAttachment> attachments,
        CancellationToken cancellationToken = default)
    {
        if (!MailAddress.TryCreate(to, out var recipientAddress))
        {
            throw new InvalidOperationException("Recipient email address is invalid.");
        }

        if (!_options.HasConfiguredApiKey() || !_options.HasValidSenderEmail())
        {
            if (_environment.IsDevelopment() && _options.AllowDevelopmentFallback)
            {
                _logger.LogWarning(
                    "Resend API is not configured. Email fallback is enabled in development; message to {Recipient} was skipped.",
                    recipientAddress.Address);
                return;
            }

            throw new InvalidOperationException("Resend email is not configured. Set Resend ApiKey and SenderEmail.");
        }

        var senderName = string.IsNullOrWhiteSpace(_options.SenderName) ? "Tunimoto" : _options.SenderName.Trim();
        var resendAttachments = BuildAttachments(attachments);
        var payload = new Dictionary<string, object?>
        {
            ["from"] = $"{senderName} <{_options.SenderEmail.Trim()}>",
            ["to"] = new[] { recipientAddress.Address },
            ["subject"] = subject,
            ["html"] = htmlBody
        };

        if (resendAttachments.Count > 0)
        {
            payload["attachments"] = resendAttachments;
        }

        var endpoint = BuildEndpoint(_options.BaseUrl);
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey.Trim());
        request.Headers.TryAddWithoutValidation("Idempotency-Key", Guid.NewGuid().ToString("N"));

        _logger.LogInformation(
            "Sending Resend email to {Recipient} with {AttachmentCount} attachment(s).",
            recipientAddress.Address,
            resendAttachments.Count);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("Email sent to {Recipient} via Resend.", recipientAddress.Address);
            return;
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogError(
            "Resend email request failed for {Recipient}. Status: {StatusCode}. Body: {Body}",
            recipientAddress.Address,
            (int)response.StatusCode,
            TruncateForLogs(responseBody));

        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            throw new InvalidOperationException("Resend rejected the email request. Verify API key and sender configuration.");
        }

        throw new InvalidOperationException("Email delivery failed. Verify Resend configuration and sender domain.");
    }

    private static List<object> BuildAttachments(IReadOnlyCollection<EmailAttachment> attachments)
    {
        if (attachments.Count == 0)
        {
            return new List<object>();
        }

        var totalEncodedBytes = 0;
        var resendAttachments = new List<object>(attachments.Count);

        foreach (var attachment in attachments)
        {
            if (attachment.Content.Length == 0)
            {
                continue;
            }

            var fileName = string.IsNullOrWhiteSpace(attachment.FileName)
                ? "attachment"
                : attachment.FileName.Trim();

            totalEncodedBytes += GetBase64EncodedSize(attachment.Content.Length);
            if (totalEncodedBytes > MaxAttachmentPayloadBytes)
            {
                throw new InvalidOperationException("Email attachments exceed the Resend 40 MB payload limit.");
            }

            resendAttachments.Add(new
            {
                filename = fileName,
                content = Convert.ToBase64String(attachment.Content),
                content_type = string.IsNullOrWhiteSpace(attachment.ContentType) ? null : attachment.ContentType.Trim()
            });
        }

        return resendAttachments;
    }

    private static string BuildEndpoint(string? baseUrl)
    {
        var normalizedBaseUrl = string.IsNullOrWhiteSpace(baseUrl)
            ? ResendOptions.DefaultBaseUrl
            : baseUrl.Trim().TrimEnd('/');

        return $"{normalizedBaseUrl}/emails";
    }

    private static string TruncateForLogs(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Length <= 500 ? value : value[..500];
    }

    private static int GetBase64EncodedSize(int byteCount)
    {
        return ((byteCount + 2) / 3) * 4;
    }
}
