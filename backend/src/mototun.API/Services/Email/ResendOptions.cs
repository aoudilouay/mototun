using System.Net.Mail;
using mototun.API.Extensions;

namespace mototun.API.Services.Email;

public sealed class ResendOptions
{
    public const string SectionName = "Resend";
    public const string LegacySectionName = "Smtp";
    public const string DefaultBaseUrl = "https://api.resend.com";

    public string BaseUrl { get; set; } = DefaultBaseUrl;
    public string ApiKey { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = "Mototun";
    public bool AllowDevelopmentFallback { get; set; } = true;

    public bool HasConfiguredApiKey()
    {
        return ConfigurationValueGuards.HasConfiguredValue(ApiKey);
    }

    public bool HasConfiguredSenderEmail()
    {
        return ConfigurationValueGuards.HasConfiguredValue(SenderEmail);
    }

    public bool HasValidSenderEmail()
    {
        return HasConfiguredSenderEmail() && MailAddress.TryCreate(SenderEmail.Trim(), out _);
    }
}
