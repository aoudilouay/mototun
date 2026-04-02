using Microsoft.Extensions.Configuration;

namespace mototun.API.Services.Email;

public static class ResendOptionsResolver
{
    public static ResendOptions Resolve(IConfiguration configuration)
    {
        var options = new ResendOptions();
        Bind(configuration, options);
        return options;
    }

    public static void Bind(IConfiguration configuration, ResendOptions options)
    {
        var resendSection = configuration.GetSection(ResendOptions.SectionName);
        if (SectionHasValues(resendSection))
        {
            resendSection.Bind(options);
            return;
        }

        var legacySection = configuration.GetSection(ResendOptions.LegacySectionName);
        if (!SectionHasValues(legacySection))
        {
            return;
        }

        options.BaseUrl = ResendOptions.DefaultBaseUrl;
        options.ApiKey = legacySection["Password"]?.Trim() ?? legacySection["AppPassword"]?.Trim() ?? options.ApiKey;
        options.SenderEmail = legacySection["SenderEmail"]?.Trim() ?? options.SenderEmail;
        options.SenderName = legacySection["SenderName"]?.Trim() ?? options.SenderName;

        if (bool.TryParse(legacySection["AllowDevelopmentFallback"], out var allowDevelopmentFallback))
        {
            options.AllowDevelopmentFallback = allowDevelopmentFallback;
        }
    }

    private static bool SectionHasValues(IConfigurationSection section)
    {
        return !string.IsNullOrWhiteSpace(section.Value) || section.GetChildren().Any();
    }
}
