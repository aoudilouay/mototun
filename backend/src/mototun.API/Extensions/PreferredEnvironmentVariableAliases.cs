namespace mototun.API.Extensions;

public static class PreferredEnvironmentVariableAliases
{
    public static void Apply(ConfigurationManager configuration)
    {
        // Database
        ApplyAlias(configuration, "DATABASE__DEFAULT_CONNECTION", "ConnectionStrings:DefaultConnection");
        ApplyAlias(configuration, "DATABASE__ENABLE_IN_MEMORY_FALLBACK", "Database:EnableInMemoryFallback");
        ApplyAlias(configuration, "DATABASE__CONNECTION_PROBE_TIMEOUT_SECONDS", "Database:ConnectionProbeTimeoutSeconds");
        ApplyAlias(configuration, "DATABASE__IN_MEMORY_DATABASE_NAME", "Database:InMemoryDatabaseName");

        // Auth / JWT
        ApplyAlias(configuration, "JWT_SETTINGS__SECRET_KEY", "JwtSettings:SecretKey");
        ApplyAlias(configuration, "JWT_SETTINGS__ISSUER", "JwtSettings:Issuer");
        ApplyAlias(configuration, "JWT_SETTINGS__AUDIENCE", "JwtSettings:Audience");
        ApplyAlias(configuration, "JWT_SETTINGS__EXPIRATION_IN_DAYS", "JwtSettings:ExpirationInDays");
        ApplyAlias(configuration, "AUTH_SETTINGS__PASSWORD_RESET_URL", "AuthSettings:PasswordResetUrl");
        ApplyAlias(configuration, "AUTH_SETTINGS__PASSWORD_RESET_TOKEN_EXPIRY_MINUTES", "AuthSettings:PasswordResetTokenExpiryMinutes");

        // API / URLs
        ApplyIndexedPrefixAlias(configuration, "CORS__ALLOWED_ORIGINS__", "Cors:AllowedOrigins:");

        // Storage
        ApplyAlias(configuration, "AZURE_BLOB__CONNECTION_STRING", "AzureBlob:ConnectionString");
        ApplyAlias(configuration, "AZURE_BLOB__DOCUMENTS_CONTAINER", "AzureBlob:DocumentsContainer");
        ApplyAlias(configuration, "AZURE_BLOB__AVATARS_CONTAINER", "AzureBlob:AvatarsContainer");
        ApplyAlias(configuration, "AZURE_BLOB__INVOICE_SETTINGS_CONTAINER", "AzureBlob:InvoiceSettingsContainer");

        // Email
        ApplyAlias(configuration, "RESEND__BASE_URL", "Resend:BaseUrl");
        ApplyAlias(configuration, "RESEND__API_KEY", "Resend:ApiKey");
        ApplyAlias(configuration, "RESEND__SENDER_EMAIL", "Resend:SenderEmail");
        ApplyAlias(configuration, "RESEND__SENDER_NAME", "Resend:SenderName");
        ApplyAlias(configuration, "RESEND__ALLOW_DEVELOPMENT_FALLBACK", "Resend:AllowDevelopmentFallback");

        // Security
        ApplyAlias(configuration, "CLOUDFLARE__TURNSTILE__ENABLED", "Cloudflare:Turnstile:Enabled");
        ApplyAlias(configuration, "CLOUDFLARE__TURNSTILE__SECRET_KEY", "Cloudflare:Turnstile:SecretKey");
        ApplyAlias(configuration, "CLOUDFLARE__TURNSTILE__VERIFY_ENDPOINT", "Cloudflare:Turnstile:VerifyEndpoint");

        // Optional integrations
        ApplyAlias(configuration, "DOCUMENT_OCR__ENABLED", "DocumentOcr:Enabled");
        ApplyAlias(configuration, "DOCUMENT_OCR__BASE_URL", "DocumentOcr:BaseUrl");
        ApplyAlias(configuration, "DOCUMENT_OCR__ANALYZE_PATH", "DocumentOcr:AnalyzePath");
        ApplyAlias(configuration, "DOCUMENT_OCR__API_KEY", "DocumentOcr:ApiKey");
        ApplyAlias(configuration, "DOCUMENT_OCR__TIMEOUT_SECONDS", "DocumentOcr:TimeoutSeconds");
        ApplyAlias(configuration, "DOCUMENT_OCR__MIN_CONFIDENCE", "DocumentOcr:MinConfidence");

        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__ENABLED", "StuckDossierReminders:Enabled");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__SCAN_INTERVAL_MINUTES", "StuckDossierReminders:ScanIntervalMinutes");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__STUCK_AFTER_HOURS", "StuckDossierReminders:StuckAfterHours");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__REPEAT_EVERY_HOURS", "StuckDossierReminders:RepeatEveryHours");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__MAX_INVOICES_PER_RUN", "StuckDossierReminders:MaxInvoicesPerRun");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__ENABLE_EMAIL", "StuckDossierReminders:EnableEmail");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__ENABLE_SMS", "StuckDossierReminders:EnableSms");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__ENABLE_WHATSAPP", "StuckDossierReminders:EnableWhatsApp");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__SMS_WEBHOOK_URL", "StuckDossierReminders:SmsWebhookUrl");
        ApplyAlias(configuration, "STUCK_DOSSIER_REMINDERS__WHATSAPP_WEBHOOK_URL", "StuckDossierReminders:WhatsAppWebhookUrl");

        ApplyAlias(configuration, "ADMIN_BOOTSTRAP__ENABLED", "AdminBootstrap:Enabled");
        ApplyAlias(configuration, "ADMIN_BOOTSTRAP__EMAIL", "AdminBootstrap:Email");
        ApplyAlias(configuration, "ADMIN_BOOTSTRAP__PASSWORD", "AdminBootstrap:Password");
        ApplyAlias(configuration, "ADMIN_BOOTSTRAP__FULL_NAME", "AdminBootstrap:FullName");
    }

    private static void ApplyAlias(ConfigurationManager configuration, string preferredEnvironmentVariableName, string configurationKey)
    {
        if (ConfigurationValueGuards.HasConfiguredValue(configuration[configurationKey]))
        {
            return;
        }

        var rawValue = Environment.GetEnvironmentVariable(preferredEnvironmentVariableName)?.Trim();
        if (!ConfigurationValueGuards.HasConfiguredValue(rawValue))
        {
            return;
        }

        configuration[configurationKey] = rawValue;
    }

    private static void ApplyIndexedPrefixAlias(ConfigurationManager configuration, string preferredPrefix, string configurationPrefix)
    {
        var environmentVariables = Environment.GetEnvironmentVariables();
        foreach (var key in environmentVariables.Keys)
        {
            var name = key?.ToString();
            if (string.IsNullOrWhiteSpace(name) || !name.StartsWith(preferredPrefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var index = name[preferredPrefix.Length..];
            if (string.IsNullOrWhiteSpace(index))
            {
                continue;
            }

            ApplyAlias(configuration, name, $"{configurationPrefix}{index}");
        }
    }
}
