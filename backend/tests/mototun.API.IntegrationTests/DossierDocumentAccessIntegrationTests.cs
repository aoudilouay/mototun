using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class DossierDocumentAccessIntegrationTests
{
    [Fact]
    public async Task RevendeurDocumentAccessUrl_FallsBackToInlineEndpoint_WhenBlobSasIsUnavailable()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        using var uploadForm = BuildUploadForm((int)ClientPortalDocumentType.Facture, "facture.png", "image/png");
        var uploadResponse = await client.PostAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/documents", uploadForm);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        using var uploadPayload = await uploadResponse.ReadJsonAsync();
        var documentId = uploadPayload.RootElement.GetProperty("data").GetProperty("documentId").GetInt32();

        var accessResponse = await client.GetAsync($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/documents/{documentId}/sas-url");
        Assert.Equal(HttpStatusCode.OK, accessResponse.StatusCode);

        using var accessPayload = await accessResponse.ReadJsonAsync();
        var url = accessPayload.RootElement.GetProperty("data").GetProperty("url").GetString();
        Assert.NotNull(url);
        Assert.Contains($"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/documents/{documentId}/inline", url, StringComparison.OrdinalIgnoreCase);

        var inlinePath = new Uri(url!, UriKind.Absolute).PathAndQuery;
        var inlineResponse = await client.GetAsync(inlinePath);
        Assert.Equal(HttpStatusCode.OK, inlineResponse.StatusCode);
        Assert.Equal("image/png", inlineResponse.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task FournisseurDocumentAccessUrl_FallsBackToInlineEndpoint_WhenBlobSasIsUnavailable()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.FournisseurUserId, UserRole.Fournisseur);

        using var uploadForm = BuildUploadForm((int)ClientPortalDocumentType.Facture, "facture.png", "image/png");
        var uploadResponse = await client.PostAsync($"/api/Invoices/fournisseur/carte-grise/{TestWebApplicationFactory.InvoiceId}/documents", uploadForm);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        using var uploadPayload = await uploadResponse.ReadJsonAsync();
        var documentId = uploadPayload.RootElement.GetProperty("data").GetProperty("documentId").GetInt32();

        var accessResponse = await client.GetAsync($"/api/Invoices/fournisseur/carte-grise/{TestWebApplicationFactory.InvoiceId}/documents/{documentId}/sas-url");
        Assert.Equal(HttpStatusCode.OK, accessResponse.StatusCode);

        using var accessPayload = await accessResponse.ReadJsonAsync();
        var url = accessPayload.RootElement.GetProperty("data").GetProperty("url").GetString();
        Assert.NotNull(url);
        Assert.Contains($"/api/Invoices/fournisseur/carte-grise/{TestWebApplicationFactory.InvoiceId}/documents/{documentId}/inline", url, StringComparison.OrdinalIgnoreCase);

        var inlinePath = new Uri(url!, UriKind.Absolute).PathAndQuery;
        var inlineResponse = await client.GetAsync(inlinePath);
        Assert.Equal(HttpStatusCode.OK, inlineResponse.StatusCode);
        Assert.Equal("image/png", inlineResponse.Content.Headers.ContentType?.MediaType);
    }

    private static MultipartFormDataContent BuildUploadForm(int documentType, string fileName, string contentType)
    {
        var form = new MultipartFormDataContent
        {
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
