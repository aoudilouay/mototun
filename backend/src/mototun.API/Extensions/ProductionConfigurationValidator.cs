using System.Net.Mail;
using Microsoft.Data.SqlClient;
using mototun.API.Services.DocumentAnalysis;
using mototun.API.Services.Email;
using mototun.API.Services.Security;

namespace mototun.API.Extensions
{
    public static class ProductionConfigurationValidator
    {
        public static void ValidateNonDevelopmentConfiguration(
            IConfiguration configuration,
            IReadOnlyCollection<string> configuredCorsOrigins)
        {
            ValidateConnectionString(configuration.GetConnectionString("DefaultConnection"));
            ValidateJwtSettings(configuration);
            ValidateCorsOrigins(configuredCorsOrigins);
            ValidatePasswordResetUrl(configuration["AuthSettings:PasswordResetUrl"]);
            ValidateTurnstile(configuration.GetSection(CloudflareTurnstileOptions.SectionName).Get<CloudflareTurnstileOptions>() ?? new CloudflareTurnstileOptions());
            ValidateResend(ResendOptionsResolver.Resolve(configuration));
            ValidateDocumentOcr(configuration.GetSection(DocumentOcrOptions.SectionName).Get<DocumentOcrOptions>() ?? new DocumentOcrOptions());

            if (configuration.GetValue("AdminBootstrap:Enabled", false))
            {
                throw new InvalidOperationException("AdminBootstrap:Enabled must remain false outside development.");
            }
        }

        private static void ValidateConnectionString(string? connectionString)
        {
            if (!ConfigurationValueGuards.HasConfiguredValue(connectionString))
            {
                throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured outside development.");
            }

            try
            {
                _ = new SqlConnectionStringBuilder(connectionString);
            }
            catch (ArgumentException ex)
            {
                throw new InvalidOperationException("ConnectionStrings:DefaultConnection is invalid.", ex);
            }
        }

        private static void ValidateJwtSettings(IConfiguration configuration)
        {
            var secretKey = configuration["JwtSettings:SecretKey"]?.Trim();
            if (!ConfigurationValueGuards.HasConfiguredValue(secretKey))
            {
                throw new InvalidOperationException("JwtSettings:SecretKey must be configured outside development.");
            }

            if (secretKey!.Length < 32)
            {
                throw new InvalidOperationException("JwtSettings:SecretKey must be at least 32 characters long.");
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(configuration["JwtSettings:Issuer"]))
            {
                throw new InvalidOperationException("JwtSettings:Issuer must be configured outside development.");
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(configuration["JwtSettings:Audience"]))
            {
                throw new InvalidOperationException("JwtSettings:Audience must be configured outside development.");
            }
        }

        private static void ValidateCorsOrigins(IReadOnlyCollection<string> configuredCorsOrigins)
        {
            if (configuredCorsOrigins.Count == 0)
            {
                throw new InvalidOperationException("Cors:AllowedOrigins must contain at least one HTTPS frontend origin outside development.");
            }

            foreach (var origin in configuredCorsOrigins)
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    throw new InvalidOperationException($"Cors:AllowedOrigins contains an invalid origin: {origin}");
                }

                if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Cors:AllowedOrigins must use HTTPS outside development. Invalid origin: {origin}");
                }

                if (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Cors:AllowedOrigins cannot use localhost outside development. Invalid origin: {origin}");
                }
            }
        }

        private static void ValidatePasswordResetUrl(string? passwordResetUrl)
        {
            if (!ConfigurationValueGuards.HasConfiguredValue(passwordResetUrl))
            {
                throw new InvalidOperationException("AuthSettings:PasswordResetUrl must be configured outside development.");
            }

            if (!Uri.TryCreate(passwordResetUrl, UriKind.Absolute, out var uri))
            {
                throw new InvalidOperationException("AuthSettings:PasswordResetUrl must be an absolute URL outside development.");
            }

            if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("AuthSettings:PasswordResetUrl must use HTTPS outside development.");
            }

            if (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("AuthSettings:PasswordResetUrl cannot point to localhost outside development.");
            }
        }

        private static void ValidateTurnstile(CloudflareTurnstileOptions options)
        {
            if (!options.Enabled)
            {
                return;
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(options.SecretKey))
            {
                throw new InvalidOperationException("Cloudflare:Turnstile:SecretKey must be configured when Turnstile is enabled.");
            }

            var verifyEndpoint = options.VerifyEndpoint?.Trim();
            if (!ConfigurationValueGuards.HasConfiguredValue(verifyEndpoint))
            {
                return;
            }

            if (!Uri.TryCreate(verifyEndpoint, UriKind.Absolute, out var uri)
                || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cloudflare:Turnstile:VerifyEndpoint must be an absolute HTTPS URL when configured.");
            }
        }

        private static void ValidateResend(ResendOptions options)
        {
            if (options.AllowDevelopmentFallback)
            {
                throw new InvalidOperationException("Resend:AllowDevelopmentFallback must be false outside development.");
            }

            var baseUrl = options.BaseUrl?.Trim();
            if (!ConfigurationValueGuards.HasConfiguredValue(baseUrl))
            {
                throw new InvalidOperationException("Resend:BaseUrl must be configured outside development.");
            }

            if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var resendUri)
                || !string.Equals(resendUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Resend:BaseUrl must be an absolute HTTPS URL.");
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(options.ApiKey))
            {
                throw new InvalidOperationException("Resend:ApiKey must be configured outside development.");
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(options.SenderEmail))
            {
                throw new InvalidOperationException("Resend:SenderEmail must be configured outside development.");
            }

            if (!MailAddress.TryCreate(options.SenderEmail.Trim(), out _))
            {
                throw new InvalidOperationException("Resend:SenderEmail must contain a valid email address.");
            }
        }

        private static void ValidateDocumentOcr(DocumentOcrOptions options)
        {
            if (!options.Enabled)
            {
                return;
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(options.BaseUrl))
            {
                throw new InvalidOperationException("DocumentOcr:BaseUrl must be configured when DocumentOcr is enabled.");
            }

            if (!Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var uri))
            {
                throw new InvalidOperationException("DocumentOcr:BaseUrl must be an absolute URL when DocumentOcr is enabled.");
            }

            if (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("DocumentOcr:BaseUrl cannot point to localhost outside development.");
            }
        }
    }
}
