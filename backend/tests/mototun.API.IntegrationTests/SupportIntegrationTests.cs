using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class SupportIntegrationTests
{
    [Fact]
    public async Task RevendeurCanCreateTicket_AndAdminCanReply()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var adminClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.AdminUserId,
            UserRole.Admin);

        var createResponse = await revendeurClient.PostAsJsonAsync("/api/support/tickets", new
        {
            subject = "Probleme impression facture",
            category = "Facturation",
            priority = (int)SupportTicketPriority.High,
            message = "Le PDF ne sort pas correctement sur certaines factures."
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var ticket = createPayload.RootElement.GetProperty("data");
        var ticketId = ticket.GetProperty("id").GetInt32();
        Assert.True(ticketId > 0);
        Assert.Equal((int)SupportTicketStatus.Pending, ticket.GetProperty("status").GetInt32());

        var adminListResponse = await adminClient.GetAsync("/api/support/tickets");
        Assert.Equal(HttpStatusCode.OK, adminListResponse.StatusCode);
        using (var adminListPayload = await adminListResponse.ReadJsonAsync())
        {
            var items = adminListPayload.RootElement.GetProperty("data").EnumerateArray().ToList();
            Assert.Contains(items, item => item.GetProperty("id").GetInt32() == ticketId);
        }

        var replyResponse = await adminClient.PostAsJsonAsync($"/api/support/tickets/{ticketId}/messages", new
        {
            message = "Bien recu. Nous preparons un correctif."
        });
        Assert.Equal(HttpStatusCode.OK, replyResponse.StatusCode);

        var detailResponse = await revendeurClient.GetAsync($"/api/support/tickets/{ticketId}");
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        using var detailPayload = await detailResponse.ReadJsonAsync();
        var messages = detailPayload.RootElement.GetProperty("data").GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(2, messages.Count);
        Assert.Equal((int)UserRole.Admin, messages.Last().GetProperty("senderRole").GetInt32());
    }

    [Fact]
    public async Task UserCannotReadTicketFromAnotherUser()
    {
        await using var factory = new TestWebApplicationFactory();
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var createResponse = await fournisseurClient.PostAsJsonAsync("/api/support/tickets", new
        {
            subject = "Question compte",
            message = "Je dois modifier mes informations fiscales."
        });
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var ticketId = createPayload.RootElement.GetProperty("data").GetProperty("id").GetInt32();

        var forbiddenResponse = await revendeurClient.GetAsync($"/api/support/tickets/{ticketId}");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResponse.StatusCode);
    }

    [Fact]
    public async Task RevendeurCanOnlyCloseOwnTicket()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var createResponse = await revendeurClient.PostAsJsonAsync("/api/support/tickets", new
        {
            subject = "Suivi dossier",
            message = "Je veux verifier un statut qui reste bloque."
        });
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var createPayload = await createResponse.ReadJsonAsync();
        var ticketId = createPayload.RootElement.GetProperty("data").GetProperty("id").GetInt32();

        var inProgressResponse = await revendeurClient.PatchAsJsonAsync($"/api/support/tickets/{ticketId}/status", new
        {
            status = (int)SupportTicketStatus.InProgress
        });
        Assert.Equal(HttpStatusCode.Forbidden, inProgressResponse.StatusCode);

        var closeResponse = await revendeurClient.PatchAsJsonAsync($"/api/support/tickets/{ticketId}/status", new
        {
            status = (int)SupportTicketStatus.Closed
        });
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);
        using var closePayload = await closeResponse.ReadJsonAsync();
        Assert.Equal((int)SupportTicketStatus.Closed, closePayload.RootElement.GetProperty("data").GetProperty("status").GetInt32());
    }
}
