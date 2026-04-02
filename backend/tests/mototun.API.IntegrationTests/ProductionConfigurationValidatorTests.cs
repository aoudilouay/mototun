using Microsoft.Extensions.Configuration;
using mototun.API.Extensions;

namespace mototun.API.IntegrationTests;

public class ProductionConfigurationValidatorTests
{
    [Fact]
    public void ValidateNonDevelopmentConfiguration_AllowsFullyConfiguredProductionSettings()
    {
        var configuration = BuildConfiguration();
        var origins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "https://tunimoto.tn",
            "https://www.tunimoto.tn"
        };

        var exception = Record.Exception(() =>
            ProductionConfigurationValidator.ValidateNonDevelopmentConfiguration(configuration, origins));

        Assert.Null(exception);
    }

    [Fact]
    public void ValidateNonDevelopmentConfiguration_RejectsPlaceholderJwtSecret()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["JwtSettings:SecretKey"] = "__SET_IN_PRODUCTION_ENV__"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigurationValidator.ValidateNonDevelopmentConfiguration(configuration, BuildOrigins()));

        Assert.Contains("JwtSettings:SecretKey", exception.Message);
    }

    [Fact]
    public void ValidateNonDevelopmentConfiguration_RejectsLocalhostPasswordResetUrl()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["AuthSettings:PasswordResetUrl"] = "http://localhost:5173/reset-password"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigurationValidator.ValidateNonDevelopmentConfiguration(configuration, BuildOrigins()));

        Assert.Contains("PasswordResetUrl", exception.Message);
    }

    [Fact]
    public void ValidateNonDevelopmentConfiguration_RejectsDevelopmentOnlyResendFallback()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["Resend:AllowDevelopmentFallback"] = "true"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigurationValidator.ValidateNonDevelopmentConfiguration(configuration, BuildOrigins()));

        Assert.Contains("AllowDevelopmentFallback", exception.Message);
    }

    [Fact]
    public void ValidateNonDevelopmentConfiguration_RejectsLocalhostDocumentOcrBaseUrl()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["DocumentOcr:Enabled"] = "true",
            ["DocumentOcr:BaseUrl"] = "http://localhost:8088"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigurationValidator.ValidateNonDevelopmentConfiguration(configuration, BuildOrigins()));

        Assert.Contains("DocumentOcr:BaseUrl", exception.Message);
    }

    private static IConfiguration BuildConfiguration(Dictionary<string, string?>? overrides = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=tcp:sql.tunimoto.tn,1433;Database=mototun;User Id=mototun;Password=StrongPass123!;Encrypt=True;TrustServerCertificate=False;",
            ["JwtSettings:SecretKey"] = "prod_secret_key_1234567890123456789012345678901234567890",
            ["JwtSettings:Issuer"] = "MototunAPI",
            ["JwtSettings:Audience"] = "MototunClient",
            ["AuthSettings:PasswordResetUrl"] = "https://www.tunimoto.tn/reset-password",
            ["Cloudflare:Turnstile:Enabled"] = "true",
            ["Cloudflare:Turnstile:SecretKey"] = "turnstile_secret_key_1234567890",
            ["Cloudflare:Turnstile:VerifyEndpoint"] = "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            ["Resend:BaseUrl"] = "https://api.resend.com",
            ["Resend:ApiKey"] = "re_smtp_password_123456",
            ["Resend:SenderEmail"] = "no-reply@send.tunimoto.tn",
            ["Resend:SenderName"] = "Mototun Support",
            ["Resend:AllowDevelopmentFallback"] = "false",
            ["DocumentOcr:Enabled"] = "false",
            ["AdminBootstrap:Enabled"] = "false"
        };

        if (overrides is not null)
        {
            foreach (var pair in overrides)
            {
                values[pair.Key] = pair.Value;
            }
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }

    private static HashSet<string> BuildOrigins()
    {
        return new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "https://tunimoto.tn",
            "https://www.tunimoto.tn"
        };
    }
}
