using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using mototun.API.Services.Documents;
using mototun.API.Services.Email;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;

namespace mototun.API.IntegrationTests;

public class InvoiceDossierEmailIntegrationTests
{
    [Fact]
    public async Task SendDossierEmail_ShouldAttachLatestUploadedDocuments()
    {
        var emailSender = new TestEmailSender();
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton(emailSender);
            services.AddSingleton<IEmailSender>(emailSender);
        });

        using (var scope = factory.Services.CreateScope())
        {
            var environment = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var now = DateTime.UtcNow;

            var storageRoot = ClientPortalStoragePaths.GetStorageRoot(environment.ContentRootPath, TestWebApplicationFactory.InvoiceId);
            Directory.CreateDirectory(storageRoot);

            var fileName = "cin-front-test.pdf";
            var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
            var absolutePath = Path.Combine(storageRoot, fileName);
            await File.WriteAllBytesAsync(absolutePath, fileBytes);

            db.ClientPortalDocuments.Add(new ClientPortalDocument
            {
                InvoiceId = TestWebApplicationFactory.InvoiceId,
                DocumentType = ClientPortalDocumentType.CinFront,
                OriginalFileName = "cin-front.pdf",
                StoredFileName = fileName,
                ContentType = "application/pdf",
                SizeBytes = fileBytes.Length,
                RelativePath = ClientPortalStoragePaths.BuildRelativePath(TestWebApplicationFactory.InvoiceId, fileName),
                UploadedByClient = true,
                CreatedAt = now,
                UpdatedAt = now
            });

            await db.SaveChangesAsync();
        }

        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);
        var response = await client.PostAsJsonAsync(
            $"/api/Invoices/{TestWebApplicationFactory.InvoiceId}/carte-grise/send-email",
            new
            {
                to = "recipient.integration@mototun.test",
                subject = "Dossier carte grise",
                message = "Merci de trouver les documents en piece jointe."
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var sent = Assert.Single(emailSender.SentMessages);
        Assert.Equal("recipient.integration@mototun.test", sent.To);
        Assert.Equal("Dossier carte grise", sent.Subject);
        var attachment = Assert.Single(sent.Attachments);
        Assert.Equal("cin-front.pdf", attachment.FileName);
        Assert.Equal("application/pdf", attachment.ContentType);
        Assert.Equal(new byte[] { 0x25, 0x50, 0x44, 0x46 }, attachment.Content);
    }
}
