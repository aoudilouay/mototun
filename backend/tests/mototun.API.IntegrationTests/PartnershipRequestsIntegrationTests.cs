using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class PartnershipRequestsIntegrationTests
{
    [Fact]
    public async Task RevendeurAndFournisseur_CanCreateAndAcceptRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var createResponse = await revendeurClient.PostAsJsonAsync("/api/partnership-requests", new
        {
            fournisseurId = TestWebApplicationFactory.FournisseurId
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var requestId = createPayload.RootElement.GetProperty("data").GetProperty("requestId").GetInt32();

        var sentResponse = await revendeurClient.GetAsync("/api/partnership-requests/sent");
        Assert.Equal(HttpStatusCode.OK, sentResponse.StatusCode);
        using (var sentPayload = await sentResponse.ReadJsonAsync())
        {
            var items = sentPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
            Assert.Contains(items, item => item.GetProperty("requestId").GetInt32() == requestId);
        }

        var receivedResponse = await fournisseurClient.GetAsync("/api/partnership-requests/received");
        Assert.Equal(HttpStatusCode.OK, receivedResponse.StatusCode);
        using (var receivedPayload = await receivedResponse.ReadJsonAsync())
        {
            var items = receivedPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
            Assert.Contains(items, item => item.GetProperty("requestId").GetInt32() == requestId);
        }

        var acceptResponse = await fournisseurClient.PostAsync($"/api/partnership-requests/{requestId}/accept", null);
        Assert.Equal(HttpStatusCode.OK, acceptResponse.StatusCode);
        using (var acceptPayload = await acceptResponse.ReadJsonAsync())
        {
            var data = acceptPayload.RootElement.GetProperty("data");
            Assert.Equal((int)PartnershipRequestStatus.Accepted, data.GetProperty("status").GetInt32());
        }

        var connectionsResponse = await revendeurClient.GetAsync("/api/partnership-requests/connections");
        Assert.Equal(HttpStatusCode.OK, connectionsResponse.StatusCode);
        using var connectionsPayload = await connectionsResponse.ReadJsonAsync();
        var connections = connectionsPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(connections, item =>
            item.GetProperty("requestId").GetInt32() == requestId
            && item.GetProperty("status").GetInt32() == (int)PartnershipRequestStatus.Accepted);
    }

    [Fact]
    public async Task Sender_CannotAcceptOwnPendingRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var createResponse = await revendeurClient.PostAsJsonAsync("/api/partnership-requests", new
        {
            fournisseurId = TestWebApplicationFactory.FournisseurId
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var requestId = createPayload.RootElement.GetProperty("data").GetProperty("requestId").GetInt32();

        var acceptResponse = await revendeurClient.PostAsync($"/api/partnership-requests/{requestId}/accept", null);

        Assert.Equal(HttpStatusCode.Forbidden, acceptResponse.StatusCode);
    }

    [Fact]
    public async Task Receiver_CannotDeleteIncomingPendingRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var createResponse = await revendeurClient.PostAsJsonAsync("/api/partnership-requests", new
        {
            fournisseurId = TestWebApplicationFactory.FournisseurId
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var requestId = createPayload.RootElement.GetProperty("data").GetProperty("requestId").GetInt32();

        var deleteResponse = await fournisseurClient.DeleteAsync($"/api/partnership-requests/{requestId}");

        Assert.Equal(HttpStatusCode.BadRequest, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task BlockedConnection_PreventsNewRequestFromOtherSide()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var createResponse = await revendeurClient.PostAsJsonAsync("/api/partnership-requests", new
        {
            fournisseurId = TestWebApplicationFactory.FournisseurId
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var requestId = createPayload.RootElement.GetProperty("data").GetProperty("requestId").GetInt32();

        var blockResponse = await fournisseurClient.PostAsJsonAsync(
            $"/api/partnership-requests/{requestId}/block",
            new { reason = "No match for now" });
        Assert.Equal(HttpStatusCode.OK, blockResponse.StatusCode);

        var retryResponse = await revendeurClient.PostAsJsonAsync("/api/partnership-requests", new
        {
            fournisseurId = TestWebApplicationFactory.FournisseurId
        });

        Assert.Equal(HttpStatusCode.Conflict, retryResponse.StatusCode);
    }

    [Fact]
    public async Task DirectoryEndpoints_ReturnVisibleProfiles()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var fournisseursDirectoryResponse = await revendeurClient.GetAsync("/api/partnership-requests/directory/fournisseurs");
        Assert.Equal(HttpStatusCode.OK, fournisseursDirectoryResponse.StatusCode);
        using (var fournisseursPayload = await fournisseursDirectoryResponse.ReadJsonAsync())
        {
            var items = fournisseursPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
            Assert.Contains(items, item => item.GetProperty("profileId").GetInt32() == TestWebApplicationFactory.FournisseurId);
        }

        var revendeursDirectoryResponse = await fournisseurClient.GetAsync("/api/partnership-requests/directory/revendeurs");
        Assert.Equal(HttpStatusCode.OK, revendeursDirectoryResponse.StatusCode);
        using var revendeursPayload = await revendeursDirectoryResponse.ReadJsonAsync();
        var revendeurs = revendeursPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(revendeurs, item => item.GetProperty("profileId").GetInt32() == TestWebApplicationFactory.RevendeurId);
    }
}
