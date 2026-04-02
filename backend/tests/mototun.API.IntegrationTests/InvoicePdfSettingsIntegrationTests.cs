using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using mototun.API.Extensions;
using mototun.API.Services.InvoicePdf;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class InvoicePdfSettingsIntegrationTests
{
    [Fact]
    public async Task Revendeur_CanUpdateAndReloadInvoicePdfSettings()
    {
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll(typeof(IInvoicePdfSettingsStore));
            services.AddSingleton<IInvoicePdfSettingsStore, InMemoryInvoicePdfSettingsStore>();
        });

        using var revendeurClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.RevendeurUserId, UserRole.Revendeur);

        var initialResponse = await revendeurClient.GetAsync("/api/Invoices/pdf-settings");
        Assert.Equal(HttpStatusCode.OK, initialResponse.StatusCode);

        var payload = """
        {
          "brandName": "Launch Moto",
          "brandTagline": "Factures premium",
          "documentTitle": "Facture Professionnelle",
          "invoiceDateLabel": "Date facture",
          "tableHeaderDescription": "Designation",
          "footerColumn1Title": "Launch Moto SARL",
          "fontFamily": "Courier",
          "titleFontSize": 40,
          "headingFontSize": 11,
          "bodyFontSize": 9.5,
          "smallFontSize": 7.4,
          "logoX": 470,
          "logoY": 732,
          "logoSize": 82,
          "sellerBlockX": 54,
          "sellerBlockY": 680,
          "sellerBlockWidth": 250,
          "tableX": 42,
          "tableY": 410,
          "tableWidth": 500,
          "totalsX": 398,
          "totalsY": 188,
          "totalsWidth": 160,
          "footerY": 96,
          "footerWidth": 510,
          "accentColorHex": "#0E4A8A",
          "tableHeaderBackgroundHex": "#E9F1FB"
        }
        """;

        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        var updateResponse = await revendeurClient.PutAsync("/api/Invoices/pdf-settings", content);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using (var updateJson = JsonDocument.Parse(await updateResponse.Content.ReadAsStringAsync()))
        {
            var data = updateJson.RootElement.GetProperty("data");
            Assert.Equal("Launch Moto", data.GetProperty("brandName").GetString());
            Assert.Equal("Facture Professionnelle", data.GetProperty("documentTitle").GetString());
            Assert.Equal("Courier", data.GetProperty("fontFamily").GetString());
            Assert.Equal(40, data.GetProperty("titleFontSize").GetDouble());
            Assert.Equal(54, data.GetProperty("sellerBlockX").GetDouble());
            Assert.Equal(250, data.GetProperty("sellerBlockWidth").GetDouble());
            Assert.Equal(500, data.GetProperty("tableWidth").GetDouble());
            Assert.Equal(96, data.GetProperty("footerY").GetDouble());
            Assert.Equal(510, data.GetProperty("footerWidth").GetDouble());
            Assert.Equal("#0E4A8A", data.GetProperty("accentColorHex").GetString());
            Assert.True(data.GetProperty("hasCustomSettings").GetBoolean());
        }

        var reloadResponse = await revendeurClient.GetAsync("/api/Invoices/pdf-settings");
        Assert.Equal(HttpStatusCode.OK, reloadResponse.StatusCode);

        using var reloadJson = JsonDocument.Parse(await reloadResponse.Content.ReadAsStringAsync());
        var reloadData = reloadJson.RootElement.GetProperty("data");
        Assert.Equal("Launch Moto", reloadData.GetProperty("brandName").GetString());
        Assert.Equal("Designation", reloadData.GetProperty("tableHeaderDescription").GetString());
        Assert.Equal("Launch Moto SARL", reloadData.GetProperty("footerColumn1Title").GetString());
        Assert.Equal("Courier", reloadData.GetProperty("fontFamily").GetString());
        Assert.Equal(470, reloadData.GetProperty("logoX").GetDouble());
        Assert.Equal(42, reloadData.GetProperty("tableX").GetDouble());
        Assert.Equal(410, reloadData.GetProperty("tableY").GetDouble());
        Assert.Equal(160, reloadData.GetProperty("totalsWidth").GetDouble());
        Assert.Equal("#E9F1FB", reloadData.GetProperty("tableHeaderBackgroundHex").GetString());
    }

    [Fact]
    public async Task NonRevendeur_CannotUpdateInvoicePdfSettings()
    {
        await using var factory = new TestWebApplicationFactory(services =>
        {
            services.RemoveAll(typeof(IInvoicePdfSettingsStore));
            services.AddSingleton<IInvoicePdfSettingsStore, InMemoryInvoicePdfSettingsStore>();
        });

        using var fournisseurClient = factory.CreateAuthenticatedClient(TestWebApplicationFactory.FournisseurUserId, UserRole.Fournisseur);

        using var content = new StringContent("""{"brandName":"Forbidden"}""", Encoding.UTF8, "application/json");
        var response = await fournisseurClient.PutAsync("/api/Invoices/pdf-settings", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private sealed class InMemoryInvoicePdfSettingsStore : IInvoicePdfSettingsStore
    {
        private readonly Dictionary<int, InvoicePdfCustomization> _settings = new();
        private readonly object _gate = new();

        public Task<InvoicePdfCustomization?> GetRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default)
        {
            lock (_gate)
            {
                if (_settings.TryGetValue(revendeurId, out var customization))
                {
                    return Task.FromResult<InvoicePdfCustomization?>(Clone(customization));
                }
            }

            return Task.FromResult<InvoicePdfCustomization?>(null);
        }

        public Task SaveRevendeurCustomizationAsync(int revendeurId, InvoicePdfCustomization customization, CancellationToken cancellationToken = default)
        {
            lock (_gate)
            {
                _settings[revendeurId] = Clone(customization);
            }

            return Task.CompletedTask;
        }

        public Task DeleteRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default)
        {
            lock (_gate)
            {
                _settings.Remove(revendeurId);
            }

            return Task.CompletedTask;
        }

        private static InvoicePdfCustomization Clone(InvoicePdfCustomization source)
        {
            return new InvoicePdfCustomization
            {
                BrandName = source.BrandName,
                BrandTagline = source.BrandTagline,
                DocumentTitle = source.DocumentTitle,
                SellerBlockTitle = source.SellerBlockTitle,
                ClientBlockTitle = source.ClientBlockTitle,
                InvoiceDateLabel = source.InvoiceDateLabel,
                InvoiceNumberLabel = source.InvoiceNumberLabel,
                DueDateLabel = source.DueDateLabel,
                PaymentLabel = source.PaymentLabel,
                ReferenceLabel = source.ReferenceLabel,
                AdditionalInfoLabel = source.AdditionalInfoLabel,
                AdditionalInfoValue = source.AdditionalInfoValue,
                PaymentTermText = source.PaymentTermText,
                ReferencePrefix = source.ReferencePrefix,
                DueInDays = source.DueInDays,
                DefaultUnit = source.DefaultUnit,
                TableHeaderDescription = source.TableHeaderDescription,
                TableHeaderQuantity = source.TableHeaderQuantity,
                TableHeaderUnit = source.TableHeaderUnit,
                TableHeaderUnitPrice = source.TableHeaderUnitPrice,
                TableHeaderTaxRate = source.TableHeaderTaxRate,
                TableHeaderTaxAmount = source.TableHeaderTaxAmount,
                TableHeaderTotal = source.TableHeaderTotal,
                TotalsSubtotalLabel = source.TotalsSubtotalLabel,
                TotalsTaxLabel = source.TotalsTaxLabel,
                TotalsTotalLabel = source.TotalsTotalLabel,
                FooterColumn1Title = source.FooterColumn1Title,
                FooterColumn2Title = source.FooterColumn2Title,
                FooterColumn3Title = source.FooterColumn3Title,
                FooterColumn1Line1 = source.FooterColumn1Line1,
                FooterColumn1Line2 = source.FooterColumn1Line2,
                FooterColumn1Line3 = source.FooterColumn1Line3,
                FooterColumn2Line1 = source.FooterColumn2Line1,
                FooterColumn2Line2 = source.FooterColumn2Line2,
                FooterColumn2Line3 = source.FooterColumn2Line3,
                FooterColumn3Line1 = source.FooterColumn3Line1,
                FooterColumn3Line2 = source.FooterColumn3Line2,
                FooterColumn3Line3 = source.FooterColumn3Line3,
                FontFamily = source.FontFamily,
                TitleFontSize = source.TitleFontSize,
                HeadingFontSize = source.HeadingFontSize,
                BodyFontSize = source.BodyFontSize,
                SmallFontSize = source.SmallFontSize,
                LogoDataUrl = source.LogoDataUrl,
                LogoX = source.LogoX,
                LogoY = source.LogoY,
                LogoSize = source.LogoSize,
                SellerBlockX = source.SellerBlockX,
                SellerBlockY = source.SellerBlockY,
                SellerBlockWidth = source.SellerBlockWidth,
                ClientBlockX = source.ClientBlockX,
                ClientBlockY = source.ClientBlockY,
                ClientBlockWidth = source.ClientBlockWidth,
                MetadataX = source.MetadataX,
                MetadataY = source.MetadataY,
                MetadataWidth = source.MetadataWidth,
                AdditionalInfoX = source.AdditionalInfoX,
                AdditionalInfoY = source.AdditionalInfoY,
                AdditionalInfoWidth = source.AdditionalInfoWidth,
                TableX = source.TableX,
                TableY = source.TableY,
                TableWidth = source.TableWidth,
                TotalsX = source.TotalsX,
                TotalsY = source.TotalsY,
                TotalsWidth = source.TotalsWidth,
                FooterY = source.FooterY,
                FooterWidth = source.FooterWidth,
                AccentColorHex = source.AccentColorHex,
                PageBackgroundHex = source.PageBackgroundHex,
                BodyTextColorHex = source.BodyTextColorHex,
                MutedTextColorHex = source.MutedTextColorHex,
                DividerColorHex = source.DividerColorHex,
                TableHeaderBackgroundHex = source.TableHeaderBackgroundHex,
                TableHeaderTextColorHex = source.TableHeaderTextColorHex,
                TableBorderColorHex = source.TableBorderColorHex,
                TableAlternateRowColorHex = source.TableAlternateRowColorHex,
                ServiceTitle = source.ServiceTitle,
                FooterTitle = source.FooterTitle,
                FooterLine1 = source.FooterLine1,
                FooterLine2 = source.FooterLine2
            };
        }
    }
}
