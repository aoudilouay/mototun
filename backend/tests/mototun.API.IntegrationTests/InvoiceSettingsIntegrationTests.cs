using System.Net;
using System.Text.Json;
using System.Net.Http.Headers;
using mototun.Core.DTOs;
using mototun.Core.Enums;
using Xunit;

namespace mototun.API.IntegrationTests;

public class InvoiceSettingsIntegrationTests
{
    [Fact]
    public async Task UpdateInvoiceSettings_WithCompanyName_Returns200()
    {
        // Arrange
        await using var factory = new TestWebApplicationFactory();
        var client = factory.CreateAuthenticatedClient(userId: TestWebApplicationFactory.RevendeurUserId, role: UserRole.Revendeur);

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Test Company"), "companyName");

        // Act
        var response = await client.PutAsync("/api/invoices/invoice-settings", form);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Equal("Test Company", root.GetProperty("data").GetProperty("companyName").GetString());
    }

    [Fact]
    public async Task UpdateInvoiceSettings_WithoutCompanyName_Returns400()
    {
        // Arrange
        await using var factory = new TestWebApplicationFactory();
        var client = factory.CreateAuthenticatedClient(userId: TestWebApplicationFactory.RevendeurUserId, role: UserRole.Revendeur);

        using var form = new MultipartFormDataContent();
        // No company name

        // Act
        var response = await client.PutAsync("/api/invoices/invoice-settings", form);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetInvoiceSettings_ReturnsCurrentSettings()
    {
        // Arrange
        await using var factory = new TestWebApplicationFactory();
        var client = factory.CreateAuthenticatedClient(userId: TestWebApplicationFactory.RevendeurUserId, role: UserRole.Revendeur);

        // First save settings
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("My Company"), "companyName");
        var saveResponse = await client.PutAsync("/api/invoices/invoice-settings", form);
        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);

        // Act
        var response = await client.GetAsync("/api/invoices/invoice-settings");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Equal("My Company", root.GetProperty("data").GetProperty("companyName").GetString());
    }

    [Fact]
    public async Task UpdateInvoiceSettings_WithInvalidLogoType_Returns400()
    {
        await using var factory = new TestWebApplicationFactory();
        var client = factory.CreateAuthenticatedClient(userId: TestWebApplicationFactory.RevendeurUserId, role: UserRole.Revendeur);

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Test Company"), "companyName");

        var logoContent = new ByteArrayContent("not-an-image"u8.ToArray());
        logoContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        form.Add(logoContent, "logoFile", "logo.txt");

        var response = await client.PutAsync("/api/invoices/invoice-settings", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}


