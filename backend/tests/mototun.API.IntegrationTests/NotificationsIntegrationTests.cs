using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class NotificationsIntegrationTests
{
    [Fact]
    public async Task RevendeurNotifications_MarkReadAndDismiss_UpdatesVisibility()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        await revendeurClient.PostAsJsonAsync("/api/Motorcycles", new
        {
            company = "Honda",
            brand = "CB",
            model = "CB500",
            qty = 0,
            purchasePrice = 11000m,
            salePrice = 13800m
        });

        var firstListResponse = await revendeurClient.GetAsync("/api/Notifications");
        Assert.Equal(HttpStatusCode.OK, firstListResponse.StatusCode);
        using var firstListPayload = await firstListResponse.ReadJsonAsync();
        var notifications = firstListPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.NotEmpty(notifications);

        var selected = notifications.First();
        var notificationId = selected.GetProperty("notificationId").GetString();
        Assert.False(string.IsNullOrWhiteSpace(notificationId));

        var readResponse = await revendeurClient.PostAsJsonAsync("/api/Notifications/read", new
        {
            notificationIds = new[] { notificationId }
        });
        Assert.Equal(HttpStatusCode.OK, readResponse.StatusCode);

        var afterReadResponse = await revendeurClient.GetAsync("/api/Notifications");
        Assert.Equal(HttpStatusCode.OK, afterReadResponse.StatusCode);
        using (var afterReadPayload = await afterReadResponse.ReadJsonAsync())
        {
            var afterReadItems = afterReadPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
            var updated = afterReadItems.Single(item => item.GetProperty("notificationId").GetString() == notificationId);
            Assert.True(updated.GetProperty("isRead").GetBoolean());
        }

        var dismissResponse = await revendeurClient.PostAsJsonAsync("/api/Notifications/dismiss", new
        {
            notificationIds = new[] { notificationId }
        });
        Assert.Equal(HttpStatusCode.OK, dismissResponse.StatusCode);

        var afterDismissResponse = await revendeurClient.GetAsync("/api/Notifications");
        Assert.Equal(HttpStatusCode.OK, afterDismissResponse.StatusCode);
        using var afterDismissPayload = await afterDismissResponse.ReadJsonAsync();
        var afterDismissItems = afterDismissPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.DoesNotContain(afterDismissItems, item => item.GetProperty("notificationId").GetString() == notificationId);
    }

    [Fact]
    public async Task MarkAsRead_WithEmptyIds_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var response = await revendeurClient.PostAsJsonAsync("/api/Notifications/read", new
        {
            notificationIds = Array.Empty<string>()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MarkAllAsRead_UpdatesCurrentNotifications()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        await revendeurClient.PostAsJsonAsync("/api/Motorcycles", new
        {
            company = "Yamaha",
            brand = "R",
            model = "R3",
            qty = 1,
            purchasePrice = 12000m,
            salePrice = 15000m
        });

        var readAllResponse = await revendeurClient.PostAsync("/api/Notifications/read-all", null);
        Assert.Equal(HttpStatusCode.OK, readAllResponse.StatusCode);
        using (var readAllPayload = await readAllResponse.ReadJsonAsync())
        {
            var updated = readAllPayload.RootElement.GetProperty("data").GetProperty("updated").GetInt32();
            Assert.True(updated >= 1);
        }

        var notificationsResponse = await revendeurClient.GetAsync("/api/Notifications");
        Assert.Equal(HttpStatusCode.OK, notificationsResponse.StatusCode);
        using var notificationsPayload = await notificationsResponse.ReadJsonAsync();
        var items = notificationsPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.NotEmpty(items);
        Assert.All(items, item => Assert.True(item.GetProperty("isRead").GetBoolean()));
    }

    [Fact]
    public async Task Fournisseur_CannotUseRevendeurOnlyWriteActions()
    {
        await using var factory = new TestWebApplicationFactory();
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var readResponse = await fournisseurClient.PostAsJsonAsync("/api/Notifications/read", new
        {
            notificationIds = new[] { "any-id" }
        });
        Assert.Equal(HttpStatusCode.Forbidden, readResponse.StatusCode);

        var dismissResponse = await fournisseurClient.PostAsJsonAsync("/api/Notifications/dismiss", new
        {
            notificationIds = new[] { "any-id" }
        });
        Assert.Equal(HttpStatusCode.Forbidden, dismissResponse.StatusCode);
    }

    [Fact]
    public async Task Fournisseur_CanReadNotifications()
    {
        await using var factory = new TestWebApplicationFactory();
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var response = await fournisseurClient.GetAsync("/api/Notifications");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = await response.ReadJsonAsync();
        Assert.True(payload.RootElement.TryGetProperty("data", out _));
    }
}
