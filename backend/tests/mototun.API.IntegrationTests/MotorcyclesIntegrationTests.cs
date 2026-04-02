using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class MotorcyclesIntegrationTests
{
    [Fact]
    public async Task CreateReadUpdateDeleteMotorcycle_FollowsLifecycle()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var createResponse = await client.PostAsJsonAsync("/api/Motorcycles", new
        {
            company = "Yamaha",
            brand = "MT",
            model = "MT-07",
            qty = 4,
            purchasePrice = 18000m,
            salePrice = 21500m
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var motorcycleId = createPayload.RootElement.GetProperty("data").GetProperty("motorcycleId").GetInt32();

        var getResponse = await client.GetAsync($"/api/Motorcycles/{motorcycleId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync($"/api/Motorcycles/{motorcycleId}", new
        {
            company = "Yamaha",
            brand = "MT",
            model = "MT-09",
            qty = 3,
            purchasePrice = 19000m,
            salePrice = 22500m
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        using (var updatePayload = await updateResponse.ReadJsonAsync())
        {
            var data = updatePayload.RootElement.GetProperty("data");
            Assert.Equal("MT-09", data.GetProperty("model").GetString());
            Assert.Equal(3, data.GetProperty("qty").GetInt32());
        }

        var deleteResponse = await client.DeleteAsync($"/api/Motorcycles/{motorcycleId}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        var missingResponse = await client.GetAsync($"/api/Motorcycles/{motorcycleId}");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Fact]
    public async Task GetMotorcycles_AppliesFiltersAndSearch()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        await client.PostAsJsonAsync("/api/Motorcycles", new
        {
            company = "Honda",
            brand = "CB",
            model = "CB500F",
            qty = 2,
            purchasePrice = 12000m,
            salePrice = 14500m
        });

        await client.PostAsJsonAsync("/api/Motorcycles", new
        {
            company = "Kawasaki",
            brand = "Z",
            model = "Z650",
            qty = 5,
            purchasePrice = 15000m,
            salePrice = 17200m
        });

        var companyFilterResponse = await client.GetAsync("/api/Motorcycles?company=Honda");
        Assert.Equal(HttpStatusCode.OK, companyFilterResponse.StatusCode);
        using (var companyPayload = await companyFilterResponse.ReadJsonAsync())
        {
            var items = companyPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
            Assert.NotEmpty(items);
            Assert.All(items, item => Assert.Equal("Honda", item.GetProperty("company").GetString()));
        }

        var searchResponse = await client.GetAsync("/api/Motorcycles?q=z6");
        Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);
        using var searchPayload = await searchResponse.ReadJsonAsync();
        var searchItems = searchPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(searchItems, item => item.GetProperty("model").GetString() == "Z650");
    }

    [Fact]
    public async Task CreateMotorcycle_WithNegativeQty_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var response = await client.PostAsJsonAsync("/api/Motorcycles", new
        {
            company = "Honda",
            brand = "CB",
            model = "CB125",
            qty = -1,
            purchasePrice = 10000m,
            salePrice = 12500m
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminWithoutRevendeurProfile_IsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var adminClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.AdminUserId,
            UserRole.Admin);

        var response = await adminClient.GetAsync("/api/Motorcycles");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
