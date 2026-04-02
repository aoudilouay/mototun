using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using mototun.API.Services.Email;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class InvoiceCreationIntegrationTests
{
    [Fact]
    public async Task CreateInvoice_WithMultipleManualLines_ReturnsCreatedAndPersistsLines()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        var payload = new
        {
            clientId = TestWebApplicationFactory.ClientId,
            notes = "integration-test multi line",
            soldMotorcycles = new[]
            {
                new
                {
                    company = "Honda",
                    brand = "CB",
                    model = "CB125F",
                    chassisNumber = "CHASSIS-NEW-1001",
                    purchasePrice = 10000m,
                    salePrice = 12000m
                },
                new
                {
                    company = "Yamaha",
                    brand = "MT",
                    model = "MT-07",
                    chassisNumber = "CHASSIS-NEW-1002",
                    purchasePrice = 14000m,
                    salePrice = 16500m
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/Invoices", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var createPayload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var createData = createPayload.RootElement.GetProperty("data");
        var invoiceId = createData.GetProperty("invoiceId").GetInt32();
        var clientPortalAccessCode = createData.GetProperty("clientPortalAccessCode").GetString();
        var totalAmount = createData.GetProperty("totalAmount").GetDecimal();

        Assert.Equal(28500m, totalAmount);
        Assert.True(invoiceId > 0);
        Assert.False(string.IsNullOrWhiteSpace(clientPortalAccessCode));

        var detailsResponse = await client.GetAsync($"/api/Invoices/{invoiceId}");
        Assert.Equal(HttpStatusCode.OK, detailsResponse.StatusCode);

        using var detailsPayload = JsonDocument.Parse(await detailsResponse.Content.ReadAsStringAsync());
        var invoiceData = detailsPayload.RootElement.GetProperty("data");
        var soldItems = invoiceData.GetProperty("soldMotorcycles").EnumerateArray().ToList();
        var documents = invoiceData.GetProperty("documents").EnumerateArray().ToList();

        Assert.Equal(2, soldItems.Count);
        Assert.False(invoiceData.GetProperty("isFactureUploaded").GetBoolean());
        Assert.Empty(documents);
    }

    [Fact]
    public async Task CreateInvoice_WithLegacySingleSoldMotorcyclePayload_RemainsSupported()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        var payload = new
        {
            clientId = TestWebApplicationFactory.ClientId,
            soldMotorcycle = new
            {
                company = "Suzuki",
                brand = "GSX",
                model = "GSX-S150",
                chassisNumber = "CHASSIS-LEGACY-2001",
                purchasePrice = 9000m,
                salePrice = 11000m
            }
        };

        var response = await client.PostAsJsonAsync("/api/Invoices", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var createPayload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var createData = createPayload.RootElement.GetProperty("data");
        Assert.Equal(11000m, createData.GetProperty("totalAmount").GetDecimal());
        Assert.False(string.IsNullOrWhiteSpace(createData.GetProperty("clientPortalAccessCode").GetString()));
    }

    [Fact]
    public async Task CreateInvoice_WithClientEmail_ShouldSendInvoiceEmail()
    {
        var emailSender = new TestEmailSender();
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton(emailSender);
            services.AddSingleton<IEmailSender>(emailSender);
        });
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        var payload = new
        {
            clientId = TestWebApplicationFactory.ClientId,
            soldMotorcycle = new
            {
                company = "Suzuki",
                brand = "V-Strom",
                model = "650",
                chassisNumber = "CHASSIS-EMAIL-3001",
                purchasePrice = 15000m,
                salePrice = 17500m
            }
        };

        var response = await client.PostAsJsonAsync("/api/Invoices", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var sent = Assert.Single(emailSender.SentMessages);
        Assert.Equal("client.integration@mototun.test", sent.To);
        Assert.Contains("Your Mototun invoice", sent.Subject);
        Assert.Contains("Invoice created", sent.HtmlBody);
        Assert.True(
            sent.HtmlBody.Contains("17500.00", StringComparison.Ordinal)
            || sent.HtmlBody.Contains("17,500.00", StringComparison.Ordinal),
            "Expected the rendered invoice email to include the invoice amount.");
        Assert.DoesNotContain("{{", sent.HtmlBody);
    }
}
