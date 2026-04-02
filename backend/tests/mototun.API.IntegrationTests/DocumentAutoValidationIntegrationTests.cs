using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using mototun.API.Services.DocumentAnalysis;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class DocumentAutoValidationIntegrationTests
{
    [Fact]
    public async Task RevendeurUpload_WithDetectedIssues_UpdatesValidationState()
    {
        var ocrResult = new DocumentAutoValidationResult
        {
            WasAnalyzed = true,
            Reasons = new[] { DocumentValidationReason.Blurred, DocumentValidationReason.Mismatch },
            Checklist = new[]
            {
                "Reprendre une photo nette du CIN recto",
                "Verifier CIN et nom du client"
            },
            Summary = "OCR: texte partiellement lisible."
        };

        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll(typeof(IDocumentAutoValidationService));
            services.AddSingleton<IDocumentAutoValidationService>(new StubAutoValidationService(ocrResult));
        });
        using var revendeurClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        using var uploadContent = BuildUploadContent(ClientPortalDocumentType.CinFront, "cin-front.png");
        var uploadResponse = await revendeurClient.PostAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/documents", uploadContent);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        var invoiceResponse = await revendeurClient.GetAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}");
        Assert.Equal(HttpStatusCode.OK, invoiceResponse.StatusCode);

        using var invoicePayload = JsonDocument.Parse(await invoiceResponse.Content.ReadAsStringAsync());
        var invoiceData = invoicePayload.RootElement.GetProperty("data");

        var reasons = invoiceData.GetProperty("documentIssueReasons").EnumerateArray().Select(x => x.GetInt32()).ToList();
        var checklist = invoiceData.GetProperty("documentFixChecklist").EnumerateArray().Select(x => x.GetString()).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
        var issueMessage = invoiceData.TryGetProperty("documentIssueMessage", out var issueElement)
            ? issueElement.GetString() ?? string.Empty
            : string.Empty;
        var timeline = invoiceData.GetProperty("timeline").EnumerateArray().ToList();

        Assert.Contains((int)DocumentValidationReason.Blurred, reasons);
        Assert.Contains((int)DocumentValidationReason.Mismatch, reasons);
        Assert.Contains("Reprendre une photo nette du CIN recto", checklist);
        Assert.DoesNotContain("[Auto OCR", issueMessage, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(timeline, entry => entry.GetProperty("eventType").GetInt32() == (int)InvoiceTimelineEventType.DocumentIssueUpdated);
    }

    [Fact]
    public async Task RevendeurUpload_WhenOcrFails_StillSucceedsWithoutValidationFlags()
    {
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll(typeof(IDocumentAutoValidationService));
            services.AddSingleton<IDocumentAutoValidationService>(
                new StubAutoValidationService(DocumentAutoValidationResult.Skipped, throwOnAnalyze: true));
        });
        using var revendeurClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        using var uploadContent = BuildUploadContent(ClientPortalDocumentType.DeclarationImpot, "declaration.png");
        var uploadResponse = await revendeurClient.PostAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/documents", uploadContent);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        var invoiceResponse = await revendeurClient.GetAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}");
        Assert.Equal(HttpStatusCode.OK, invoiceResponse.StatusCode);

        using var invoicePayload = JsonDocument.Parse(await invoiceResponse.Content.ReadAsStringAsync());
        var invoiceData = invoicePayload.RootElement.GetProperty("data");
        var reasons = invoiceData.GetProperty("documentIssueReasons").EnumerateArray().ToList();
        var timeline = invoiceData.GetProperty("timeline").EnumerateArray().ToList();

        Assert.Empty(reasons);
        Assert.DoesNotContain(timeline, entry => entry.GetProperty("eventType").GetInt32() == (int)InvoiceTimelineEventType.DocumentIssueUpdated);
    }

    private static MultipartFormDataContent BuildUploadContent(ClientPortalDocumentType documentType, string fileName)
    {
        var content = new MultipartFormDataContent();
        content.Add(new StringContent(((int)documentType).ToString(CultureInfo.InvariantCulture)), "DocumentType");

        var fileBytes = new byte[]
        {
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D
        };

        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "File", fileName);
        return content;
    }

    private sealed class StubAutoValidationService : IDocumentAutoValidationService
    {
        private readonly DocumentAutoValidationResult _result;
        private readonly bool _throwOnAnalyze;

        public StubAutoValidationService(DocumentAutoValidationResult result, bool throwOnAnalyze = false)
        {
            _result = result;
            _throwOnAnalyze = throwOnAnalyze;
        }

        public bool IsSupported(ClientPortalDocumentType documentType)
        {
            return documentType is ClientPortalDocumentType.Cin
                or ClientPortalDocumentType.CinFront
                or ClientPortalDocumentType.CinBack
                or ClientPortalDocumentType.DeclarationImpot;
        }

        public Task<DocumentAutoValidationResult> AnalyzeAsync(
            ClientPortalDocumentType documentType,
            string absolutePath,
            string originalFileName,
            CancellationToken cancellationToken = default)
        {
            if (_throwOnAnalyze)
            {
                throw new InvalidOperationException("OCR service unavailable");
            }

            return Task.FromResult(_result);
        }
    }
}
