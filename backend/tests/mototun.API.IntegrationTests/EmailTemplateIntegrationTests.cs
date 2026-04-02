using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using mototun.API.Services.Email;

namespace mototun.API.IntegrationTests;

public class EmailTemplateIntegrationTests
{
    [Fact]
    public async Task ApplicationEmailService_ShouldRenderWelcomeTemplate()
    {
        var emailSender = new TestEmailSender();
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton(emailSender);
            services.AddSingleton<IEmailSender>(emailSender);
        });

        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IApplicationEmailService>();

        await service.SendWelcomeAsync("welcome.integration@mototun.test", "Integration User", "Revendeur");

        var sent = Assert.Single(emailSender.SentMessages);
        Assert.Equal("welcome.integration@mototun.test", sent.To);
        Assert.Equal("Welcome to Mototun", sent.Subject);
        Assert.Contains("Integration User", sent.HtmlBody);
        Assert.Contains("Welcome aboard", sent.HtmlBody);
        Assert.DoesNotContain("{{", sent.HtmlBody);
    }

    [Fact]
    public async Task ApplicationEmailService_ShouldRenderNotificationTemplate()
    {
        var emailSender = new TestEmailSender();
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton(emailSender);
            services.AddSingleton<IEmailSender>(emailSender);
        });

        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IApplicationEmailService>();

        await service.SendNotificationAsync(
            "notify.integration@mototun.test",
            "Notifier",
            "Reminder subject",
            "A new workflow event requires attention.");

        var sent = Assert.Single(emailSender.SentMessages);
        Assert.Equal("notify.integration@mototun.test", sent.To);
        Assert.Equal("Reminder subject", sent.Subject);
        Assert.Contains("Notifier", sent.HtmlBody);
        Assert.Contains("A new workflow event requires attention.", sent.HtmlBody);
        Assert.DoesNotContain("{{", sent.HtmlBody);
    }
}
