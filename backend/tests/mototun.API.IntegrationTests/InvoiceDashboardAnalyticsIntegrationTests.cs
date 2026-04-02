using mototun.Core.Enums;
using System.Net;
using System.Text.Json;

namespace mototun.API.IntegrationTests;

public class InvoiceDashboardAnalyticsIntegrationTests
{
    [Fact]
    public async Task FournisseurDashboard_ReturnsAnalyticsPayload()
    {
        await using var factory = new TestWebApplicationFactory();
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var response = await fournisseurClient.GetAsync("/api/Invoices/fournisseur/dashboard?range=month");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = payload.RootElement.GetProperty("data");

        Assert.Equal("month", data.GetProperty("range").GetString());
        Assert.True(data.GetProperty("totalDossiers").GetInt32() >= 1);
        Assert.True(data.GetProperty("timeline").GetArrayLength() > 0);
    }

    [Fact]
    public async Task DashboardExports_ReturnCsvFiles()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var revendeurExport = await revendeurClient.GetAsync("/api/Invoices/revendeur/dashboard/export?range=month&type=kpi");

        Assert.Equal(HttpStatusCode.OK, revendeurExport.StatusCode);
        Assert.Contains("text/csv", revendeurExport.Content.Headers.ContentType?.MediaType ?? string.Empty);
        var revendeurCsv = await revendeurExport.Content.ReadAsStringAsync();
        Assert.Contains("GeneratedAtUtc,Range,TotalInvoices", revendeurCsv);

        var fournisseurExport = await fournisseurClient.GetAsync("/api/Invoices/fournisseur/dashboard/export?range=month&type=revendeurs");

        Assert.Equal(HttpStatusCode.OK, fournisseurExport.StatusCode);
        Assert.Contains("text/csv", fournisseurExport.Content.Headers.ContentType?.MediaType ?? string.Empty);
        var fournisseurCsv = await fournisseurExport.Content.ReadAsStringAsync();
        Assert.Contains("RevendeurId,BusinessName,City", fournisseurCsv);
        Assert.Contains(TestWebApplicationFactory.RevendeurId.ToString(), fournisseurCsv);
    }
}
