using System.Globalization;
using System.Text;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf.IO;
using mototun.Core.Entities;

namespace mototun.API.Extensions;

public static class InvoicePdfBuilder
{
    private const double PAGE_WIDTH = 595;
    private const double PAGE_HEIGHT = 842;
    private const double MARGIN = 36;
    private const decimal TVA_RATE = 0.19m;
    private const double TABLE_MIN_BOTTOM_Y = 72;
    private const double TABLE_RECOMMENDED_TOP_Y = 452;
    private const int PARTY_BLOCK_MAX_LINES = 4;
    private static readonly string[] FrenchUnits =
    {
        "zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
        "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"
    };

    public static byte[] Build(Invoice invoice, InvoicePdfCustomization? customization = null)
    {
        var basePdf = BuildLegacyPdf(invoice, customization);
        return EmbedImagesWithPdfSharp(basePdf, invoice, customization);
    }

    private static byte[] BuildLegacyPdf(Invoice invoice, InvoicePdfCustomization? customization)
    {
        var content = BuildContentStream(invoice, customization);
        var contentBytes = Encoding.ASCII.GetBytes(content);

        var objects = new List<string>
        {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R /F5 9 0 R /F6 10 0 R /F7 11 0 R /F8 12 0 R >> >> /Contents 4 0 R >>",
            $"<< /Length {contentBytes.Length} >>\nstream\n{content}\nendstream",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
        };

        using var ms = new MemoryStream();
        var offsets = new List<long> { 0 };
        WriteAscii(ms, "%PDF-1.4\n");

        for (var i = 0; i < objects.Count; i++)
        {
            offsets.Add(ms.Position);
            WriteAscii(ms, $"{i + 1} 0 obj\n");
            WriteAscii(ms, objects[i]);
            WriteAscii(ms, "\nendobj\n");
        }

        var xrefPosition = ms.Position;
        WriteAscii(ms, $"xref\n0 {objects.Count + 1}\n");
        WriteAscii(ms, "0000000000 65535 f \n");
        for (var i = 1; i < offsets.Count; i++)
        {
            WriteAscii(ms, $"{offsets[i]:0000000000} 00000 n \n");
        }

        WriteAscii(ms, $"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\n");
        WriteAscii(ms, $"startxref\n{xrefPosition}\n%%EOF");

        return ms.ToArray();
    }

    private static byte[] EmbedImagesWithPdfSharp(byte[] basePdf, Invoice invoice, InvoicePdfCustomization? customization)
    {
        var showLogo = false;
        var theme = ResolveTheme(invoice, customization);
        var layout = ResolveLayout(customization);
        var hasLogo = showLogo && !string.IsNullOrWhiteSpace(theme.LogoDataUrl);
        var hasCustomImages = customization?.CustomElements?.Any(element =>
            element.Visible
            && NormalizeCustomElementType(element.Type) is "image" or "signature" or "stamp"
            && !string.IsNullOrWhiteSpace(ResolveMediaDataUrl(element, theme))) == true;

        if (!hasLogo && !hasCustomImages)
        {
            return basePdf;
        }
        var imageCache = new Dictionary<string, XImage>(StringComparer.Ordinal);

        try
        {
            using var input = new MemoryStream(basePdf);
            using var document = PdfReader.Open(input, PdfDocumentOpenMode.Modify);
            if (document.PageCount == 0)
            {
                return basePdf;
            }

            var page = document.Pages[0];
            using var graphics = XGraphics.FromPdfPage(page);

            if (hasLogo)
            {
                DrawLogoImageOverlay(graphics, theme, layout, imageCache);
            }

            if (hasCustomImages && customization?.CustomElements is not null)
            {
                DrawCustomImageOverlays(graphics, customization.CustomElements, theme, imageCache);
            }

            using var output = new MemoryStream();
            document.Save(output, false);
            return output.ToArray();
        }
        catch
        {
            return basePdf;
        }
        finally
        {
            foreach (var image in imageCache.Values)
            {
                image.Dispose();
            }
        }
    }

    private static void DrawLogoImageOverlay(
        XGraphics graphics,
        PdfTheme theme,
        PdfLayout layout,
        IDictionary<string, XImage> imageCache)
    {
        if (!TryGetImage(theme.LogoDataUrl, imageCache, out var image) || image is null)
        {
            return;
        }

        var size = Clamp(layout.LogoSize, 40, 140);
        var x = Clamp(layout.LogoX, 10, PAGE_WIDTH - size - 10);
        var y = Clamp(layout.LogoY, 680, PAGE_HEIGHT - size - 10);
        var rect = new XRect(x + 2, PAGE_HEIGHT - y - size + 2, Math.Max(10, size - 4), Math.Max(10, size - 4));

        graphics.DrawRectangle(XBrushes.White, rect);
        DrawImageContain(graphics, image, rect);
    }

    private static void DrawCustomImageOverlays(
        XGraphics graphics,
        IEnumerable<InvoicePdfCustomElement> elements,
        PdfTheme theme,
        IDictionary<string, XImage> imageCache)
    {
        foreach (var element in elements
                     .Where(candidate => candidate.Visible)
                     .OrderBy(candidate => candidate.ZIndex)
                     .ThenBy(candidate => candidate.Id))
        {
            var type = NormalizeCustomElementType(element.Type);
            if (type is not ("image" or "signature" or "stamp"))
            {
                continue;
            }

            var dataUrl = ResolveMediaDataUrl(element, theme);
            if (!TryGetImage(dataUrl, imageCache, out var image) || image is null)
            {
                continue;
            }

            var width = Clamp(element.Width, 60, PAGE_WIDTH - 20);
            var height = Clamp(element.Height, 20, 300);
            var x = Clamp(element.X, 10, PAGE_WIDTH - width - 10);

            // Properly handle Y coordinate for PdfSharp
            // Element.Y is in PDF points where 0=top, 842=bottom
            // PdfSharp XGraphics uses origin at bottom-left, so invert
            var maxY = PAGE_HEIGHT - height;
            var y = Clamp(element.Y, 10, maxY);
            var yInverted = PAGE_HEIGHT - (y + height);  // Invert for PdfSharp

            var rect = new XRect(x, yInverted, width, height);
            var fillColor = ParseHexColor(element.BackgroundColorHex, new PdfColor(1, 1, 1));
            var strokeColor = ParseHexColor(element.StrokeColorHex, theme.DividerColor);
            var strokeWidth = Clamp(element.StrokeWidth, 0.4, 12);

            graphics.DrawRectangle(new XSolidBrush(ToXColor(fillColor)), rect);
            DrawImageContain(graphics, image, rect);
            graphics.DrawRectangle(new XPen(ToXColor(strokeColor), strokeWidth), rect);
        }
    }

    private static string? ResolveMediaDataUrl(InvoicePdfCustomElement element, PdfTheme theme)
    {
        if (!string.IsNullOrWhiteSpace(element.SrcDataUrl))
        {
            return element.SrcDataUrl;
        }

        return NormalizeCustomElementType(element.Type) switch
        {
            "signature" => theme.SignatureDataUrl,
            "stamp" => theme.StampDataUrl,
            _ => null
        };
    }

    private static void DrawImageContain(XGraphics graphics, XImage image, XRect bounds)
    {
        if (bounds.Width <= 0 || bounds.Height <= 0)
        {
            return;
        }

        var imageWidth = image.PointWidth > 0 ? image.PointWidth : image.PixelWidth;
        var imageHeight = image.PointHeight > 0 ? image.PointHeight : image.PixelHeight;
        if (imageWidth <= 0 || imageHeight <= 0)
        {
            return;
        }

        var scale = Math.Min(bounds.Width / imageWidth, bounds.Height / imageHeight);
        var drawWidth = imageWidth * scale;
        var drawHeight = imageHeight * scale;
        var drawX = bounds.X + ((bounds.Width - drawWidth) / 2d);
        var drawY = bounds.Y + ((bounds.Height - drawHeight) / 2d);

        var state = graphics.Save();
        graphics.IntersectClip(bounds);
        graphics.DrawImage(image, drawX, drawY, drawWidth, drawHeight);
        graphics.Restore(state);
    }

