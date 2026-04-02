using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class RevendeurSettingsIntegrationTests
{
    [Fact]
    public async Task Revendeur_CanReadAndUpdateSlaSettings()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var initialResponse = await revendeurClient.GetAsync("/api/revendeur-settings/me/sla");
        Assert.Equal(HttpStatusCode.OK, initialResponse.StatusCode);

        using (var initialPayload = await initialResponse.ReadJsonAsync())
        {
            var data = initialPayload.RootElement.GetProperty("data");
            Assert.Equal(12, data.GetProperty("warningAfterHours").GetInt32());
            Assert.Equal(24, data.GetProperty("stuckAfterHours").GetInt32());
        }

        var updateResponse = await revendeurClient.PutAsJsonAsync("/api/revendeur-settings/me/sla", new
        {
            warningAfterHours = 6,
            stuckAfterHours = 18,
            escalationAfterHours = 36,
            repeatEveryHours = 12,
            enableEscalation = true,
            enableEmail = false,
            enableSms = true,
            enableWhatsApp = true
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        using (var updatePayload = await updateResponse.ReadJsonAsync())
        {
            var data = updatePayload.RootElement.GetProperty("data");
            Assert.Equal(6, data.GetProperty("warningAfterHours").GetInt32());
            Assert.Equal(18, data.GetProperty("stuckAfterHours").GetInt32());
            Assert.True(data.GetProperty("enableSms").GetBoolean());
            Assert.True(data.GetProperty("enableWhatsApp").GetBoolean());
        }

        var reloadResponse = await revendeurClient.GetAsync("/api/revendeur-settings/me/sla");
        Assert.Equal(HttpStatusCode.OK, reloadResponse.StatusCode);
        using var reloadPayload = await reloadResponse.ReadJsonAsync();
        var reloadData = reloadPayload.RootElement.GetProperty("data");
        Assert.Equal(6, reloadData.GetProperty("warningAfterHours").GetInt32());
        Assert.Equal(18, reloadData.GetProperty("stuckAfterHours").GetInt32());
    }

    [Fact]
    public async Task Revendeur_UpdateSlaSettings_RejectsInvalidRanges()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var invalidWarningResponse = await revendeurClient.PutAsJsonAsync("/api/revendeur-settings/me/sla", new
        {
            warningAfterHours = 0,
            stuckAfterHours = 10,
            escalationAfterHours = 20,
            repeatEveryHours = 5,
            enableEscalation = true,
            enableEmail = true,
            enableSms = false,
            enableWhatsApp = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, invalidWarningResponse.StatusCode);

        var invalidStuckResponse = await revendeurClient.PutAsJsonAsync("/api/revendeur-settings/me/sla", new
        {
            warningAfterHours = 12,
            stuckAfterHours = 8,
            escalationAfterHours = 20,
            repeatEveryHours = 5,
            enableEscalation = true,
            enableEmail = true,
            enableSms = false,
            enableWhatsApp = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, invalidStuckResponse.StatusCode);

        var invalidEscalationResponse = await revendeurClient.PutAsJsonAsync("/api/revendeur-settings/me/sla", new
        {
            warningAfterHours = 6,
            stuckAfterHours = 20,
            escalationAfterHours = 10,
            repeatEveryHours = 5,
            enableEscalation = true,
            enableEmail = true,
            enableSms = false,
            enableWhatsApp = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, invalidEscalationResponse.StatusCode);
    }

    [Fact]
    public async Task Admin_CanUpdatePlan_AndRevendeurCanReadPlan()
    {
        await using var factory = new TestWebApplicationFactory();
        using var adminClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.AdminUserId,
            UserRole.Admin);
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var patchResponse = await adminClient.PatchAsJsonAsync(
            $"/api/revendeur-settings/{TestWebApplicationFactory.RevendeurId}/plan",
            new { planTier = (int)SubscriptionPlanTier.Pro });

        Assert.Equal(HttpStatusCode.OK, patchResponse.StatusCode);
        using (var patchPayload = await patchResponse.ReadJsonAsync())
        {
            var data = patchPayload.RootElement.GetProperty("data");
            Assert.Equal((int)SubscriptionPlanTier.Pro, data.GetProperty("planTier").GetInt32());
            Assert.Equal(2500, data.GetProperty("monthlyInvoiceLimit").GetInt32());
            Assert.Equal(20000, data.GetProperty("activeClientLimit").GetInt32());
        }

        var getPlanResponse = await revendeurClient.GetAsync("/api/revendeur-settings/me/plan");
        Assert.Equal(HttpStatusCode.OK, getPlanResponse.StatusCode);
        using var getPlanPayload = await getPlanResponse.ReadJsonAsync();
        var getPlanData = getPlanPayload.RootElement.GetProperty("data");
        Assert.Equal((int)SubscriptionPlanTier.Pro, getPlanData.GetProperty("planTier").GetInt32());
        Assert.Equal(2500, getPlanData.GetProperty("monthlyInvoiceLimit").GetInt32());
        Assert.Equal(20000, getPlanData.GetProperty("activeClientLimit").GetInt32());
    }

    [Fact]
    public async Task NonAdmin_CannotUpdatePlan()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var response = await revendeurClient.PatchAsJsonAsync(
            $"/api/revendeur-settings/{TestWebApplicationFactory.RevendeurId}/plan",
            new { planTier = (int)SubscriptionPlanTier.Growth });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
