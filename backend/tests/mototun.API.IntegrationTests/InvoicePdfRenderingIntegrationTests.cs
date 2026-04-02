using System.Net;
using System.Net.Http.Json;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class InvoicePdfRenderingIntegrationTests
{
    [Fact]
    public async Task DownloadInvoicePdf_ForMotorcycleSale_UsesFrenchLabelsAndLineContent()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        var invoiceId = await CreateInvoiceAsync(client, soldCount: 3);

        var pdfResponse = await client.GetAsync($"/api/Invoices/{invoiceId}/pdf");
        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);
        Assert.Equal("application/pdf", pdfResponse.Content.Headers.ContentType?.MediaType);

        var pdfBytes = await pdfResponse.Content.ReadAsByteArrayAsync();
        Assert.True(pdfBytes.Length > 1024);

        var pdfText = ExtractPdfText(pdfBytes);
        Assert.Contains("Facture", pdfText, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Nom :", pdfText);
        Assert.Contains("Adresse :", pdfText);
        Assert.Contains("Tel :", pdfText);
        Assert.Contains("Matricule fiscale", pdfText);
        Assert.Contains("Numero de chassis", pdfText);
        Assert.Contains("Couleur", pdfText);
        Assert.Contains("Prix TVA", pdfText);
        Assert.Contains("Prix TTC / Net a payer", pdfText);
        Assert.Contains("SIGNATURE ET CACHET", pdfText);
        Assert.Contains("Reference", pdfText);

        Assert.DoesNotContain("Invoice #", pdfText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Price", pdfText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Qty", pdfText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Due date", pdfText, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DownloadInvoicePdf_WithMoreThanFourMotorcycles_ShowsOverflowLineIndicator()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        var invoiceId = await CreateInvoiceAsync(client, soldCount: 6);

        var pdfResponse = await client.GetAsync($"/api/Invoices/{invoiceId}/pdf");
        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);

        var pdfText = ExtractPdfText(await pdfResponse.Content.ReadAsByteArrayAsync());
        Assert.Contains("+ 2 ligne(s) supplementaire(s)", pdfText, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<int> CreateInvoiceAsync(HttpClient client, int soldCount)
    {
        var soldMotorcycles = Enumerable.Range(1, soldCount)
            .Select(index => new
            {
                company = "Zimota",
                brand = "Sinus",
                model = $"S{index}",
                chassisNumber = $"CHASSIS-PDF-{Guid.NewGuid():N}-{index}",
                engineNumber = index == 1 ? "Couleur: Bleu" : $"MOTEUR-{index}",
                matricule = index == 2 ? "Couleur: Rouge" : $"MAT-{index}",
                purchasePrice = 8000m + (index * 100m),
                salePrice = 10000m + (index * 500m)
            })
            .ToArray();

        var payload = new
        {
            clientId = TestWebApplicationFactory.ClientId,
            notes = "test-rendu-pdf",
            soldMotorcycles
        };

        var createResponse = await client.PostAsJsonAsync("/api/Invoices", payload);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using var createJson = await createResponse.ReadJsonAsync();
        return createJson.RootElement.GetProperty("data").GetProperty("invoiceId").GetInt32();
    }

    private static string ExtractPdfText(byte[] pdfBytes)
    {
        var pdfLatinText = Encoding.Latin1.GetString(pdfBytes);
        var collector = new StringBuilder(pdfLatinText.Length);

        var streamIndex = 0;
        while ((streamIndex = pdfLatinText.IndexOf("stream", streamIndex, StringComparison.Ordinal)) >= 0)
        {
            var contentStart = streamIndex + "stream".Length;
            if (contentStart < pdfLatinText.Length && pdfLatinText[contentStart] == '\r')
            {
                contentStart++;
            }

            if (contentStart < pdfLatinText.Length && pdfLatinText[contentStart] == '\n')
            {
                contentStart++;
            }

            var contentEnd = pdfLatinText.IndexOf("endstream", contentStart, StringComparison.Ordinal);
            if (contentEnd < 0)
            {
                break;
            }

            var length = contentEnd - contentStart;
            if (length > 0 && contentStart + length <= pdfBytes.Length)
            {
                var streamBytes = new byte[length];
                Buffer.BlockCopy(pdfBytes, contentStart, streamBytes, 0, length);
                CollectStreamText(collector, streamBytes);
            }

            streamIndex = contentEnd + "endstream".Length;
        }

        return NormalizePdfEscapes(collector.ToString());
    }

    private static void CollectStreamText(StringBuilder collector, byte[] streamBytes)
    {
        if (streamBytes.Length == 0)
        {
            return;
        }

        collector.Append(Encoding.Latin1.GetString(streamBytes));
        collector.Append('\n');

        TryCollectDecompressedText(collector, streamBytes, useZlib: true);
        TryCollectDecompressedText(collector, streamBytes, useZlib: false);
    }

    private static void TryCollectDecompressedText(StringBuilder collector, byte[] sourceBytes, bool useZlib)
    {
        try
        {
            using var input = new MemoryStream(sourceBytes);
            using Stream decompressor = useZlib
                ? new ZLibStream(input, CompressionMode.Decompress)
                : new DeflateStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            decompressor.CopyTo(output);
            var decoded = output.ToArray();
            if (decoded.Length == 0)
            {
                return;
            }

            collector.Append(Encoding.Latin1.GetString(decoded));
            collector.Append('\n');
        }
        catch
        {
            // Stream is not compressed in this format; ignore and continue.
        }
    }

    private static string NormalizePdfEscapes(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var normalized = value
            .Replace(@"\(", "(")
            .Replace(@"\)", ")")
            .Replace(@"\n", "\n")
            .Replace(@"\r", "\r")
            .Replace(@"\t", "\t")
            .Replace(@"\\", "\\");

        return Regex.Replace(normalized, @"\\([0-7]{1,3})", match =>
        {
            var octal = match.Groups[1].Value;
            try
            {
                var ascii = Convert.ToInt32(octal, 8);
                ascii = Math.Clamp(ascii, 0, 255);
                return ((char)ascii).ToString();
            }
            catch
            {
                return match.Value;
            }
        });
    }
}
