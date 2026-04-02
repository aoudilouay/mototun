using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class ClientsIntegrationTests
{
    [Fact]
    public async Task GetClients_ReturnsSeededClientWithStats()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var response = await client.GetAsync("/api/Clients");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = await response.ReadJsonAsync();
        var data = payload.RootElement.GetProperty("data").EnumerateArray().ToList();

        Assert.NotEmpty(data);
        var seeded = data.Single(item => item.GetProperty("clientId").GetInt32() == TestWebApplicationFactory.ClientId);
        Assert.Equal("Client Integration", seeded.GetProperty("fullName").GetString());
        Assert.Equal(1, seeded.GetProperty("motorcyclesPurchasedCount").GetInt32());
        Assert.Equal(25000m, seeded.GetProperty("totalInvoicedAmount").GetDecimal());
    }

    [Fact]
    public async Task CreateUpdateDeleteClient_FollowsLifecycle()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var createResponse = await client.PostAsJsonAsync("/api/Clients", new
        {
            fullName = "Client A",
            cin = "CIN-NEW-1001",
            email = "client-a@mototun.test",
            phone = "55111222",
            address = "Rue A",
            city = "Tunis"
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var createdClientId = createPayload.RootElement.GetProperty("data").GetProperty("clientId").GetInt32();

        var getResponse = await client.GetAsync($"/api/Clients/{createdClientId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync($"/api/Clients/{createdClientId}", new
        {
            fullName = "Client A Updated",
            cin = "CIN-NEW-1001",
            email = "client-a-updated@mototun.test",
            phone = "55999888",
            address = "Rue B",
            city = "Sousse"
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        using (var updatePayload = await updateResponse.ReadJsonAsync())
        {
            var data = updatePayload.RootElement.GetProperty("data");
            Assert.Equal("Client A Updated", data.GetProperty("fullName").GetString());
            Assert.Equal("Sousse", data.GetProperty("city").GetString());
        }

        var deleteResponse = await client.DeleteAsync($"/api/Clients/{createdClientId}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        using (var deletePayload = await deleteResponse.ReadJsonAsync())
        {
            var data = deletePayload.RootElement.GetProperty("data");
            Assert.Equal((int)ClientStatus.Missing, data.GetProperty("status").GetInt32());
        }

        var missingResponse = await client.GetAsync("/api/Clients/999999");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Fact]
    public async Task CreateClient_RejectsInvalidPayloadAndDuplicateEmail()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var invalidResponse = await client.PostAsJsonAsync("/api/Clients", new
        {
            fullName = " ",
            cin = " ",
            email = "invalid@mototun.test",
            phone = "000",
            address = "X",
            city = "Y"
        });

        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);

        var duplicateEmailResponse = await client.PostAsJsonAsync("/api/Clients", new
        {
            fullName = "Duplicate Email",
            cin = "CIN-NEW-2002",
            email = "client.integration@mototun.test",
            phone = "55555555",
            address = "Rue C",
            city = "Nabeul"
        });

        Assert.Equal(HttpStatusCode.BadRequest, duplicateEmailResponse.StatusCode);
    }

    [Fact]
    public async Task AdminWithoutRevendeurProfile_IsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var adminClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.AdminUserId,
            UserRole.Admin);

        var response = await adminClient.GetAsync("/api/Clients");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