    private static bool TryGetImage(string? dataUrl, IDictionary<string, XImage> cache, out XImage? image)
    {
        image = null;
        if (string.IsNullOrWhiteSpace(dataUrl))
        {
            return false;
        }

        var key = dataUrl.Trim();
        if (cache.TryGetValue(key, out var cached))
        {
            image = cached;
            return true;
        }

        if (!TryDecodeImageDataUrl(key, out var mimeType, out var imageBytes))
        {
            return false;
        }

        if (mimeType.Contains("svg", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        try
        {
            var payload = imageBytes;
            var loaded = XImage.FromStream(() => new MemoryStream(payload, writable: false));
            cache[key] = loaded;
            image = loaded;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool TryDecodeImageDataUrl(string value, out string mimeType, out byte[] bytes)
    {
        mimeType = string.Empty;
        bytes = Array.Empty<byte>();
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var normalized = value.Trim();
        if (!normalized.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var markerIndex = normalized.IndexOf(";base64,", StringComparison.OrdinalIgnoreCase);
        if (markerIndex <= 11 || markerIndex + 8 >= normalized.Length)
        {
            return false;
        }

        try
        {
            mimeType = normalized.Substring(5, markerIndex - 5);
            bytes = Convert.FromBase64String(normalized[(markerIndex + 8)..]);
            return bytes.Length > 0;
        }
        catch
        {
            return false;
        }
    }

    private static string BuildContentStream(Invoice invoice, InvoicePdfCustomization? customization)
    {
        var sb = new StringBuilder();
        var soldRows = invoice.SoldMotorcycles.OrderBy(s => s.Id).ToList();
        var theme = ResolveTheme(invoice, customization);
        var layout = ResolveLayout(customization);
        var calculations = CalculateInvoiceTotals(soldRows, invoice.TotalAmount);
        var showHeader = customization?.ShowHeader ?? true;
        var showLogo = false;
        var showSellerBlock = customization?.ShowSellerBlock ?? true;
        var showClientBlock = customization?.ShowClientBlock ?? true;
        var showMetadata = customization?.ShowMetadata ?? true;
        var showAdditionalInfo = customization?.ShowAdditionalInfo ?? true;
        var showTable = customization?.ShowTable ?? true;
        var showTotals = customization?.ShowTotals ?? true;
        var showFooter = customization?.ShowFooter ?? true;
        var showTotalInWords = customization?.ShowTotalInWords ?? true;
        var safeTableTop = showTable
            ? ResolveSafeTableTop(layout, showMetadata, showAdditionalInfo)
            : layout.TableY;
        var totalWordsY = layout.TotalWordsY;
        double? renderedTableBottom = null;

        DrawPageBackground(sb, theme);
        if (showHeader || showLogo)
        {
            DrawHeader(sb, invoice, theme, layout, showHeader, showLogo);
        }

        if (showSellerBlock || showClientBlock)
        {
            DrawSellerAndClientBlocks(sb, invoice, theme, layout, showSellerBlock, showClientBlock);
        }

        if (showMetadata)
        {
            DrawMetadataStrip(sb, invoice, theme, layout);
        }

        if (showAdditionalInfo)
        {
            DrawAdditionalInfo(sb, invoice, theme, layout);
        }

        if (showTable)
        {
            renderedTableBottom = DrawItemsTable(
                sb,
                soldRows,
                calculations,
                theme,
                layout,
                showTotals,
                safeTableTop);
        }

        if (showTotals && !showTable)
        {
            DrawTotalsBlock(sb, calculations, theme, layout);
        }

        if (renderedTableBottom.HasValue)
        {
            totalWordsY = Math.Min(totalWordsY, renderedTableBottom.Value - 14);
        }

        if (showTotalInWords)
        {
            DrawTotalInWords(sb, calculations, theme, layout, customization?.TotalInWordsLabel, totalWordsY);
        }

        if (showFooter)
        {
            if (showTable)
            {
                var signatureY = layout.SignatureBlockY;
                if (renderedTableBottom.HasValue)
                {
                    var safeMaxSignatureY = renderedTableBottom.Value - 18;
                    if (showTotalInWords)
                    {
                        safeMaxSignatureY = Math.Min(safeMaxSignatureY, totalWordsY - 16);
                    }

                    signatureY = Math.Min(signatureY, safeMaxSignatureY);
                }

                DrawSignatureAndStamp(sb, theme, layout, signatureY);
            }
            else
            {
                DrawFooter(sb, theme, layout);
            }
        }

        DrawCustomElements(sb, customization?.CustomElements, theme);

        return sb.ToString().TrimEnd();
    }

    private static void DrawFixedClassicFacture(
        StringBuilder sb,
        Invoice invoice,
        IReadOnlyList<SoldMotorcycle> soldRows,
        InvoiceCalculations calculations)
    {
        const double frameX = 24;
        const double frameY = 24;
        var frameWidth = PAGE_WIDTH - (frameX * 2);
        var frameHeight = PAGE_HEIGHT - (frameY * 2);
        const string regular = "F5";
        const string bold = "F6";
        const string italic = "F7";

        SetFillColor(sb, 1, 1, 1);
        FillRect(sb, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        SetStrokeColor(sb, 0, 0, 0);
        SetLineWidth(sb, 0.8);
        StrokeRect(sb, frameX, frameY, frameWidth, frameHeight);

        var sellerName = string.IsNullOrWhiteSpace(invoice.Revendeur?.BusinessName)
            ? "REVENDEUR"
            : invoice.Revendeur.BusinessName.Trim().ToUpperInvariant();
        var sellerAddress = BuildAddressLine(invoice.Revendeur?.Address, invoice.Revendeur?.City, invoice.Revendeur?.PostalCode);
        var sellerTax = string.IsNullOrWhiteSpace(invoice.Revendeur?.TaxId) ? "-" : invoice.Revendeur.TaxId.Trim();
        var sellerPhone = string.IsNullOrWhiteSpace(invoice.Revendeur?.User?.Phone) ? "-" : invoice.Revendeur.User.Phone.Trim();

        SetFillColor(sb, 0, 0, 0);
        Text(sb, bold, 11, 44, 770, FitText(sellerName, bold, 11, 320));
        Text(sb, regular, 9, 44, 756, FitText(string.IsNullOrWhiteSpace(sellerAddress) ? "Adresse : -" : sellerAddress, regular, 9, 320));
        Text(sb, regular, 9, 44, 742, FitText($"Matricule fiscale : {sellerTax}", regular, 9, 320));
        Text(sb, regular, 9, 44, 728, FitText($"Tel : {sellerPhone}", regular, 9, 320));

        TextRight(sb, regular, 9, PAGE_WIDTH - 44, 770, $"Date : {invoice.InvoiceDate:dd/MM/yyyy}");
        TextRight(sb, regular, 9, PAGE_WIDTH - 44, 756, $"Facture N : {invoice.InvoiceNumber}");

        TextCenter(sb, bold, 28, PAGE_WIDTH / 2, 660, "FACTURE");

        var clientName = string.IsNullOrWhiteSpace(invoice.Client?.FullName) ? "-" : invoice.Client.FullName.Trim();
        var clientCin = string.IsNullOrWhiteSpace(invoice.Client?.CIN) ? "-" : invoice.Client.CIN.Trim().ToUpperInvariant();
        var clientAddress = BuildAddressLine(invoice.Client?.Address, invoice.Client?.City, null);
        if (string.IsNullOrWhiteSpace(clientAddress))
        {
            clientAddress = "-";
        }

        Text(sb, regular, 11, 44, 620, FitText($"Client : {clientName}", regular, 11, 500));
        Text(sb, regular, 11, 44, 602, FitText($"CIN : {clientCin}", regular, 11, 500));
        Text(sb, regular, 11, 44, 584, FitText($"Adresse : {clientAddress}", regular, 11, 500));

        DrawFixedClassicItemsTable(sb, soldRows, calculations, regular, bold, italic);
    }

    private static void DrawFixedClassicItemsTable(
        StringBuilder sb,
        IReadOnlyList<SoldMotorcycle> soldRows,
        InvoiceCalculations calculations,
        string regularFont,
        string boldFont,
        string italicFont)
    {
        const double tableLeft = 40;
        const double tableTop = 540;
        const double tableWidth = PAGE_WIDTH - 80;
        const double headerHeight = 24;
        const double rowHeight = 58;
        const double totalHeight = 28;
        const int maxRows = 4;

        var colQty = tableLeft + (tableWidth * 0.67);
        var colPu = tableLeft + (tableWidth * 0.76);
        var colPt = tableLeft + (tableWidth * 0.88);
        var tableBodyRows = maxRows;
        var rowsHeight = rowHeight * tableBodyRows;
        var tableBottom = tableTop - headerHeight - rowsHeight - totalHeight;

        SetStrokeColor(sb, 0, 0, 0);
        SetLineWidth(sb, 0.8);
        StrokeRect(sb, tableLeft, tableBottom, tableWidth, tableTop - tableBottom);

        DrawLine(sb, tableLeft, tableTop - headerHeight, tableLeft + tableWidth, tableTop - headerHeight);
        DrawLine(sb, colQty, tableBottom, colQty, tableTop);
        DrawLine(sb, colPu, tableBottom, colPu, tableTop);
        DrawLine(sb, colPt, tableBottom, colPt, tableTop);

        TextCenter(sb, boldFont, 10, tableLeft + ((colQty - tableLeft) / 2), tableTop - 16, "Designations");
        TextCenter(sb, boldFont, 10, colQty + ((colPu - colQty) / 2), tableTop - 16, "Qte");
        TextCenter(sb, boldFont, 10, colPu + ((colPt - colPu) / 2), tableTop - 16, "PU.TTC");
        TextCenter(sb, boldFont, 10, colPt + ((tableLeft + tableWidth - colPt) / 2), tableTop - 16, "PT.TTC");

        for (var index = 0; index < tableBodyRows; index++)
        {
            var rowTop = tableTop - headerHeight - (index * rowHeight);
            var rowBottom = rowTop - rowHeight;
            DrawLine(sb, tableLeft, rowBottom, tableLeft + tableWidth, rowBottom);

            if (index >= soldRows.Count)
            {
                continue;
            }

            var sold = soldRows[index];
            var designationPrimary = $"{sold.Company} {sold.Brand} {sold.Model}".Trim();
            if (string.IsNullOrWhiteSpace(designationPrimary))
            {
                designationPrimary = "MOTO";
            }

            var series = string.IsNullOrWhiteSpace(sold.ChassisNumber) ? "-" : sold.ChassisNumber.Trim().ToUpperInvariant();
            var line1 = $"- {designationPrimary}";
            var line2 = $"- N° serie : {series}";
            var price = sold.SalePrice < 0m ? 0m : sold.SalePrice;

            Text(sb, regularFont, 9.5, tableLeft + 8, rowTop - 16, FitText(line1, regularFont, 9.5, colQty - tableLeft - 14));
            Text(sb, regularFont, 9, tableLeft + 8, rowTop - 32, FitText(line2, regularFont, 9, colQty - tableLeft - 14));

            TextCenter(sb, regularFont, 10, colQty + ((colPu - colQty) / 2), rowTop - 24, "01");
            TextRight(sb, regularFont, 10, colPt - 6, rowTop - 24, FormatMoney(price));
            TextRight(sb, regularFont, 10, tableLeft + tableWidth - 6, rowTop - 24, FormatMoney(price));
        }

        var totalTop = tableBottom + totalHeight;
        DrawLine(sb, tableLeft, totalTop, tableLeft + tableWidth, totalTop);
        TextRight(sb, boldFont, 10, colPt - 8, tableBottom + 8, "TOTAL TTC");
        TextRight(sb, boldFont, 10.5, tableLeft + tableWidth - 6, tableBottom + 8, FormatMoney(calculations.FinalTotal));

        var wordsText = $"Arretee la presente facture a la somme de : {FormatMoney(calculations.FinalTotal)}";
        Text(sb, italicFont, 9, tableLeft + 2, tableBottom - 22, FitText(wordsText, italicFont, 9, tableWidth - 8));

        if (soldRows.Count > maxRows)
        {
            Text(sb, italicFont, 8.5, tableLeft + 2, tableBottom - 36, $"+ {soldRows.Count - maxRows} ligne(s) supplementaire(s)");
        }

        DrawLine(sb, tableLeft + tableWidth - 190, 140, tableLeft + tableWidth - 20, 140);
        TextCenter(sb, regularFont, 10, tableLeft + tableWidth - 105, 126, "SIGNATURE ET CACHET");
    }

    private static InvoiceCalculations CalculateInvoiceTotals(List<SoldMotorcycle> motorcycles, decimal invoiceTotal)
    {
        var totalTTC = motorcycles.Sum(m => m.SalePrice);
        if (totalTTC < 0m)
        {
            totalTTC = 0m;
        }

        var subtotalHT = RoundMoney(totalTTC / (1m + TVA_RATE));
        var tvaAmount = RoundMoney(totalTTC - subtotalHT);
        var normalizedInvoiceTotal = invoiceTotal > 0m ? invoiceTotal : totalTTC;
        var adjustmentAmount = RoundMoney(normalizedInvoiceTotal - totalTTC);
        var finalTotal = normalizedInvoiceTotal;
        if (finalTotal < 0m)
        {
            adjustmentAmount -= finalTotal;
            finalTotal = 0m;
        }

        return new InvoiceCalculations
        {
            SubtotalHT = subtotalHT,
            TVAAmount = tvaAmount,
            TotalTTC = totalTTC,
            FinalTotal = finalTotal,
            AdjustmentAmount = adjustmentAmount
        };
    }

    private static void DrawPageBackground(StringBuilder sb, PdfTheme theme)
    {
        SetFillColor(sb, theme.PageBackgroundColor);
        FillRect(sb, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    }

    private static void DrawHeader(
        StringBuilder sb,
        Invoice invoice,
        PdfTheme theme,
        PdfLayout layout,
        bool drawHeaderText,
        bool drawLogo)
    {
        var logoSize = Clamp(layout.LogoSize, 40, 140);
        var logoX = Clamp(layout.LogoX, 10, PAGE_WIDTH - logoSize - 10);
        var logoY = Clamp(layout.LogoY, 680, PAGE_HEIGHT - logoSize - 10);
        var headerTop = 818d;
        var headerBottom = 736d;
        var headerLeft = MARGIN;
        var headerWidth = PAGE_WIDTH - (MARGIN * 2);
        var headerRight = headerLeft + headerWidth;
        var titleBaselineY = headerBottom + 12;
        var titleMaxBySpace = Math.Max(20, Math.Min(38, (headerTop - 48 - titleBaselineY) / 0.82));
        var titleSize = Clamp(theme.TitleFontSize - 1.2, 20, titleMaxBySpace);

        SetFillColor(sb, 1, 1, 1);
        FillRect(sb, headerLeft, headerBottom, headerWidth, headerTop - headerBottom);
        SetFillColor(sb, theme.AccentColor);
        FillRect(sb, headerLeft, headerTop - 8, headerWidth, 8);
        SetStrokeColor(sb, theme.TableBorderColor);
        SetLineWidth(sb, 0.8);
        DrawLine(sb, headerLeft, headerBottom, headerRight, headerBottom);

        if (drawHeaderText)
        {
            var infoCardWidth = 196d;
            var infoCardRight = drawLogo ? logoX - 12 : headerRight - 6;
            var infoCardX = Math.Max(headerLeft + 230, infoCardRight - infoCardWidth);
            var infoCardTop = headerTop - 10;
            var infoCardBottom = headerBottom + 6;
            var infoCardHeight = infoCardTop - infoCardBottom;
            var titleLeft = headerLeft + 12;
            var titleRight = infoCardX - 16;
            var titleWidth = Math.Max(180, titleRight - titleLeft);
            var titleCenterX = titleLeft + (titleWidth / 2d);

            SetFillColor(sb, ParseHexColor("#F8FAFC", theme.TableHeaderBackgroundColor));
            FillRect(sb, infoCardX, infoCardBottom, infoCardWidth, infoCardHeight);
            SetStrokeColor(sb, theme.TableBorderColor);
            SetLineWidth(sb, 0.6);
            StrokeRect(sb, infoCardX, infoCardBottom, infoCardWidth, infoCardHeight);

            SetFillColor(sb, theme.BodyTextColor);
            Text(
                sb,
                theme.FontBold,
                Clamp(theme.HeadingFontSize + 1.2, 9, 18),
                titleLeft,
                headerTop - 20,
                FitText(theme.BrandName, theme.FontBold, Clamp(theme.HeadingFontSize + 1.2, 9, 18), titleWidth));

            SetFillColor(sb, theme.MutedTextColor);
            Text(
                sb,
                theme.FontRegular,
                Clamp(theme.SmallFontSize + 0.8, 7, 13),
                titleLeft,
                headerTop - 34,
                FitText(theme.BrandTagline, theme.FontRegular, Clamp(theme.SmallFontSize + 0.8, 7, 13), titleWidth));

            SetFillColor(sb, theme.BodyTextColor);
            TextCenter(
                sb,
                theme.FontBold,
                titleSize,
                titleCenterX,
                titleBaselineY,
                FitText(BuildPolishedTitle(theme.DocumentTitle), theme.FontBold, titleSize, titleWidth));

            // Professional accent line under title
            SetStrokeColor(sb, theme.AccentColor);
            SetLineWidth(sb, 1.2);
            DrawLine(sb, titleLeft, titleBaselineY - 6, titleLeft + Math.Min(titleWidth, 250), titleBaselineY - 6);

            var metaLabelSize = Clamp(theme.SmallFontSize + 0.4, 6.5, 12);
            var metaValueSize = Clamp(theme.BodyFontSize + 1.0, 8.4, 15);
            var metaTextLeft = infoCardX + 10;
            var metaTextRight = infoCardX + infoCardWidth - 10;
            var numberLabelY = infoCardTop - 16;
            var numberValueY = numberLabelY - 11;
            var dateLabelY = numberValueY - 14;
            var dateValueY = dateLabelY - 11;

            SetFillColor(sb, theme.MutedTextColor);
            Text(
                sb,
                theme.FontBold,
                metaLabelSize,
                metaTextLeft,
                numberLabelY,
                FitText(theme.InvoiceNumberLabel, theme.FontBold, metaLabelSize, infoCardWidth - 20));
            Text(
                sb,
                theme.FontBold,
                metaLabelSize,
                metaTextLeft,
                dateLabelY,
                FitText(theme.InvoiceDateLabel, theme.FontBold, metaLabelSize, infoCardWidth - 20));

            SetFillColor(sb, theme.AccentColor);
            TextRight(
                sb,
                theme.FontBold,
                metaValueSize,
                metaTextRight,
                numberValueY,
                FitText(invoice.InvoiceNumber, theme.FontBold, metaValueSize, infoCardWidth - 20));
            SetFillColor(sb, theme.BodyTextColor);
            TextRight(
                sb,
                theme.FontRegular,
                metaValueSize,
                metaTextRight,
                dateValueY,
                invoice.InvoiceDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture));
        }

        if (drawLogo)
        {
            SetFillColor(sb, 1, 1, 1);
            FillRect(sb, logoX, logoY, logoSize, logoSize);
            SetStrokeColor(sb, theme.DividerColor);
            SetLineWidth(sb, 0.9);
            StrokeRect(sb, logoX, logoY, logoSize, logoSize);
            SetFillColor(sb, theme.MutedTextColor);
            TextCenter(
                sb,
                theme.FontBold,
                Math.Max(9, Clamp(theme.HeadingFontSize, 8, 18)),
                logoX + (logoSize / 2),
                logoY + (logoSize * 0.56),
                string.IsNullOrWhiteSpace(theme.LogoDataUrl) ? "Logo" : "Image logo");
        }
    }

    private static void DrawSellerAndClientBlocks(
        StringBuilder sb,
        Invoice invoice,
        PdfTheme theme,
        PdfLayout layout,
        bool showSellerBlock,
        bool showClientBlock)
    {
        var headingSize = Clamp(theme.HeadingFontSize + 0.6, 8, 18);
        var bodySize = Clamp(theme.BodyFontSize, 7, 16);
        var lineStep = Math.Max(11, bodySize + 2.4);

        var sellerLines = BuildSellerLines(invoice, theme).Take(PARTY_BLOCK_MAX_LINES).ToList();
        var clientLines = BuildClientLines(invoice).Take(PARTY_BLOCK_MAX_LINES).ToList();

        if (showSellerBlock)
        {
            var sellerTitleY = Math.Min(layout.SellerBlockY, 696d);
            DrawPartyBlock(
                sb,
                theme,
                layout.SellerBlockX,
                sellerTitleY,
                layout.SellerBlockWidth,
                theme.SellerBlockTitle,
                sellerLines,
                headingSize,
                bodySize,
                lineStep);
        }

        if (showClientBlock)
        {
            DrawPartyBlock(
                sb,
                theme,
                layout.ClientBlockX,
                layout.ClientBlockY,
                layout.ClientBlockWidth,
                theme.ClientBlockTitle,
                clientLines,
                headingSize,
                bodySize,
                lineStep);
        }
    }

    private static void DrawPartyBlock(
        StringBuilder sb,
        PdfTheme theme,
        double x,
        double titleY,
        double width,
        string title,
        IReadOnlyCollection<string> lines,
        double headingSize,
        double bodySize,
        double lineStep)
    {
        var blockX = Clamp(x, 10, PAGE_WIDTH - 150);
        var blockWidth = Clamp(width, 140, PAGE_WIDTH - blockX - 10);
        var titleTextY = Clamp(titleY, 130, PAGE_HEIGHT - 20);
        var safeLines = lines
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Take(PARTY_BLOCK_MAX_LINES)
            .ToList();
        if (safeLines.Count == 0)
        {
            safeLines.Add("-");
        }

        var textX = blockX;
        var textWidth = Math.Max(90, blockWidth - 2);
        var titleText = string.IsNullOrWhiteSpace(title) ? "-" : title.Trim().ToUpperInvariant();
        var dividerY = titleTextY - 6.2;
        var firstLineY = dividerY - Math.Max(10.8, bodySize + 2.4);

        SetFillColor(sb, theme.BodyTextColor);
        Text(
            sb,
            theme.FontBold,
            Clamp(headingSize - 0.1, 7.5, 15),
            textX,
            titleTextY,
            FitText(Truncate(titleText, 24), theme.FontBold, Clamp(headingSize - 0.1, 7.5, 15), textWidth));

        SetStrokeColor(sb, theme.TableBorderColor);
        SetLineWidth(sb, 0.5);
        DrawLine(sb, blockX, dividerY, blockX + Math.Min(blockWidth, 228), dividerY);

        for (var i = 0; i < safeLines.Count; i++)
        {
            var isPrimaryLine = i == 0;
            var lineY = firstLineY - (lineStep * i);
            var lineText = safeLines[i].Trim();
            var labelValueSeparatorIndex = lineText.IndexOf(':');
            var lineFontSize = isPrimaryLine
                ? Clamp(bodySize + 0.2, 7, 16)
                : Clamp(bodySize - 0.1, 6.8, 15.8);

            if (labelValueSeparatorIndex > 0 && labelValueSeparatorIndex < lineText.Length - 1)
            {
                var label = lineText[..(labelValueSeparatorIndex + 1)].Trim();
                var value = lineText[(labelValueSeparatorIndex + 1)..].Trim();
                var maxLabelWidth = Math.Min(textWidth * 0.48, 124);
                var measuredLabelWidth = MeasureTextWidth(theme.FontBold, lineFontSize, label);
                var labelWidth = Math.Min(measuredLabelWidth, maxLabelWidth);
                var valueX = textX + labelWidth + 4;
                var valueWidth = Math.Max(42, textWidth - labelWidth - 4);

                SetFillColor(sb, theme.BodyTextColor);
                Text(
                    sb,
                    theme.FontBold,
                    lineFontSize,
                    textX,
                    lineY,
                    FitText(label, theme.FontBold, lineFontSize, maxLabelWidth));

                SetFillColor(sb, isPrimaryLine ? theme.BodyTextColor : theme.MutedTextColor);
                Text(
                    sb,
                    isPrimaryLine ? theme.FontBold : theme.FontRegular,
                    lineFontSize,
                    valueX,
                    lineY,
                    FitText(value, isPrimaryLine ? theme.FontBold : theme.FontRegular, lineFontSize, valueWidth));
                continue;
            }

            SetFillColor(sb, isPrimaryLine ? theme.BodyTextColor : theme.MutedTextColor);
            Text(
                sb,
                isPrimaryLine ? theme.FontBold : theme.FontRegular,
                lineFontSize,
                textX,
                lineY,
                FitText(
                    lineText,
                    isPrimaryLine ? theme.FontBold : theme.FontRegular,
                    lineFontSize,
                    textWidth));
        }
    }

    private static void DrawTotalInWords(
        StringBuilder sb,
        InvoiceCalculations calculations,
        PdfTheme theme,
        PdfLayout layout,
        string? totalInWordsLabel,
        double? yOverride = null)
    {
        var label = string.IsNullOrWhiteSpace(totalInWordsLabel)
            ? "Arrete la presente facture a la somme de :"
            : totalInWordsLabel.Trim();

        var text = $"{label} {FormatAmountInWords(calculations.FinalTotal)}.";
        var x = layout.TotalWordsX;
        var y = yOverride.HasValue ? Clamp(yOverride.Value, 40, 250) : layout.TotalWordsY;
        var width = layout.TotalWordsWidth;
        var fontSize = Clamp(theme.BodyFontSize, 7.2, 13);

        SetFillColor(sb, theme.BodyTextColor);
        Text(sb, theme.FontBold, fontSize, x, y, FitText(text, theme.FontBold, fontSize, width));
    }

    private static void DrawSignatureAndStamp(StringBuilder sb, PdfTheme theme, PdfLayout layout, double? yOverride = null)
    {
        var x = layout.SignatureBlockX;
        var width = layout.SignatureBlockWidth;
        var centerX = x + (width / 2d);
        var labelY = yOverride.HasValue ? Clamp(yOverride.Value, 40, 220) : layout.SignatureBlockY;
        var signatureStrokeY = labelY - 20;
        var halfLine = Math.Max(45, Math.Min(95, (width / 2d) - 10));

        // Professional title for signature section
        SetFillColor(sb, theme.BodyTextColor);
        TextCenter(sb, theme.FontBold, Clamp(theme.HeadingFontSize - 0.2, 7, 15), centerX, labelY, "SIGNATURE ET CACHET");

        // Professional boxes for signature and stamp
        var boxWidth = 50d;
        var boxHeight = 36d;
        var signatureBoxX = centerX - boxWidth - 8;
        var stampBoxX = centerX + 8;
        var boxY = signatureStrokeY - 2;

        // Draw subtle boxes for visual guidance
        SetStrokeColor(sb, theme.TableBorderColor);
        SetLineWidth(sb, 0.6);
        StrokeRect(sb, signatureBoxX, boxY - boxHeight, boxWidth, boxHeight);
        StrokeRect(sb, stampBoxX, boxY - boxHeight, boxWidth, boxHeight);

        // Professional underline
        SetStrokeColor(sb, theme.AccentColor);
        SetLineWidth(sb, 1);
        DrawLine(sb, centerX - halfLine, signatureStrokeY, centerX + halfLine, signatureStrokeY);
    }

    private static double ResolveSafeTableTop(PdfLayout layout, bool showMetadata, bool showAdditionalInfo)
    {
        var requestedTop = Clamp(layout.TableY, 290, 520);
        var maxAllowedTop = 520d;

        if (showMetadata)
        {
            var metadataBottom = layout.MetadataY - 24;
            maxAllowedTop = Math.Min(maxAllowedTop, metadataBottom - 8);
        }

        if (showAdditionalInfo)
        {
            var additionalInfoBottom = layout.AdditionalInfoY - 30;
            maxAllowedTop = Math.Min(maxAllowedTop, additionalInfoBottom - 8);
        }

        maxAllowedTop = Clamp(maxAllowedTop, 290, 520);
        return Math.Min(requestedTop, maxAllowedTop);
    }

    private static void DrawMetadataStrip(StringBuilder sb, Invoice invoice, PdfTheme theme, PdfLayout layout)
    {
        var sectionLeft = layout.MetadataX;
        var sectionRight = Math.Min(PAGE_WIDTH - MARGIN, sectionLeft + layout.MetadataWidth);
        var labelsY = layout.MetadataY;
        var valuesY = labelsY - 18;
        var sectionWidth = sectionRight - sectionLeft;
        var colWidth = sectionWidth / 5d;
        var headingSize = Clamp(theme.HeadingFontSize - 0.5, 8, 18);
        var bodySize = Clamp(theme.BodyFontSize, 7, 16);
        var referenceValue = BuildInvoiceReference(theme.ReferencePrefix, invoice.InvoiceNumber);

        var dueDate = invoice.InvoiceDate.Date.AddDays(theme.DueInDays);
        var labels = new[]
        {
            theme.InvoiceDateLabel,
            theme.InvoiceNumberLabel,
            theme.DueDateLabel,
            theme.PaymentLabel,
            theme.ReferenceLabel
        };
        var values = new[]
        {
            invoice.InvoiceDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
            invoice.InvoiceNumber,
            dueDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
            theme.PaymentTermText,
            referenceValue
        };

        for (var i = 0; i < labels.Length; i++)
        {
            var x = sectionLeft + (colWidth * i);
            SetFillColor(sb, theme.BodyTextColor);
            Text(sb, theme.FontBold, headingSize, x, labelsY, Truncate(labels[i], 20));

            SetFillColor(sb, theme.MutedTextColor);
            Text(sb, theme.FontRegular, bodySize, x, valuesY, Truncate(values[i], 24));
        }

    }

    private static string BuildInvoiceReference(string referencePrefix, string invoiceNumber)
    {
        var prefix = string.IsNullOrWhiteSpace(referencePrefix)
            ? "FAC"
            : referencePrefix.Trim();
        var number = string.IsNullOrWhiteSpace(invoiceNumber)
            ? "-"
            : invoiceNumber.Trim();
        return $"{prefix}-{number}";
    }

    private static void DrawAdditionalInfo(StringBuilder sb, Invoice invoice, PdfTheme theme, PdfLayout layout)
    {
        var infoValue = string.IsNullOrWhiteSpace(invoice.Notes)
            ? theme.AdditionalInfoValue
            : invoice.Notes!.Trim();
        var labelY = layout.AdditionalInfoY;
        var valueY = labelY - 16;
        var x = layout.AdditionalInfoX;
        var width = layout.AdditionalInfoWidth;
        var headingSize = Clamp(theme.HeadingFontSize, 8, 18);
        var bodySize = Clamp(theme.BodyFontSize, 7, 16);
        var maxChars = Math.Max(28, (int)Math.Floor(width / 4.9));

        SetFillColor(sb, theme.BodyTextColor);
        Text(sb, theme.FontBold, headingSize, x, labelY, Truncate(theme.AdditionalInfoLabel, 72));

        SetFillColor(sb, theme.MutedTextColor);
        var lines = WrapLine(infoValue, maxChars).Take(2).ToList();
        for (var i = 0; i < lines.Count; i++)
        {
            Text(sb, theme.FontRegular, bodySize, x, valueY - (i * (bodySize + 3)), Truncate(lines[i], maxChars + 4));
        }

    }

    private static double DrawItemsTable(
        StringBuilder sb,
        List<SoldMotorcycle> motorcycles,
        InvoiceCalculations calculations,
        PdfTheme theme,
        PdfLayout layout,
        bool includeTotals,
        double? tableTopOverride = null)
    {
        var headerTop = tableTopOverride.HasValue
            ? Clamp(tableTopOverride.Value, 290, 520)
            : layout.TableY;
        const double headerHeight = 30;
        const double itemRowHeight = 42;
        const int maxItemRows = 4;
        const double summaryRowHeight = 24;

        var tableLeft = layout.TableX;
        var tableWidth = Math.Min(layout.TableWidth, PAGE_WIDTH - tableLeft - MARGIN);
        var tableRight = tableLeft + tableWidth;
        var cellPadding = 8d;
        var headingSize = Clamp(theme.HeadingFontSize - 0.6, 7.4, 16);
        var bodySize = Clamp(theme.BodyFontSize - 0.2, 7, 14);
        var smallSize = Clamp(theme.SmallFontSize, 6, 12);
        var valueSize = Clamp(bodySize - 0.6, 6.6, 12);
        var totalsHeight = includeTotals ? summaryRowHeight * 2 : 0;
        var desiredRowSlots = motorcycles.Count > 0 ? motorcycles.Count : 1;
        var rowSlots = Math.Max(1, Math.Min(maxItemRows, desiredRowSlots));
        double tableBottom;

        while (true)
        {
            var currentBottom = headerTop
                - headerHeight
                - (itemRowHeight * rowSlots)
                - totalsHeight;
            if (currentBottom >= TABLE_MIN_BOTTOM_Y || rowSlots <= 1)
            {
                tableBottom = currentBottom;
                break;
            }

            rowSlots--;
        }

        var headerBottom = headerTop - headerHeight;
        var itemsBottom = headerBottom - (itemRowHeight * rowSlots);
        var summaryBottom = itemsBottom - totalsHeight;
        tableBottom = summaryBottom;
        var gridBottom = tableBottom;

        var descriptionWidth = tableWidth * 0.35;
        var quantityWidth = tableWidth * 0.06;
        var unitPriceHtWidth = tableWidth * 0.15;
        var tvaWidth = tableWidth * 0.13;
        var unitPriceTtcWidth = tableWidth * 0.15;
        var totalWidth = tableWidth - descriptionWidth - quantityWidth - unitPriceHtWidth - tvaWidth - unitPriceTtcWidth;
        var colQty = tableLeft + descriptionWidth;
        var colUnitPriceHt = colQty + quantityWidth;
        var colTva = colUnitPriceHt + unitPriceHtWidth;
        var colUnitPriceTtc = colTva + tvaWidth;
        var colTotal = colUnitPriceTtc + unitPriceTtcWidth;

        SetFillColor(sb, theme.PageBackgroundColor);
        FillRect(sb, tableLeft, tableBottom, tableWidth, headerTop - tableBottom);

        SetFillColor(sb, theme.TableHeaderBackgroundColor);
        FillRect(sb, tableLeft, headerBottom, tableWidth, headerHeight);

        // Professional header border with accent line
        SetStrokeColor(sb, theme.TableBorderColor);
        SetLineWidth(sb, 0.8);
        DrawLine(sb, tableLeft, headerTop, tableRight, headerTop);

        // Subtle accent line at bottom of header for visual separation
        SetStrokeColor(sb, theme.AccentColor);
        SetLineWidth(sb, 1.0);
        DrawLine(sb, tableLeft, headerBottom + 0.5, tableRight, headerBottom + 0.5);

        if (includeTotals)
        {
            var totalRowTop = itemsBottom - summaryRowHeight;
            SetFillColor(sb, theme.TableHeaderBackgroundColor);
            FillRect(sb, tableLeft, summaryBottom, tableWidth, totalRowTop - summaryBottom);
        }

        for (var i = 0; i < rowSlots; i++)
        {
            if (i % 2 == 1)
            {
                var rowTop = headerBottom - (i * itemRowHeight);
                var rowBottom = rowTop - itemRowHeight;
                SetFillColor(sb, theme.TableAlternateRowColor);
                FillRect(sb, tableLeft, rowBottom, tableWidth, itemRowHeight);
            }
        }

        SetStrokeColor(sb, theme.TableBorderColor);
        SetLineWidth(sb, 0.8);
        StrokeRect(sb, tableLeft, tableBottom, tableWidth, headerTop - tableBottom);
        DrawLine(sb, tableLeft, headerBottom, tableRight, headerBottom);
        for (var i = 1; i <= rowSlots; i++)
        {
            var y = headerBottom - (itemRowHeight * i);
            DrawLine(sb, tableLeft, y, tableRight, y);
        }

        if (includeTotals)
        {
            DrawLine(sb, tableLeft, itemsBottom - summaryRowHeight, tableRight, itemsBottom - summaryRowHeight);
            DrawLine(sb, tableLeft, summaryBottom, tableRight, summaryBottom);
        }

        if (includeTotals)
        {
            DrawLine(sb, colQty, itemsBottom, colQty, headerTop);
            DrawLine(sb, colUnitPriceHt, itemsBottom, colUnitPriceHt, headerTop);
            DrawLine(sb, colTva, itemsBottom, colTva, headerTop);
            DrawLine(sb, colUnitPriceTtc, gridBottom, colUnitPriceTtc, headerTop);
            DrawLine(sb, colTotal, gridBottom, colTotal, headerTop);
        }
        else
        {
            DrawLine(sb, colQty, gridBottom, colQty, headerTop);
            DrawLine(sb, colUnitPriceHt, gridBottom, colUnitPriceHt, headerTop);
            DrawLine(sb, colTva, gridBottom, colTva, headerTop);
            DrawLine(sb, colUnitPriceTtc, gridBottom, colUnitPriceTtc, headerTop);
            DrawLine(sb, colTotal, gridBottom, colTotal, headerTop);
        }

        var headerTextY = headerBottom + Math.Max(8, (headerHeight - headingSize) / 2d + 2);
        SetFillColor(sb, theme.TableHeaderTextColor);
        Text(sb, theme.FontBold, headingSize, tableLeft + cellPadding, headerTextY, FitText(theme.TableHeaderDescription, theme.FontBold, headingSize, descriptionWidth - (cellPadding * 2)));
        TextCenter(sb, theme.FontBold, headingSize, colQty + (quantityWidth / 2), headerTextY, FitText(theme.TableHeaderQuantity, theme.FontBold, headingSize, quantityWidth - (cellPadding * 2)));
        TextRight(sb, theme.FontBold, headingSize, colTva - cellPadding, headerTextY, FitText(theme.TableHeaderUnitPrice, theme.FontBold, headingSize, unitPriceHtWidth - (cellPadding * 2)));
        TextRight(sb, theme.FontBold, headingSize, colUnitPriceTtc - cellPadding, headerTextY, FitText(theme.TableHeaderTaxAmount, theme.FontBold, headingSize, tvaWidth - (cellPadding * 2)));
        TextRight(sb, theme.FontBold, headingSize, colTotal - cellPadding, headerTextY, FitText(theme.TableHeaderUnit, theme.FontBold, headingSize, unitPriceTtcWidth - (cellPadding * 2)));
        TextRight(sb, theme.FontBold, headingSize, tableRight - cellPadding, headerTextY, FitText(theme.TableHeaderTotal, theme.FontBold, headingSize, totalWidth - (cellPadding * 2)));

        var visibleRows = motorcycles.Take(rowSlots).ToList();
        for (var i = 0; i < rowSlots; i++)
        {
            if (i >= visibleRows.Count)
            {
                continue;
            }

            var rowTop = headerBottom - (i * itemRowHeight);
            var motorcycle = visibleRows[i];
            var descriptionPrimaryY = rowTop - Math.Max(12, bodySize + 2.4);
            var descriptionSecondaryY = descriptionPrimaryY - Math.Max(10, smallSize + 2.6);
            var descriptionThirdY = descriptionSecondaryY - Math.Max(9, smallSize + 2.1);
            var rowBottom = rowTop - itemRowHeight;
            var valuesY = rowBottom + ((itemRowHeight + valueSize) / 2d) - 1;
            var totalTTC = motorcycle.SalePrice < 0m ? 0m : motorcycle.SalePrice;
            var unitPriceTTC = totalTTC;
            var unitPriceHT = RoundMoney(unitPriceTTC / (1m + TVA_RATE));
            var unitPriceTVA = RoundMoney(unitPriceTTC - unitPriceHT);
            var description = $"{motorcycle.Company} {motorcycle.Brand} {motorcycle.Model}".Trim();
            if (string.IsNullOrWhiteSpace(description))
            {
                description = "Moto";
            }

            var chassisValue = string.IsNullOrWhiteSpace(motorcycle.ChassisNumber)
                ? "-"
                : motorcycle.ChassisNumber.Trim().ToUpperInvariant();
            var chassisDisplay = FormatChassisDisplay(chassisValue);
            var chassisText = $"Numero de chassis : {chassisDisplay}";
            var colorText = $"Couleur : {ResolveMotorcycleColor(motorcycle)}";

            SetFillColor(sb, theme.BodyTextColor);
            Text(sb, theme.FontBold, bodySize + 0.2, tableLeft + cellPadding, descriptionPrimaryY, FitText(description, theme.FontBold, bodySize + 0.2, descriptionWidth - (cellPadding * 2)));
            SetFillColor(sb, theme.MutedTextColor);
            Text(sb, theme.FontBold, smallSize, tableLeft + cellPadding, descriptionSecondaryY, FitText(chassisText, theme.FontBold, smallSize, descriptionWidth - (cellPadding * 2)));
            Text(sb, theme.FontRegular, Clamp(smallSize - 0.1, 6, 11.8), tableLeft + cellPadding, descriptionThirdY, FitText(colorText, theme.FontRegular, Clamp(smallSize - 0.1, 6, 11.8), descriptionWidth - (cellPadding * 2)));

            SetFillColor(sb, theme.BodyTextColor);
            TextCenter(sb, theme.FontRegular, valueSize, colQty + (quantityWidth / 2), valuesY, "1");
            TextRightAutoFit(sb, theme.FontRegular, valueSize, 6.2, colTva - cellPadding, valuesY, FormatMoney(unitPriceHT), unitPriceHtWidth - (cellPadding * 2));
            TextRightAutoFit(sb, theme.FontRegular, valueSize, 6.2, colUnitPriceTtc - cellPadding, valuesY, FormatMoney(unitPriceTVA), tvaWidth - (cellPadding * 2));
            TextRightAutoFit(sb, theme.FontRegular, valueSize, 6.2, colTotal - cellPadding, valuesY, FormatMoney(unitPriceTTC), unitPriceTtcWidth - (cellPadding * 2));
            TextRightAutoFit(sb, theme.FontBold, valueSize + 0.2, 6.2, tableRight - cellPadding, valuesY, FormatMoney(totalTTC), totalWidth - (cellPadding * 2));
        }

        if (includeTotals)
        {
            var tvaY = itemsBottom - (summaryRowHeight * 0.66);
            var totalY = itemsBottom - summaryRowHeight - (summaryRowHeight * 0.66);
            var tvaLabel = string.Equals(theme.TotalsTaxLabel, "TVA", StringComparison.OrdinalIgnoreCase)
                ? "Prix TVA"
                : theme.TotalsTaxLabel;
            var totalLabel = string.Equals(theme.TotalsTotalLabel, "Net a payer", StringComparison.OrdinalIgnoreCase)
                ? "Prix TTC / Net a payer"
                : theme.TotalsTotalLabel;

            SetFillColor(sb, theme.BodyTextColor);
            TextRight(sb, theme.FontBold, headingSize, colTotal - cellPadding, tvaY, Truncate(tvaLabel, 24));
            TextRight(sb, theme.FontBold, headingSize, colTotal - cellPadding, totalY, Truncate(totalLabel, 24));

            TextRightAutoFit(sb, theme.FontRegular, bodySize + 0.4, 6.4, tableRight - cellPadding, tvaY, FormatMoney(calculations.TVAAmount), totalWidth - (cellPadding * 2));
            SetFillColor(sb, theme.BodyTextColor);
            TextRightAutoFit(sb, theme.FontBold, bodySize + 1, 6.4, tableRight - cellPadding, totalY, FormatMoney(calculations.FinalTotal), totalWidth - (cellPadding * 2));

            if (motorcycles.Count > rowSlots)
            {
                SetFillColor(sb, theme.MutedTextColor);
                Text(sb, theme.FontItalic, smallSize, tableLeft + cellPadding, tvaY, $"+ {motorcycles.Count - rowSlots} ligne(s) supplementaire(s)");
            }
        }

        return tableBottom;
    }

    private static void DrawTotalsBlock(StringBuilder sb, InvoiceCalculations calculations, PdfTheme theme, PdfLayout layout)
    {
        var headingSize = Clamp(theme.HeadingFontSize, 8, 18);
        var bodySize = Clamp(theme.BodyFontSize, 7, 16);
        var totalsWidth = Clamp(layout.TotalsWidth, 130, 250);
        var cardWidth = totalsWidth + 10;
        var cardX = Clamp(layout.TotalsX - 8, MARGIN, PAGE_WIDTH - MARGIN - cardWidth);
        var rightX = cardX + cardWidth - 8;
        var labelRightX = rightX - ((cardWidth - 14) * 0.50);
        var hasAdjustment = calculations.AdjustmentAmount != 0m;
        var rowSpacing = Math.Max(16, bodySize + 6);
        var subtotalY = layout.TotalsY;
        var taxY = subtotalY - rowSpacing;
        var adjustmentY = hasAdjustment ? taxY - rowSpacing : taxY;
        var totalY = hasAdjustment ? adjustmentY - (rowSpacing + 2) : taxY - (rowSpacing + 2);
        var cardTop = subtotalY + 12;
        var cardBottom = totalY - Math.Max(16, bodySize + 7);

        SetFillColor(sb, theme.TableAlternateRowColor);
        FillRect(sb, cardX, cardBottom, cardWidth, cardTop - cardBottom);
        SetFillColor(sb, theme.AccentColor);
        FillRect(sb, cardX, cardTop - 2, cardWidth, 2);

        SetFillColor(sb, theme.BodyTextColor);
        TextRight(sb, theme.FontBold, headingSize, labelRightX, subtotalY, Truncate(theme.TotalsSubtotalLabel, 20));
        TextRight(sb, theme.FontBold, headingSize, labelRightX, taxY, Truncate(theme.TotalsTaxLabel, 20));
        TextRight(sb, theme.FontBold, headingSize + 1, labelRightX, totalY, Truncate(theme.TotalsTotalLabel, 20));

        if (hasAdjustment)
        {
            var adjustmentLabel = calculations.AdjustmentAmount > 0m
                ? "Frais additionnels"
                : "Remise commerciale";
            SetFillColor(sb, theme.MutedTextColor);
            TextRight(sb, theme.FontRegular, Clamp(theme.SmallFontSize + 1, 6, 14), labelRightX, adjustmentY, Truncate(adjustmentLabel, 22));
            TextRight(sb, theme.FontRegular, Clamp(theme.SmallFontSize + 1, 6, 14), rightX, adjustmentY, FormatMoney(calculations.AdjustmentAmount));
        }

        SetFillColor(sb, theme.BodyTextColor);
        TextRight(sb, theme.FontBold, bodySize + 0.8, rightX, subtotalY, FormatMoney(calculations.SubtotalHT));
        TextRight(sb, theme.FontBold, bodySize + 0.8, rightX, taxY, FormatMoney(calculations.TVAAmount));
        SetFillColor(sb, theme.AccentColor);
        TextRight(sb, theme.FontBold, bodySize + 1.6, rightX, totalY, FormatMoney(calculations.FinalTotal));
    }

    private static void DrawFooter(StringBuilder sb, PdfTheme theme, PdfLayout layout)
    {
        var lineY = layout.FooterY;
        var footerWidth = Math.Min(layout.FooterWidth, PAGE_WIDTH - (MARGIN * 2));
        var footerLeft = MARGIN + ((PAGE_WIDTH - (MARGIN * 2) - footerWidth) / 2d);
        var columnWidth = footerWidth / 3d;
        var col1X = footerLeft;
        var col2X = footerLeft + columnWidth;
        var col3X = footerLeft + (columnWidth * 2);

        DrawFooterColumn(sb, col1X, lineY, columnWidth, theme, theme.FooterColumn1Title, theme.FooterColumn1Line1, theme.FooterColumn1Line2, theme.FooterColumn1Line3);
        DrawFooterColumn(sb, col2X, lineY, columnWidth, theme, theme.FooterColumn2Title, theme.FooterColumn2Line1, theme.FooterColumn2Line2, theme.FooterColumn2Line3);
        DrawFooterColumn(sb, col3X, lineY, columnWidth, theme, theme.FooterColumn3Title, theme.FooterColumn3Line1, theme.FooterColumn3Line2, theme.FooterColumn3Line3);
    }

    private static void DrawFooterColumn(
        StringBuilder sb,
        double x,
        double lineY,
        double columnWidth,
        PdfTheme theme,
        string title,
        string line1,
        string line2,
        string line3)
    {
        var titleY = lineY - 20;
        var line1Y = lineY - 34;
        var line2Y = lineY - 45;
        var line3Y = lineY - 56;
        var titleSize = Clamp(theme.HeadingFontSize - 1.5, 7, 16);
        var bodySize = Clamp(theme.SmallFontSize, 6, 12);
        var maxChars = Math.Max(16, (int)Math.Floor((columnWidth - 10) / 4.2));

        SetFillColor(sb, theme.BodyTextColor);
        Text(sb, theme.FontBold, titleSize, x, titleY, Truncate(title, maxChars));

        SetFillColor(sb, theme.MutedTextColor);
        Text(sb, theme.FontRegular, bodySize, x, line1Y, Truncate(line1, maxChars + 6));
        Text(sb, theme.FontRegular, bodySize, x, line2Y, Truncate(line2, maxChars + 6));
        Text(sb, theme.FontRegular, bodySize, x, line3Y, Truncate(line3, maxChars + 6));
    }

    private static void DrawCustomElements(
        StringBuilder sb,
        IReadOnlyCollection<InvoicePdfCustomElement>? customElements,
        PdfTheme theme)
    {
        if (customElements is null || customElements.Count == 0)
        {
            return;
        }

        foreach (var element in customElements
                     .Where(candidate => candidate.Visible)
                     .OrderBy(candidate => candidate.ZIndex)
                     .ThenBy(candidate => candidate.Id))
        {
            var width = Clamp(element.Width, 60, PAGE_WIDTH - 20);
            var height = Clamp(element.Height, 20, 300);
            var x = Clamp(element.X, 10, PAGE_WIDTH - width - 10);
            var yMin = Math.Min(PAGE_HEIGHT - 10, height + 10);
            var y = Clamp(element.Y, yMin, PAGE_HEIGHT - 10);

            switch (NormalizeCustomElementType(element.Type))
            {
                case "line":
                    DrawCustomLine(sb, element, theme, x, y, width, height);
                    break;
                case "rect":
                    DrawCustomRectangle(sb, element, x, y, width, height);
                    break;
                case "circle":
                    DrawCustomCircle(sb, element, x, y, width, height);
                    break;
                case "image":
                case "signature":
                case "stamp":
                    DrawCustomMediaPlaceholder(sb, element, theme, x, y, width, height);
                    break;
                default:
                    DrawCustomText(sb, element, theme, x, y, width, height);
                    break;
            }
        }
    }

    private static void DrawCustomText(
        StringBuilder sb,
        InvoicePdfCustomElement element,
        PdfTheme theme,
        double x,
        double y,
        double width,
        double height)
    {
        var fontSize = Clamp(element.FontSize, 7, 36);
        var font = ResolveCustomElementFont(element, theme);
        var color = ParseHexColor(element.ColorHex, theme.BodyTextColor);
        var content = string.IsNullOrWhiteSpace(element.Text) ? "-" : element.Text.Trim();
        var align = NormalizeCustomElementAlign(element.Align);
        var maxCharsPerLine = Math.Max(8, (int)Math.Floor((width - 8) / Math.Max(3.2, fontSize * 0.52)));
        var lineHeight = Math.Max(9, fontSize + 2);
        var maxLines = Math.Max(1, (int)Math.Floor((height - 4) / lineHeight));
        var lines = WrapLine(content, maxCharsPerLine).Take(maxLines).ToList();
        if (lines.Count == 0)
        {
            return;
        }

        SetFillColor(sb, color);
        var lineY = y - fontSize - 2;
        foreach (var line in lines)
        {
            if (lineY < 8)
            {
                break;
            }

            switch (align)
            {
                case "center":
                    TextCenter(sb, font, fontSize, x + (width / 2), lineY, Truncate(line, maxCharsPerLine + 2));
                    break;
                case "right":
                    TextRight(sb, font, fontSize, x + width - 4, lineY, Truncate(line, maxCharsPerLine + 2));
                    break;
                default:
                    Text(sb, font, fontSize, x + 4, lineY, Truncate(line, maxCharsPerLine + 2));
                    break;
            }

            lineY -= lineHeight;
        }
    }

    private static void DrawCustomLine(
        StringBuilder sb,
        InvoicePdfCustomElement element,
        PdfTheme theme,
        double x,
        double y,
        double width,
        double height)
    {
        var strokeColor = ParseHexColor(element.StrokeColorHex, theme.DividerColor);
        var strokeWidth = Clamp(element.StrokeWidth, 0.4, 12);
        var centerY = y - (height / 2d);
        SetStrokeColor(sb, strokeColor);
        SetLineWidth(sb, strokeWidth);
        DrawLine(sb, x + 1, centerY, x + width - 1, centerY);

        if (!string.IsNullOrWhiteSpace(element.Text))
        {
            var fontSize = Clamp(element.FontSize, 7, 20);
            var captionColor = ParseHexColor(element.ColorHex, theme.MutedTextColor);
            var maxChars = Math.Max(8, (int)Math.Floor((width - 8) / Math.Max(3.2, fontSize * 0.52)));
            SetFillColor(sb, captionColor);
            Text(sb, theme.FontRegular, fontSize, x + 2, Math.Min(PAGE_HEIGHT - 10, centerY + 4), Truncate(element.Text.Trim(), maxChars));
        }
    }

    private static void DrawCustomRectangle(
        StringBuilder sb,
        InvoicePdfCustomElement element,
        double x,
        double y,
        double width,
        double height)
    {
        var fillColor = ParseHexColor(element.BackgroundColorHex, new PdfColor(1, 1, 1));
        var strokeColor = ParseHexColor(element.StrokeColorHex, new PdfColor(0.07, 0.1, 0.16));
        var strokeWidth = Clamp(element.StrokeWidth, 0.4, 12);
        var bottomY = y - height;

        SetFillColor(sb, fillColor);
        FillRect(sb, x, bottomY, width, height);
        SetStrokeColor(sb, strokeColor);
        SetLineWidth(sb, strokeWidth);
        StrokeRect(sb, x, bottomY, width, height);
    }

    private static void DrawCustomCircle(
        StringBuilder sb,
        InvoicePdfCustomElement element,
        double x,
        double y,
        double width,
        double height)
    {
        var fillColor = ParseHexColor(element.BackgroundColorHex, new PdfColor(1, 1, 1));
        var strokeColor = ParseHexColor(element.StrokeColorHex, new PdfColor(0.07, 0.1, 0.16));
        var strokeWidth = Clamp(element.StrokeWidth, 0.4, 12);
        var diameter = Math.Min(width, height);
        var offsetX = x + ((width - diameter) / 2d);
        var offsetBottomY = (y - height) + ((height - diameter) / 2d);

        SetFillColor(sb, fillColor);
        SetStrokeColor(sb, strokeColor);
        SetLineWidth(sb, strokeWidth);
        DrawEllipsePath(sb, offsetX, offsetBottomY, diameter, diameter, fill: true, stroke: true);
    }

    private static void DrawCustomMediaPlaceholder(
        StringBuilder sb,
        InvoicePdfCustomElement element,
        PdfTheme theme,
        double x,
        double y,
        double width,
        double height)
    {
        DrawCustomRectangle(sb, element, x, y, width, height);
        var bottomY = y - height;
        var label = NormalizeCustomElementType(element.Type) switch
        {
            "signature" => "Signature",
            "stamp" => "Cachet",
            _ => "Image"
        };
        var titleFontSize = Clamp(Math.Min(element.FontSize + 1, 14), 8, 14);
        SetFillColor(sb, theme.MutedTextColor);
        TextCenter(sb, theme.FontBold, titleFontSize, x + (width / 2), bottomY + (height * 0.56), label);

        if (!string.IsNullOrWhiteSpace(element.Text))
        {
            var captionFontSize = Clamp(element.FontSize, 7, 16);
            var captionColor = ParseHexColor(element.ColorHex, theme.BodyTextColor);
            var caption = Truncate(element.Text.Trim(), Math.Max(16, (int)Math.Floor((width - 8) / 3.8)));
            var align = NormalizeCustomElementAlign(element.Align);
            SetFillColor(sb, captionColor);
            switch (align)
            {
                case "center":
                    TextCenter(sb, theme.FontRegular, captionFontSize, x + (width / 2), bottomY + 8, caption);
                    break;
                case "right":
                    TextRight(sb, theme.FontRegular, captionFontSize, x + width - 4, bottomY + 8, caption);
                    break;
                default:
                    Text(sb, theme.FontRegular, captionFontSize, x + 4, bottomY + 8, caption);
                    break;
            }
        }
        else if (!string.IsNullOrWhiteSpace(ResolveMediaDataUrl(element, theme)))
        {
            SetFillColor(sb, theme.MutedTextColor);
            TextCenter(sb, theme.FontRegular, Clamp(theme.SmallFontSize + 0.5, 6, 12), x + (width / 2), bottomY + 8, "Ressource liee");
        }
    }

    private static string NormalizeCustomElementType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "text";
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "image" or "signature" or "stamp" or "line" or "rect" or "circle" ? normalized : "text";
    }

    private static string ResolveCustomElementFont(InvoicePdfCustomElement element, PdfTheme theme)
    {
        if (element.Bold)
        {
            return theme.FontBold;
        }

        if (element.Italic)
        {
            return theme.FontItalic;
        }

        return theme.FontRegular;
    }

    private static string NormalizeCustomElementAlign(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "left";
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "center" or "right" ? normalized : "left";
    }

    private static PdfTheme ResolveTheme(Invoice invoice, InvoicePdfCustomization? customization)
    {
        var sellerBusinessName = string.IsNullOrWhiteSpace(invoice.Revendeur?.BusinessName)
            ? "Mon Entreprise"
            : invoice.Revendeur.BusinessName.Trim();
        var sellerAddressLine = BuildAddressLine(invoice.Revendeur?.Address, invoice.Revendeur?.City, invoice.Revendeur?.PostalCode);
        var sellerCityPostal = BuildCityPostalLine(invoice.Revendeur?.City, invoice.Revendeur?.PostalCode);
        var sellerPhone = string.IsNullOrWhiteSpace(invoice.Revendeur?.User?.Phone)
            ? "Telephone : -"
            : $"Telephone : {invoice.Revendeur.User.Phone.Trim()}";
        var sellerEmail = string.IsNullOrWhiteSpace(invoice.Revendeur?.User?.Email)
            ? "E-mail : -"
            : $"E-mail : {invoice.Revendeur.User.Email.Trim()}";
        var legalTokens = new List<string>();
        if (!string.IsNullOrWhiteSpace(invoice.Revendeur?.TaxId))
        {
            legalTokens.Add($"Matricule fiscale : {invoice.Revendeur.TaxId.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(invoice.Revendeur?.RegistrationNumber))
        {
            legalTokens.Add($"RC : {invoice.Revendeur.RegistrationNumber.Trim()}");
        }

        var legalLine = legalTokens.Count == 0 ? "Matricule fiscale : -" : string.Join(" | ", legalTokens);

        var defaultAdditionalInfo = "Vente de motocycle.";
        var dueDays = customization?.DueInDays is > 0 ? customization.DueInDays.Value : 30;
        var fontFamily = ResolveFontFamily(customization?.FontFamily);
        var (fontRegular, fontBold, fontItalic) = ResolveFontTokens(fontFamily);

        return new PdfTheme
        {
            BrandName = Pick(customization?.BrandName, sellerBusinessName),
            BrandTagline = Pick(customization?.BrandTagline, "Vente et reparation motos"),
            DocumentTitle = Pick(customization?.DocumentTitle, "FACTURE"),
            SellerBlockTitle = Pick(customization?.SellerBlockTitle, "Vendeur"),
            ClientBlockTitle = Pick(customization?.ClientBlockTitle, "Client"),
            InvoiceDateLabel = Pick(customization?.InvoiceDateLabel, "Date"),
            InvoiceNumberLabel = Pick(customization?.InvoiceNumberLabel, "Facture N"),
            DueDateLabel = Pick(customization?.DueDateLabel, "Echeance"),
            PaymentLabel = Pick(customization?.PaymentLabel, "Paiement"),
            ReferenceLabel = Pick(customization?.ReferenceLabel, "Reference"),
            AdditionalInfoLabel = Pick(customization?.AdditionalInfoLabel, "Objet :"),
            AdditionalInfoValue = Pick(customization?.AdditionalInfoValue, Pick(customization?.ServiceTitle, defaultAdditionalInfo)),
            PaymentTermText = Pick(customization?.PaymentTermText, "Comptant"),
            ReferencePrefix = Pick(customization?.ReferencePrefix, "FAC"),
            DueInDays = dueDays,
            DefaultUnit = Pick(customization?.DefaultUnit, "U"),
            TableHeaderDescription = Pick(customization?.TableHeaderDescription, "Designations"),
            TableHeaderQuantity = Pick(customization?.TableHeaderQuantity, "Qte"),
            TableHeaderUnit = Pick(customization?.TableHeaderUnit, "PU.TTC"),
            TableHeaderUnitPrice = Pick(customization?.TableHeaderUnitPrice, "PU.HT"),
            TableHeaderTaxRate = Pick(customization?.TableHeaderTaxRate, "TVA %"),
            TableHeaderTaxAmount = Pick(customization?.TableHeaderTaxAmount, "TVA"),
            TableHeaderTotal = Pick(customization?.TableHeaderTotal, "PT.TTC"),
            TotalsSubtotalLabel = Pick(customization?.TotalsSubtotalLabel, "Total HT"),
            TotalsTaxLabel = Pick(customization?.TotalsTaxLabel, "TVA"),
            TotalsTotalLabel = Pick(customization?.TotalsTotalLabel, "Net a payer"),
            FooterColumn1Title = Pick(customization?.FooterColumn1Title, Pick(customization?.FooterTitle, sellerBusinessName)),
            FooterColumn2Title = Pick(customization?.FooterColumn2Title, "Coordonnees"),
            FooterColumn3Title = Pick(customization?.FooterColumn3Title, "Reglement"),
            FooterColumn1Line1 = Pick(customization?.FooterColumn1Line1, sellerAddressLine),
            FooterColumn1Line2 = Pick(customization?.FooterColumn1Line2, sellerCityPostal),
            FooterColumn1Line3 = Pick(customization?.FooterColumn1Line3, legalLine),
            FooterColumn2Line1 = Pick(customization?.FooterColumn2Line1, sellerPhone),
            FooterColumn2Line2 = Pick(customization?.FooterColumn2Line2, sellerEmail),
            FooterColumn2Line3 = Pick(customization?.FooterColumn2Line3, Pick(customization?.FooterLine1, "www.votre-entreprise.tn")),
            FooterColumn3Line1 = Pick(customization?.FooterColumn3Line1, Pick(customization?.FooterLine2, "Banque : -")),
            FooterColumn3Line2 = Pick(customization?.FooterColumn3Line2, "RIB/IBAN : -"),
            FooterColumn3Line3 = Pick(customization?.FooterColumn3Line3, "Swift : -"),
            FontFamily = fontFamily,
            FontRegular = fontRegular,
            FontBold = fontBold,
            FontItalic = fontItalic,
            TitleFontSize = Clamp(PickDouble(customization?.TitleFontSize, 31), 24, 64),
            HeadingFontSize = Clamp(PickDouble(customization?.HeadingFontSize, 9.4), 8, 18),
            BodyFontSize = Clamp(PickDouble(customization?.BodyFontSize, 8.8), 7, 16),
            SmallFontSize = Clamp(PickDouble(customization?.SmallFontSize, 7), 6, 14),
            LogoDataUrl = customization?.LogoDataUrl,
            SignatureDataUrl = customization?.SignatureDataUrl,
            StampDataUrl = customization?.StampDataUrl,
            AccentColor = ParseHexColor(customization?.AccentColorHex, new PdfColor(0.07, 0.07, 0.07)),
            PageBackgroundColor = ParseHexColor(customization?.PageBackgroundHex, new PdfColor(1, 1, 1)),
            BodyTextColor = ParseHexColor(customization?.BodyTextColorHex, new PdfColor(0.07, 0.07, 0.07)),
            MutedTextColor = ParseHexColor(customization?.MutedTextColorHex, new PdfColor(0.29, 0.33, 0.39)),
            DividerColor = ParseHexColor(customization?.DividerColorHex, new PdfColor(0.07, 0.07, 0.07)),
            TableHeaderBackgroundColor = ParseHexColor(customization?.TableHeaderBackgroundHex, new PdfColor(0.973, 0.973, 0.973)),
            TableHeaderTextColor = ParseHexColor(customization?.TableHeaderTextColorHex, new PdfColor(0.07, 0.07, 0.07)),
            TableBorderColor = ParseHexColor(customization?.TableBorderColorHex, new PdfColor(0.82, 0.84, 0.86)),
            TableAlternateRowColor = ParseHexColor(customization?.TableAlternateRowColorHex, new PdfColor(1, 1, 1))
        };
    }

    private static PdfLayout ResolveLayout(InvoicePdfCustomization? customization)
    {
        var logoSize = Clamp(PickDouble(customization?.LogoSize, 68), 40, 140);
        var logoX = Clamp(PickDouble(customization?.LogoX, PAGE_WIDTH - MARGIN - logoSize), 10, PAGE_WIDTH - logoSize - 10);
        var logoY = Clamp(PickDouble(customization?.LogoY, 734), 680, PAGE_HEIGHT - logoSize - 10);

        var sellerX = Clamp(PickDouble(customization?.SellerBlockX, MARGIN), 10, PAGE_WIDTH - 240);
        var sellerY = Clamp(PickDouble(customization?.SellerBlockY, 682), 560, 696);
        var sellerWidth = Clamp(PickDouble(customization?.SellerBlockWidth, 240), 150, 320);
        var clientX = Clamp(PickDouble(customization?.ClientBlockX, MARGIN), 10, PAGE_WIDTH - 240);
        var clientY = Clamp(PickDouble(customization?.ClientBlockY, 616), 500, 700);
        var clientWidth = Clamp(PickDouble(customization?.ClientBlockWidth, 240), 150, 320);

        var tableX = Clamp(PickDouble(customization?.TableX, MARGIN), 10, PAGE_WIDTH - 300);
        var tableWidth = Clamp(PickDouble(customization?.TableWidth, PAGE_WIDTH - (MARGIN * 2)), 280, PAGE_WIDTH - tableX - 10);
        var metadataX = Clamp(PickDouble(customization?.MetadataX, tableX), 10, PAGE_WIDTH - 300);
        var metadataY = Clamp(PickDouble(customization?.MetadataY, 542), 440, 640);
        var metadataWidth = Clamp(PickDouble(customization?.MetadataWidth, tableWidth), 260, PAGE_WIDTH - metadataX - 10);
        var infoX = Clamp(PickDouble(customization?.AdditionalInfoX, tableX), 10, PAGE_WIDTH - 300);
        var infoY = Clamp(PickDouble(customization?.AdditionalInfoY, 496), 390, 580);
        var infoWidth = Clamp(PickDouble(customization?.AdditionalInfoWidth, tableWidth), 260, PAGE_WIDTH - infoX - 10);
        var tableY = Clamp(PickDouble(customization?.TableY, TABLE_RECOMMENDED_TOP_Y), 290, 520);

        var totalsWidth = Clamp(PickDouble(customization?.TotalsWidth, 159), 120, 240);
        var totalsX = Clamp(PickDouble(customization?.TotalsX, PAGE_WIDTH - MARGIN - totalsWidth), tableX + 220, PAGE_WIDTH - totalsWidth - 10);
        var totalsY = Clamp(PickDouble(customization?.TotalsY, 206), 120, 250);
        var totalWordsX = Clamp(PickDouble(customization?.TotalWordsX, tableX), 10, PAGE_WIDTH - 160);
        var totalWordsWidth = Clamp(PickDouble(customization?.TotalWordsWidth, tableWidth), 160, PAGE_WIDTH - totalWordsX - 10);
        var totalWordsYDefault = Math.Max(92, totalsY - 54);
        var totalWordsY = Clamp(PickDouble(customization?.TotalWordsY, totalWordsYDefault), 78, 250);
        var footerY = Clamp(PickDouble(customization?.FooterY, 96), 78, 170);
        var footerWidth = Clamp(PickDouble(customization?.FooterWidth, PAGE_WIDTH - (MARGIN * 2)), 260, PAGE_WIDTH - (MARGIN * 2));
        var signatureBlockWidth = Clamp(PickDouble(customization?.SignatureBlockWidth, 220), 140, PAGE_WIDTH - 20);
        var signatureBlockXDefault = (PAGE_WIDTH - signatureBlockWidth) / 2d;
        var signatureBlockX = Clamp(PickDouble(customization?.SignatureBlockX, signatureBlockXDefault), 10, PAGE_WIDTH - signatureBlockWidth - 10);
        var signatureBlockYDefault = Math.Max(90, footerY + 16);
        var signatureBlockY = Clamp(PickDouble(customization?.SignatureBlockY, signatureBlockYDefault), 78, 220);

        return new PdfLayout
        {
            LogoX = logoX,
            LogoY = logoY,
            LogoSize = logoSize,
            SellerBlockX = sellerX,
            SellerBlockY = sellerY,
            SellerBlockWidth = sellerWidth,
            ClientBlockX = clientX,
            ClientBlockY = clientY,
            ClientBlockWidth = clientWidth,
            MetadataX = metadataX,
            MetadataY = metadataY,
            MetadataWidth = metadataWidth,
            AdditionalInfoX = infoX,
            AdditionalInfoY = infoY,
            AdditionalInfoWidth = infoWidth,
            TableX = tableX,
            TableY = tableY,
            TableWidth = tableWidth,
            TotalsX = totalsX,
            TotalsY = totalsY,
            TotalsWidth = totalsWidth,
            TotalWordsX = totalWordsX,
            TotalWordsY = totalWordsY,
            TotalWordsWidth = totalWordsWidth,
            SignatureBlockX = signatureBlockX,
            SignatureBlockY = signatureBlockY,
            SignatureBlockWidth = signatureBlockWidth,
            FooterY = footerY,
            FooterWidth = footerWidth
        };
    }

    private static List<string> BuildSellerLines(Invoice invoice, PdfTheme theme)
    {
        var sellerName = string.IsNullOrWhiteSpace(invoice.Revendeur?.BusinessName)
            ? theme.BrandName
            : invoice.Revendeur.BusinessName.Trim();
        var sellerAddress = BuildAddressLine(invoice.Revendeur?.Address, invoice.Revendeur?.City, invoice.Revendeur?.PostalCode);
        var sellerPhone = string.IsNullOrWhiteSpace(invoice.Revendeur?.User?.Phone)
            ? "-"
            : invoice.Revendeur.User.Phone.Trim();
        var sellerTax = string.IsNullOrWhiteSpace(invoice.Revendeur?.TaxId)
            ? "-"
            : invoice.Revendeur.TaxId.Trim();

        if (string.IsNullOrWhiteSpace(sellerAddress))
        {
            sellerAddress = "-";
        }

        return new List<string>
        {
            $"Nom : {sellerName}",
            $"Adresse : {sellerAddress}",
            $"Tel : {sellerPhone}",
            $"Matricule fiscale : {sellerTax}"
        };
    }

    private static List<string> BuildClientLines(Invoice invoice)
    {
        var clientName = string.IsNullOrWhiteSpace(invoice.Client?.FullName)
            ? "-"
            : invoice.Client.FullName.Trim();
        var lines = new List<string>
        {
            $"Nom : {clientName}"
        };

        if (!string.IsNullOrWhiteSpace(invoice.Client?.CIN))
        {
            lines.Add($"CIN : {invoice.Client.CIN.Trim().ToUpperInvariant()}");
        }

        var addressLine = BuildAddressLine(invoice.Client?.Address, invoice.Client?.City, null);
        if (!string.IsNullOrWhiteSpace(addressLine))
        {
            lines.Add($"Adresse : {addressLine}");
        }

        if (!string.IsNullOrWhiteSpace(invoice.Client?.Phone))
        {
            lines.Add($"Tel : {invoice.Client.Phone.Trim()}");
        }
        else
        {
            lines.Add("Tel : -");
        }

        if (!string.IsNullOrWhiteSpace(invoice.Client?.Email))
        {
            lines.Add(invoice.Client.Email.Trim());
        }

        return lines;
    }

    private static string ResolveMotorcycleColor(SoldMotorcycle motorcycle)
    {
        static string? ParseColorTaggedValue(string? source)
        {
            if (string.IsNullOrWhiteSpace(source))
            {
                return null;
            }

            var raw = source.Trim();
            var separators = new[] { ':', '=', '-' };
            foreach (var prefix in new[] { "couleur", "color" })
            {
                if (!raw.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var separatorIndex = raw.IndexOfAny(separators);
                if (separatorIndex < 0 || separatorIndex >= raw.Length - 1)
                {
                    continue;
                }

                var parsed = raw[(separatorIndex + 1)..].Trim();
                return string.IsNullOrWhiteSpace(parsed) ? null : parsed;
            }

            return null;
        }

        var fromEngineNumber = ParseColorTaggedValue(motorcycle.EngineNumber);
        if (!string.IsNullOrWhiteSpace(fromEngineNumber))
        {
            return fromEngineNumber;
        }

        var fromMatricule = ParseColorTaggedValue(motorcycle.Matricule);
        return string.IsNullOrWhiteSpace(fromMatricule) ? "-" : fromMatricule;
    }

    private static string FormatChassisDisplay(string chassisValue)
    {
        if (string.IsNullOrWhiteSpace(chassisValue) || chassisValue == "-")
        {
            return "*-----------*";
        }

        return $"*{chassisValue.Trim()}*";
    }

    private static string BuildAddressLine(string? address, string? city, string? postalCode)
    {
        var parts = new[] { address?.Trim(), postalCode?.Trim(), city?.Trim() }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();

        return parts.Count == 0 ? string.Empty : string.Join(", ", parts);
    }

    private static string BuildCityPostalLine(string? city, string? postalCode)
    {
        var parts = new[] { postalCode?.Trim(), city?.Trim() }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();

        return parts.Count == 0 ? string.Empty : string.Join(" ", parts);
    }

    private static string ResolveFontFamily(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "Helvetica";
        }

        var normalized = value.Trim();
        if (normalized.Equals("Times", StringComparison.OrdinalIgnoreCase))
        {
            return "Times";
        }

        if (normalized.Equals("Courier", StringComparison.OrdinalIgnoreCase))
        {
            return "Courier";
        }

        return "Helvetica";
    }

    private static (string regular, string bold, string italic) ResolveFontTokens(string fontFamily)
    {
        if (fontFamily.Equals("Times", StringComparison.OrdinalIgnoreCase))
        {
            return ("F5", "F6", "F7");
        }

        if (fontFamily.Equals("Courier", StringComparison.OrdinalIgnoreCase))
        {
            return ("F8", "F4", "F8");
        }

        return ("F1", "F2", "F3");
    }

    private static string Pick(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static double PickDouble(double? value, double fallback)
    {
        if (value.HasValue && !double.IsNaN(value.Value) && !double.IsInfinity(value.Value))
        {
            return value.Value;
        }

        return fallback;
    }

    private static double Clamp(double value, double min, double max)
    {
        if (max < min)
        {
            return min;
        }

        if (value < min)
        {
            return min;
        }

        if (value > max)
        {
            return max;
        }

        return value;
    }

    private static PdfColor ParseHexColor(string? hex, PdfColor fallback)
    {
        if (string.IsNullOrWhiteSpace(hex))
        {
            return fallback;
        }

        var normalized = hex.Trim();
        if (normalized.StartsWith('#'))
        {
            normalized = normalized[1..];
        }

        if (normalized.Length != 6)
        {
            return fallback;
        }

        if (!int.TryParse(normalized[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var rByte)
            || !int.TryParse(normalized.Substring(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var gByte)
            || !int.TryParse(normalized.Substring(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var bByte))
        {
            return fallback;
        }

        return new PdfColor(rByte / 255d, gByte / 255d, bByte / 255d);
    }

    private static XColor ToXColor(PdfColor color)
    {
        var r = (int)Math.Round(Clamp(color.R * 255d, 0, 255));
        var g = (int)Math.Round(Clamp(color.G * 255d, 0, 255));
        var b = (int)Math.Round(Clamp(color.B * 255d, 0, 255));
        return XColor.FromArgb(r, g, b);
    }

    private static IEnumerable<string> WrapLine(string value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new[] { string.Empty };
        }

        if (value.Length <= maxLength)
        {
            return new[] { value };
        }

        var lines = new List<string>();
        var remaining = value;
        while (remaining.Length > maxLength)
        {
            var splitAt = remaining.LastIndexOf(' ', maxLength);
            if (splitAt <= 0)
            {
                splitAt = maxLength;
            }

            lines.Add(remaining[..splitAt].TrimEnd());
            remaining = remaining[splitAt..].TrimStart();
        }

        if (remaining.Length > 0)
        {
            lines.Add(remaining);
        }

        return lines;
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
        {
            return value;
        }

        return maxLength <= 3
            ? value[..maxLength]
            : $"{value[..(maxLength - 3)]}...";
    }

    private static string BuildPolishedTitle(string? title)
    {
        var normalized = string.IsNullOrWhiteSpace(title)
            ? "FACTURE"
            : title.Trim().ToUpperInvariant();

        if (normalized.Length <= 10 && !normalized.Contains(' '))
        {
            return string.Join(" ", normalized.ToCharArray());
        }

        return normalized;
    }

    private static string FitText(string value, string font, double size, double maxWidth)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var sanitized = value.Trim();
        var clampedWidth = Math.Max(4, maxWidth);
        if (MeasureTextWidth(font, size, sanitized) <= clampedWidth)
        {
            return sanitized;
        }

        const string ellipsis = "...";
        if (MeasureTextWidth(font, size, ellipsis) > clampedWidth)
        {
            return string.Empty;
        }

        var low = 0;
        var high = sanitized.Length;
        while (low < high)
        {
            var mid = (low + high + 1) / 2;
            var candidate = $"{sanitized[..mid]}{ellipsis}";
            if (MeasureTextWidth(font, size, candidate) <= clampedWidth)
            {
                low = mid;
            }
            else
            {
                high = mid - 1;
            }
        }

        return low <= 0 ? ellipsis : $"{sanitized[..low]}{ellipsis}";
    }

    private static string FormatMoney(decimal value)
    {
        return $"{value.ToString("#,##0.00", CultureInfo.InvariantCulture)} TND";
    }

    private static string FormatAmountInWords(decimal value)
    {
        var normalized = RoundMoney(value);
        if (normalized < 0m)
        {
            normalized = 0m;
        }

        var dinars = (long)decimal.Floor(normalized);
        var millimesRaw = (normalized - dinars) * 1000m;
        var millimes = (int)Math.Round(millimesRaw, MidpointRounding.AwayFromZero);
        if (millimes >= 1000)
        {
            dinars += 1;
            millimes -= 1000;
        }

        var dinarWords = NumberToFrenchWords(dinars);
        var millimeWords = NumberToFrenchWords(millimes);
        var dinarLabel = dinars > 1 ? "dinars" : "dinar";
        var millimeLabel = millimes > 1 ? "millimes" : "millime";
        return $"{dinarWords} {dinarLabel} et {millimeWords} {millimeLabel}";
    }

    private static string NumberToFrenchWords(long value)
    {
        if (value < 0)
        {
            return $"moins {NumberToFrenchWords(-value)}";
        }

        if (value <= 16)
        {
            return FrenchUnits[(int)value];
        }

        if (value < 100)
        {
            return FormatTwoDigitFrench((int)value);
        }

        if (value < 1000)
        {
            var hundreds = (int)(value / 100);
            var remainder = (int)(value % 100);
            var prefix = hundreds == 1 ? "cent" : $"{FrenchUnits[hundreds]} cent";
            if (remainder == 0 && hundreds > 1)
            {
                prefix += "s";
            }

            return remainder == 0 ? prefix : $"{prefix} {NumberToFrenchWords(remainder)}";
        }

        if (value < 1_000_000)
        {
            var thousands = value / 1000;
            var remainder = value % 1000;
            var prefix = thousands == 1 ? "mille" : $"{NumberToFrenchWords(thousands)} mille";
            return remainder == 0 ? prefix : $"{prefix} {NumberToFrenchWords(remainder)}";
        }

        if (value < 1_000_000_000)
        {
            var millions = value / 1_000_000;
            var remainder = value % 1_000_000;
            var prefix = millions == 1 ? "un million" : $"{NumberToFrenchWords(millions)} millions";
            return remainder == 0 ? prefix : $"{prefix} {NumberToFrenchWords(remainder)}";
        }

        var billions = value / 1_000_000_000;
        var leftover = value % 1_000_000_000;
        var billionPrefix = billions == 1 ? "un milliard" : $"{NumberToFrenchWords(billions)} milliards";
        return leftover == 0 ? billionPrefix : $"{billionPrefix} {NumberToFrenchWords(leftover)}";
    }

    private static string FormatTwoDigitFrench(int value)
    {
        if (value <= 16)
        {
            return FrenchUnits[value];
        }

        if (value < 20)
        {
            return $"dix-{FrenchUnits[value - 10]}";
        }

        if (value < 70)
        {
            var tens = value / 10;
            var unit = value % 10;
            var tensWord = tens switch
            {
                2 => "vingt",
                3 => "trente",
                4 => "quarante",
                5 => "cinquante",
                _ => "soixante"
            };

            if (unit == 0)
            {
                return tensWord;
            }

            if (unit == 1)
            {
                return $"{tensWord} et un";
            }

            return $"{tensWord}-{FrenchUnits[unit]}";
        }

        if (value < 80)
        {
            var remainder = value - 60;
            if (remainder == 11)
            {
                return "soixante et onze";
            }

            return $"soixante-{FormatTwoDigitFrench(remainder)}";
        }

        if (value == 80)
        {
            return "quatre-vingts";
        }

        var last = value - 80;
        return $"quatre-vingt-{FormatTwoDigitFrench(last)}";
    }

    private static decimal RoundMoney(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static void Text(StringBuilder sb, string font, double size, double x, double y, string text)
    {
        sb.AppendLine("BT");
        sb.AppendLine($"/{font} {Format(size)} Tf");
        sb.AppendLine($"{Format(x)} {Format(y)} Td");
        sb.AppendLine($"({EscapePdfText(NormalizePdfText(text))}) Tj");
        sb.AppendLine("ET");
    }

    private static void TextRight(StringBuilder sb, string font, double size, double rightX, double y, string text)
    {
        var width = MeasureTextWidth(font, size, text);
        Text(sb, font, size, rightX - width, y, text);
    }

    private static void TextRightAutoFit(
        StringBuilder sb,
        string font,
        double preferredSize,
        double minSize,
        double rightX,
        double y,
        string text,
        double maxWidth)
    {
        var safeText = NormalizePdfText(text);
        var safeMaxWidth = Math.Max(8, maxWidth);
        var size = Math.Max(minSize, preferredSize);
        while (size > minSize && MeasureTextWidth(font, size, safeText) > safeMaxWidth)
        {
            size -= 0.25;
        }

        TextRight(sb, font, Math.Max(minSize, size), rightX, y, safeText);
    }

    private static void TextCenter(StringBuilder sb, string font, double size, double centerX, double y, string text)
    {
        var width = MeasureTextWidth(font, size, text);
        Text(sb, font, size, centerX - (width / 2), y, text);
    }

    private static double MeasureTextWidth(string font, double size, string text)
    {
        if (string.IsNullOrEmpty(text))
            return 0;

        var normalized = NormalizePdfText(text);
        return MeasureTextWidthPrecise(font, size, normalized);
    }

    private static double MeasureTextWidthPrecise(string font, double size, string text)
    {
        if (string.IsNullOrEmpty(text))
            return 0;

        // PDF standard font widths (relative to 1000-unit font size)
        // Using metrics for Helvetica, Times, and Courier based on PDF specification
        double totalWidth = 0;

        foreach (var ch in text)
        {
            var charWidth = GetCharacterWidth(font, ch);
            totalWidth += charWidth;
        }

        // Convert from 1000-unit scale to points
        return (totalWidth * size) / 1000.0;
    }

    private static double GetCharacterWidth(string font, char ch)
    {
        // Using PDF Standard Font Metrics
        // Characters not listed use average width for their category
        var widths = font switch
        {
            // Helvetica (F1 - Regular)
            "F1" => GetHelveticaWidth(ch),
            // Helvetica-Bold (F2)
            "F2" => GetHelveticaBoldWidth(ch),
            // Helvetica-Oblique (F3)
            "F3" => GetHelveticaWidth(ch),
            // Courier-Bold (F4)
            "F4" => 600,
            // Times-Roman (F5)
            "F5" => GetTimesRomanWidth(ch),
            // Times-Bold (F6)
            "F6" => GetTimesBoldWidth(ch),
            // Times-Italic (F7)
            "F7" => GetTimesRomanWidth(ch),
            // Courier (F8)
            "F8" => 600,
            _ => 500 // Default fallback
        };

        return widths;
    }

    private static double GetHelveticaWidth(char ch)
    {
        return ch switch
        {
            // Digits (narrow)
            '0' => 556, '1' => 556, '2' => 556, '3' => 556, '4' => 556,
            '5' => 556, '6' => 556, '7' => 556, '8' => 556, '9' => 556,
            // Uppercase letters
            'A' => 722, 'B' => 722, 'C' => 722, 'D' => 722, 'E' => 667, 'F' => 611, 'G' => 778, 'H' => 722,
            'I' => 278, 'J' => 556, 'K' => 722, 'L' => 611, 'M' => 833, 'N' => 722, 'O' => 778, 'P' => 667,
            'Q' => 778, 'R' => 722, 'S' => 667, 'T' => 611, 'U' => 722, 'V' => 667, 'W' => 944, 'X' => 667,
            'Y' => 667, 'Z' => 611,
            // Lowercase letters
            'a' => 556, 'b' => 556, 'c' => 500, 'd' => 556, 'e' => 556, 'f' => 278, 'g' => 556, 'h' => 556,
            'i' => 222, 'j' => 222, 'k' => 500, 'l' => 222, 'm' => 833, 'n' => 556, 'o' => 556, 'p' => 556,
            'q' => 556, 'r' => 333, 's' => 500, 't' => 278, 'u' => 556, 'v' => 500, 'w' => 722, 'x' => 500,
            'y' => 500, 'z' => 500,
            // French accented characters
            'é' => 556, 'è' => 556, 'ê' => 556, 'ë' => 556, 'ç' => 500,
            'à' => 556, 'â' => 556, 'ä' => 556, 'ô' => 556, 'ö' => 556, 'ù' => 556,
            // Punctuation and symbols
            '.' => 278, ',' => 278, ':' => 278, ';' => 278, '-' => 333, ' ' => 278,
            '(' => 333, ')' => 333, '[' => 278, ']' => 278, '{' => 389, '}' => 389,
            '"' => 474, '\'' => 222, '/' => 278, '\\' => 278,
            '+' => 584, '=' => 584, '*' => 556, '$' => 556, '%' => 889,
            '&' => 722, '@' => 1015, '#' => 556, '^' => 469, '~' => 584,
            '<' => 584, '>' => 584, '!' => 278, '?' => 556, '|' => 280,
            '_' => 556,
            _ => 500 // Default average width
        };
    }

    private static double GetHelveticaBoldWidth(char ch)
    {
        // Helvetica-Bold is slightly wider
        var baseWidth = GetHelveticaWidth(ch);
        return baseWidth switch
        {
            222 => 222, // Don't adjust very small chars
            278 => 278,
            _ => Math.Min(baseWidth * 1.05, 1000) // ~5% wider, but cap at 1000
        };
    }

    private static double GetTimesRomanWidth(char ch)
    {
        return ch switch
        {
            // Digits (proportional in Times)
            '0' => 500, '1' => 250, '2' => 500, '3' => 500, '4' => 500,
            '5' => 500, '6' => 500, '7' => 500, '8' => 500, '9' => 500,
            // Uppercase
            'A' => 722, 'B' => 667, 'C' => 667, 'D' => 722, 'E' => 611, 'F' => 556, 'G' => 722, 'H' => 722,
            'I' => 333, 'J' => 389, 'K' => 722, 'L' => 611, 'M' => 889, 'N' => 722, 'O' => 722, 'P' => 556,
            'Q' => 722, 'R' => 667, 'S' => 556, 'T' => 611, 'U' => 722, 'V' => 722, 'W' => 944, 'X' => 722,
            'Y' => 722, 'Z' => 667,
            // Lowercase
            'a' => 444, 'b' => 500, 'c' => 444, 'd' => 500, 'e' => 444, 'f' => 333, 'g' => 500, 'h' => 500,
            'i' => 278, 'j' => 278, 'k' => 500, 'l' => 278, 'm' => 778, 'n' => 500, 'o' => 500, 'p' => 500,
            'q' => 500, 'r' => 333, 's' => 389, 't' => 278, 'u' => 500, 'v' => 500, 'w' => 722, 'x' => 500,
            'y' => 500, 'z' => 444,
            // French accented
            'é' => 444, 'è' => 444, 'ê' => 444, 'ë' => 444, 'ç' => 444,
            'à' => 444, 'â' => 444, 'ä' => 444, 'ô' => 500, 'ö' => 500, 'ù' => 500,
            // Punctuation
            '.' => 278, ',' => 278, ':' => 278, ';' => 278, '-' => 333, ' ' => 250,
            '(' => 389, ')' => 389, '[' => 389, ']' => 389, '{' => 444, '}' => 444,
            '"' => 500, '\'' => 333, '/' => 278, '\\' => 278,
            '+' => 570, '=' => 570, '*' => 500, '$' => 500, '%' => 833,
            '&' => 833, '@' => 944, '#' => 500, '^' => 333, '~' => 570,
            '<' => 570, '>' => 570, '!' => 333, '?' => 500, '|' => 278,
            '_' => 500,
            _ => 444 // Default average width
        };
    }

    private static double GetTimesBoldWidth(char ch)
    {
        // Times-Bold is slightly wider than regular
        var baseWidth = GetTimesRomanWidth(ch);
        return baseWidth switch
        {
            278 => 278, // Don't adjust very small
            333 => 333,
            250 => 250,
            _ => Math.Min(baseWidth * 1.03, 1000)
        };
    }

    private static void SetFillColor(StringBuilder sb, PdfColor color)
    {
        SetFillColor(sb, color.R, color.G, color.B);
    }

    private static void SetFillColor(StringBuilder sb, double r, double g, double b)
    {
        sb.AppendLine($"{Format(r)} {Format(g)} {Format(b)} rg");
    }

    private static void SetStrokeColor(StringBuilder sb, PdfColor color)
    {
        SetStrokeColor(sb, color.R, color.G, color.B);
    }

    private static void SetStrokeColor(StringBuilder sb, double r, double g, double b)
    {
        sb.AppendLine($"{Format(r)} {Format(g)} {Format(b)} RG");
    }

    private static void SetLineWidth(StringBuilder sb, double width)
    {
        sb.AppendLine($"{Format(width)} w");
    }

    private static void FillRect(StringBuilder sb, double x, double y, double width, double height)
    {
        sb.AppendLine($"{Format(x)} {Format(y)} {Format(width)} {Format(height)} re f");
    }

    private static void StrokeRect(StringBuilder sb, double x, double y, double width, double height)
    {
        sb.AppendLine($"{Format(x)} {Format(y)} {Format(width)} {Format(height)} re S");
    }

    private static void DrawLine(StringBuilder sb, double x1, double y1, double x2, double y2)
    {
        // Set line rendering properties for crisp appearance
        sb.AppendLine("1 J");  // Round line cap (0=butt, 1=round, 2=square)
        sb.AppendLine("1 j");  // Round line join (0=miter, 1=round, 2=bevel)
        sb.AppendLine($"{Format(x1)} {Format(y1)} m {Format(x2)} {Format(y2)} l S");
    }

    private static void DrawEllipsePath(
        StringBuilder sb,
        double x,
        double y,
        double width,
        double height,
        bool fill,
        bool stroke)
    {
        if (width <= 0 || height <= 0)
        {
            return;
        }

        const double controlPointFactor = 0.5522847498307936;
        var radiusX = width / 2d;
        var radiusY = height / 2d;
        var centerX = x + radiusX;
        var centerY = y + radiusY;
        var offsetX = radiusX * controlPointFactor;
        var offsetY = radiusY * controlPointFactor;

        sb.AppendLine($"{Format(centerX + radiusX)} {Format(centerY)} m");
        sb.AppendLine($"{Format(centerX + radiusX)} {Format(centerY + offsetY)} {Format(centerX + offsetX)} {Format(centerY + radiusY)} {Format(centerX)} {Format(centerY + radiusY)} c");
        sb.AppendLine($"{Format(centerX - offsetX)} {Format(centerY + radiusY)} {Format(centerX - radiusX)} {Format(centerY + offsetY)} {Format(centerX - radiusX)} {Format(centerY)} c");
        sb.AppendLine($"{Format(centerX - radiusX)} {Format(centerY - offsetY)} {Format(centerX - offsetX)} {Format(centerY - radiusY)} {Format(centerX)} {Format(centerY - radiusY)} c");
        sb.AppendLine($"{Format(centerX + offsetX)} {Format(centerY - radiusY)} {Format(centerX + radiusX)} {Format(centerY - offsetY)} {Format(centerX + radiusX)} {Format(centerY)} c");
        sb.AppendLine(fill && stroke ? "B" : fill ? "f" : "S");
    }

    private static string NormalizePdfText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "-";
        }

        // Preserve accented characters and Unicode instead of stripping them
        // Only remove control characters and truly invalid PDF characters
        var sb = new StringBuilder(value.Length);

        foreach (var ch in value)
        {
            // Remove control characters (0-31) except tab (9) and newline (10)
            if (ch < 32 && ch != 9 && ch != 10)
            {
                continue;
            }

            // Remove delete character (127)
            if (ch == 127)
            {
                continue;
            }

            // Keep everything else: accented chars, digits, letters, punctuation
            // PDF text strings in parentheses can contain Unicode characters
            sb.Append(ch);
        }

        var result = sb.ToString().Trim();
        return string.IsNullOrEmpty(result) ? "-" : result;
    }

    private static string EscapePdfText(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal);
    }

    private static string Format(double value)
    {
        return value.ToString("0.##", CultureInfo.InvariantCulture);
    }

    private static void WriteAscii(Stream stream, string text)
    {
        var bytes = Encoding.ASCII.GetBytes(text);
        stream.Write(bytes, 0, bytes.Length);
    }

    private sealed class InvoiceCalculations
    {
        public decimal SubtotalHT { get; set; }
        public decimal TVAAmount { get; set; }
        public decimal TotalTTC { get; set; }
        public decimal FinalTotal { get; set; }
        public decimal AdjustmentAmount { get; set; }
    }

    private sealed class PdfLayout
    {
        public double LogoX { get; set; } = PAGE_WIDTH - MARGIN - 68;
        public double LogoY { get; set; } = 734;
        public double LogoSize { get; set; } = 68;
        public double SellerBlockX { get; set; } = MARGIN;
        public double SellerBlockY { get; set; } = 682;
        public double SellerBlockWidth { get; set; } = 240;
        public double ClientBlockX { get; set; } = MARGIN;
        public double ClientBlockY { get; set; } = 616;
        public double ClientBlockWidth { get; set; } = 240;
        public double MetadataX { get; set; } = MARGIN;
        public double MetadataY { get; set; } = 542;
        public double MetadataWidth { get; set; } = PAGE_WIDTH - (MARGIN * 2);
        public double AdditionalInfoX { get; set; } = MARGIN;
        public double AdditionalInfoY { get; set; } = 496;
        public double AdditionalInfoWidth { get; set; } = PAGE_WIDTH - (MARGIN * 2);
        public double TableX { get; set; } = MARGIN;
        public double TableY { get; set; } = TABLE_RECOMMENDED_TOP_Y;
        public double TableWidth { get; set; } = PAGE_WIDTH - (MARGIN * 2);
        public double TotalsX { get; set; } = PAGE_WIDTH - MARGIN - 159;
        public double TotalsY { get; set; } = 206;
        public double TotalsWidth { get; set; } = 159;
        public double TotalWordsX { get; set; } = MARGIN;
        public double TotalWordsY { get; set; } = 152;
        public double TotalWordsWidth { get; set; } = PAGE_WIDTH - (MARGIN * 2);
        public double SignatureBlockX { get; set; } = (PAGE_WIDTH - 220) / 2d;
        public double SignatureBlockY { get; set; } = 112;
        public double SignatureBlockWidth { get; set; } = 220;
        public double FooterY { get; set; } = 96;
        public double FooterWidth { get; set; } = PAGE_WIDTH - (MARGIN * 2);
    }

    private sealed class PdfTheme
    {
        public string BrandName { get; set; } = "Mon Entreprise";
        public string BrandTagline { get; set; } = "Vente et reparation motos";
        public string DocumentTitle { get; set; } = "FACTURE";
        public string SellerBlockTitle { get; set; } = "Vendeur";
        public string ClientBlockTitle { get; set; } = "Client";
        public string InvoiceDateLabel { get; set; } = "Date";
        public string InvoiceNumberLabel { get; set; } = "Facture N";
        public string DueDateLabel { get; set; } = "Echeance";
        public string PaymentLabel { get; set; } = "Paiement";
        public string ReferenceLabel { get; set; } = "Reference";
        public string AdditionalInfoLabel { get; set; } = "Objet :";
        public string AdditionalInfoValue { get; set; } = "Vente de motocycle.";
        public string PaymentTermText { get; set; } = "Comptant";
        public string ReferencePrefix { get; set; } = "FAC";
        public int DueInDays { get; set; } = 30;
        public string DefaultUnit { get; set; } = "U";
        public string TableHeaderDescription { get; set; } = "Designations";
        public string TableHeaderQuantity { get; set; } = "Qte";
        public string TableHeaderUnit { get; set; } = "Unite";
        public string TableHeaderUnitPrice { get; set; } = "PU.TTC";
        public string TableHeaderTaxRate { get; set; } = "TVA %";
        public string TableHeaderTaxAmount { get; set; } = "Montant TVA";
        public string TableHeaderTotal { get; set; } = "PT.TTC";
        public string TotalsSubtotalLabel { get; set; } = "Total HT";
        public string TotalsTaxLabel { get; set; } = "TVA";
        public string TotalsTotalLabel { get; set; } = "Net a payer";
        public string FooterColumn1Title { get; set; } = "Mon Entreprise";
        public string FooterColumn2Title { get; set; } = "Coordonnees";
        public string FooterColumn3Title { get; set; } = "Reglement";
        public string FooterColumn1Line1 { get; set; } = "Adresse : -";
        public string FooterColumn1Line2 { get; set; } = "Ville : -";
        public string FooterColumn1Line3 { get; set; } = "Matricule fiscale : -";
        public string FooterColumn2Line1 { get; set; } = "Telephone : -";
        public string FooterColumn2Line2 { get; set; } = "E-mail : -";
        public string FooterColumn2Line3 { get; set; } = "www.votre-entreprise.tn";
        public string FooterColumn3Line1 { get; set; } = "Banque : -";
        public string FooterColumn3Line2 { get; set; } = "RIB/IBAN : -";
        public string FooterColumn3Line3 { get; set; } = "Swift : -";
        public string FontFamily { get; set; } = "Helvetica";
        public string FontRegular { get; set; } = "F1";
        public string FontBold { get; set; } = "F2";
        public string FontItalic { get; set; } = "F3";
        public double TitleFontSize { get; set; } = 31;
        public double HeadingFontSize { get; set; } = 9.4;
        public double BodyFontSize { get; set; } = 8.8;
        public double SmallFontSize { get; set; } = 7;
        public string? LogoDataUrl { get; set; }
        public string? SignatureDataUrl { get; set; }
        public string? StampDataUrl { get; set; }
        public PdfColor AccentColor { get; set; } = new(0.07, 0.07, 0.07);
        public PdfColor PageBackgroundColor { get; set; } = new(1, 1, 1);
        public PdfColor BodyTextColor { get; set; } = new(0.07, 0.07, 0.07);
        public PdfColor MutedTextColor { get; set; } = new(0.29, 0.33, 0.39);
        public PdfColor DividerColor { get; set; } = new(0.07, 0.07, 0.07);
        public PdfColor TableHeaderBackgroundColor { get; set; } = new(0.973, 0.973, 0.973);
        public PdfColor TableHeaderTextColor { get; set; } = new(0.07, 0.07, 0.07);
        public PdfColor TableBorderColor { get; set; } = new(0.82, 0.84, 0.86);
        public PdfColor TableAlternateRowColor { get; set; } = new(1, 1, 1);
    }

    private readonly record struct PdfColor(double R, double G, double B);
}
