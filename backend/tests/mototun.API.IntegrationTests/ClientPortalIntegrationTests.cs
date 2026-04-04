using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;

namespace mototun.API.IntegrationTests;

public class ClientPortalIntegrationTests
{
    private const string ValidPortalCode = TestWebApplicationFactory.ClientPortalAccessCode;

    [Fact]
    public async Task AccessPortal_WithValidCode_ReturnsDossier()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/client-portal/access", new
        {
            code = "a1b2-c3d4 e5f60718293a4b5c6d7e8f90"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = await response.ReadJsonAsync();
        var data = payload.RootElement.GetProperty("data");
        Assert.Equal(TestWebApplicationFactory.InvoiceId, data.GetProperty("invoiceId").GetInt32());
        Assert.Equal(ValidPortalCode, data.GetProperty("accessCode").GetString());
    }

    [Fact]
    public async Task AccessPortal_WithInvalidCode_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/client-portal/access", new
        {
            code = "invalid-code"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DossierAndInvoicePdf_WithValidCode_AreAccessible()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var dossierResponse = await client.GetAsync($"/api/client-portal/{TestWebApplicationFactory.InvoiceId}?code={ValidPortalCode}");
        Assert.Equal(HttpStatusCode.OK, dossierResponse.StatusCode);
        using (var dossierPayload = await dossierResponse.ReadJsonAsync())
        {
            var data = dossierPayload.RootElement.GetProperty("data");
            Assert.Equal("INV-INTEGRATION-001", data.GetProperty("invoiceNumber").GetString());
        }

        var pdfResponse = await client.GetAsync($"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/invoice-pdf?code={ValidPortalCode}");
        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);
        Assert.Equal("application/pdf", pdfResponse.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task UploadAndDownloadDocument_WithValidCode_Works()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        using var invalidTypeForm = BuildUploadForm(ValidPortalCode, 999, "doc.png", "image/png");
        var invalidTypeResponse = await client.PostAsync(
            $"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/documents",
            invalidTypeForm);
        Assert.Equal(HttpStatusCode.BadRequest, invalidTypeResponse.StatusCode);

        using var validForm = BuildUploadForm(
            ValidPortalCode,
            (int)ClientPortalDocumentType.Facture,
            "facture.png",
            "image/png");
        var uploadResponse = await client.PostAsync(
            $"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/documents",
            validForm);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        using var uploadPayload = await uploadResponse.ReadJsonAsync();
        var uploadedDocumentId = uploadPayload.RootElement.GetProperty("data").GetProperty("documentId").GetInt32();

        var downloadResponse = await client.GetAsync(
            $"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/documents/{uploadedDocumentId}/download?code={ValidPortalCode}");

        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);
        Assert.Equal("image/png", downloadResponse.Content.Headers.ContentType?.MediaType);

        var accessResponse = await client.GetAsync(
            $"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/documents/{uploadedDocumentId}/access-url?code={ValidPortalCode}");

        Assert.Equal(HttpStatusCode.OK, accessResponse.StatusCode);
        using (var accessPayload = await accessResponse.ReadJsonAsync())
        {
            var accessUrl = accessPayload.RootElement.GetProperty("data").GetProperty("url").GetString();
            Assert.NotNull(accessUrl);
            Assert.Contains($"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/documents/{uploadedDocumentId}/inline?code=", accessUrl, StringComparison.OrdinalIgnoreCase);

            var inlinePath = new Uri(accessUrl!, UriKind.Absolute).PathAndQuery;
            var inlineResponse = await client.GetAsync(inlinePath);
            Assert.Equal(HttpStatusCode.OK, inlineResponse.StatusCode);
            Assert.Equal("image/png", inlineResponse.Content.Headers.ContentType?.MediaType);
        }
    }

    [Fact]
    public async Task InvoicePdfInline_WithValidCode_IsAccessible()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var pdfResponse = await client.GetAsync($"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/invoice-pdf/inline?code={ValidPortalCode}");
        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);
        Assert.Equal("application/pdf", pdfResponse.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task UploadedDocument_IsNotPubliclyServed_FromStoragePath()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        using var form = BuildUploadForm(
            ValidPortalCode,
            (int)ClientPortalDocumentType.Facture,
            "facture.png",
            "image/png");
        var uploadResponse = await client.PostAsync(
            $"/api/client-portal/{TestWebApplicationFactory.InvoiceId}/documents",
            form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        using var uploadPayload = await uploadResponse.ReadJsonAsync();
        var documentId = uploadPayload.RootElement.GetProperty("data").GetProperty("documentId").GetInt32();

        string relativePath;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            relativePath = db.ClientPortalDocuments.Single(d => d.Id == documentId).RelativePath;
        }

        var directStorageResponse = await client.GetAsync($"/{relativePath}");

        Assert.Equal(HttpStatusCode.NotFound, directStorageResponse.StatusCode);
    }

    private static MultipartFormDataContent BuildUploadForm(string code, int documentType, string fileName, string contentType)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent(code), "Code" },
            { new StringContent(documentType.ToString()), "DocumentType" }
        };

        var fileBytes = new byte[]
        {
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        };

        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(fileContent, "File", fileName);
        return form;
    }
}
