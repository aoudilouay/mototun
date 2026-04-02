using mototun.Core.Enums;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace mototun.API.IntegrationTests;

public class DossierWorkflowIntegrationTests
{
    [Fact]
    public async Task ValidationChecklistWorkflow_UpdatesDossier_AndAppearsInAdminAudit()
    {
        await using var factory = new TestWebApplicationFactory();
        using var fournisseurClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.FournisseurUserId, UserRole.Fournisseur);
        using var revendeurClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);
        using var adminClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.AdminUserId, UserRole.Admin);

        var fournisseurUpdate = await fournisseurClient.PatchAsJsonAsync(
            $"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/carte-grise/document-validation",
            new
            {
                reasons = new[] { 1, 2 },
                checklist = new[] { "Reuploader CIN verso lisible", "Signer facture client" },
                additionalMessage = "Documents recus mais non conformes",
                sendChecklistToClient = false
            });

        Assert.Equal(HttpStatusCode.OK, fournisseurUpdate.StatusCode);

        var fournisseurInvoiceResponse = await fournisseurClient.GetAsync($"/api/Invoices/fournisseur/carte-grise/{TestWebApplicationFactory.InvoiceId}");
        Assert.Equal(HttpStatusCode.OK, fournisseurInvoiceResponse.StatusCode);

        using (var invoicePayload = JsonDocument.Parse(await fournisseurInvoiceResponse.Content.ReadAsStringAsync()))
        {
            var invoiceData = invoicePayload.RootElement.GetProperty("data");
            var reasons = invoiceData.GetProperty("documentIssueReasons").EnumerateArray().Select(x => x.GetInt32()).ToList();
            var checklist = invoiceData.GetProperty("documentFixChecklist").EnumerateArray().Select(x => x.GetString()).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();

            Assert.Contains(1, reasons);
            Assert.Contains(2, reasons);
            Assert.Contains("Reuploader CIN verso lisible", checklist);
        }

        var revendeurUpdate = await revendeurClient.PatchAsJsonAsync(
            $"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/carte-grise/document-validation",
            new
            {
                reasons = new[] { 3 },
                checklist = new[] { "Verifier et corriger numero CIN du client" },
                additionalMessage = "Merci de corriger puis renvoyer",
                sendChecklistToClient = true
            });

        Assert.Equal(HttpStatusCode.OK, revendeurUpdate.StatusCode);

        var revendeurInvoiceResponse = await revendeurClient.GetAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}");
        Assert.Equal(HttpStatusCode.OK, revendeurInvoiceResponse.StatusCode);

        using (var invoicePayload = JsonDocument.Parse(await revendeurInvoiceResponse.Content.ReadAsStringAsync()))
        {
            var invoiceData = invoicePayload.RootElement.GetProperty("data");
            var clientMessage = invoiceData.GetProperty("clientUpdateMessage").GetString() ?? string.Empty;
            var timeline = invoiceData.GetProperty("timeline").EnumerateArray().ToList();

            Assert.Contains("Votre dossier carte grise necessite des corrections.", clientMessage);
            Assert.Contains(timeline, e => e.GetProperty("eventType").GetInt32() == (int)InvoiceTimelineEventType.DocumentValidationChecklistPublishedToClient);
        }

        var auditResponse = await adminClient.GetAsync("/api/admin/audit?action=10&actorRole=Revendeur&take=50");
        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);

        using (var auditPayload = JsonDocument.Parse(await auditResponse.Content.ReadAsStringAsync()))
        {
            var data = auditPayload.RootElement.GetProperty("data");
            var summary = data.GetProperty("summary");
            var items = data.GetProperty("items").EnumerateArray().ToList();

            Assert.True(summary.GetProperty("totalEvents").GetInt32() >= 1);
            Assert.NotEmpty(items);
            Assert.Contains(items, item => item.GetProperty("eventType").GetInt32() == 10);
        }

        var exportResponse = await adminClient.GetAsync("/api/admin/audit/export?action=10&actorRole=Revendeur&take=50");
        Assert.Equal(HttpStatusCode.OK, exportResponse.StatusCode);

        var csv = await exportResponse.Content.ReadAsStringAsync();
        Assert.Contains("EventId,CreatedAtUtc,Action", csv);
        Assert.Contains("DocumentValidationChecklistPublishedToClient", csv);
    }
}
