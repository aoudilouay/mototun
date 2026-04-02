using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using mototun.API.Services.Email;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;

namespace mototun.API.IntegrationTests;

public class AuthSecurityIntegrationTests
{
    [Fact]
    public async Task ForgotPassword_ShouldReturnSameGenericMessage_ForKnownAndUnknownEmails()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var knownResponse = await client.PostAsJsonAsync("/api/Auth/forgot-password", new
        {
            email = "revendeur.integration@mototun.test"
        });
        var unknownResponse = await client.PostAsJsonAsync("/api/Auth/forgot-password", new
        {
            email = "unknown.integration@mototun.test"
        });

        Assert.Equal(HttpStatusCode.OK, knownResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, unknownResponse.StatusCode);

        using var knownJson = JsonDocument.Parse(await knownResponse.Content.ReadAsStringAsync());
        using var unknownJson = JsonDocument.Parse(await unknownResponse.Content.ReadAsStringAsync());

        var knownMessage = knownJson.RootElement.GetProperty("message").GetString();
        var unknownMessage = unknownJson.RootElement.GetProperty("message").GetString();

        Assert.Equal(knownMessage, unknownMessage);
    }

    [Fact]
    public async Task ForgotPassword_ShouldSendPasswordResetTemplate_ForKnownEmail()
    {
        var emailSender = new TestEmailSender();
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton(emailSender);
            services.AddSingleton<IEmailSender>(emailSender);
        });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/Auth/forgot-password", new
        {
            email = "revendeur.integration@mototun.test"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var sent = Assert.Single(emailSender.SentMessages);
        Assert.Equal("revendeur.integration@mototun.test", sent.To);
        Assert.Equal("Reset your Mototun password", sent.Subject);
        Assert.Contains("Reset your password", sent.HtmlBody);
        Assert.Contains("token=", sent.HtmlBody);
        Assert.DoesNotContain("{{", sent.HtmlBody);
    }

    [Fact]
    public async Task Register_ShouldSendWelcomeEmail()
    {
        var emailSender = new TestEmailSender();
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton(emailSender);
            services.AddSingleton<IEmailSender>(emailSender);
        });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            email = "welcome.integration@mototun.test",
            password = "W3lcomeP@ssword!",
            fullName = "Welcome Integration",
            phone = "+21655000000",
            role = UserRole.Revendeur,
            businessName = "Welcome Motors",
            taxId = $"TAX-{Guid.NewGuid():N}",
            address = "Rue Example",
            city = "Tunis",
            postalCode = "1000"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var sent = Assert.Single(emailSender.SentMessages);
        Assert.Equal("welcome.integration@mototun.test", sent.To);
        Assert.Equal("Welcome to Mototun", sent.Subject);
        Assert.Contains("Welcome Integration", sent.HtmlBody);
        Assert.DoesNotContain("{{", sent.HtmlBody);
    }

    [Fact]
    public async Task ResetPassword_WithValidToken_ShouldAllowPasswordLogin()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();
        const string token = "integration-reset-token";
        const string newPassword = "N3wStrongP@ssword!";

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = db.Users.Single(u => u.Email == "revendeur.integration@mototun.test");
            user.PasswordResetTokenHash = HashToken(token);
            user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(30);
            user.PasswordResetRequestedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            db.SaveChanges();
        }

        var resetResponse = await client.PostAsJsonAsync("/api/Auth/reset-password", new
        {
            token,
            newPassword,
            confirmPassword = newPassword
        });

        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            email = "revendeur.integration@mototun.test",
            password = newPassword
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task DisabledUserToken_ShouldBeRejected_OnProtectedEndpoint()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = db.Users.Single(u => u.Id == TestWebApplicationFactory.RevendeurUserId);
            user.CanLogin = false;
            user.Status = UserStatus.Suspended;
            user.UpdatedAt = DateTime.UtcNow;
            db.SaveChanges();
        }

        var response = await client.GetAsync("/api/profile/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
