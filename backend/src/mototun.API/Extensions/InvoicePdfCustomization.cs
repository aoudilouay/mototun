namespace mototun.API.Extensions;

public sealed class InvoicePdfCustomElement
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public string Text { get; set; } = string.Empty;
    public double X { get; set; } = 60;
    public double Y { get; set; } = 760;
    public double Width { get; set; } = 220;
    public double Height { get; set; } = 36;
    public double FontSize { get; set; } = 10;
    public string ColorHex { get; set; } = "#111827";
    public string BackgroundColorHex { get; set; } = "#FFFFFF";
    public string StrokeColorHex { get; set; } = "#111827";
    public double StrokeWidth { get; set; } = 1;
    public string SrcDataUrl { get; set; } = string.Empty;
    public bool Bold { get; set; }
    public bool Italic { get; set; }
    public string Align { get; set; } = "left";
    public bool Visible { get; set; } = true;
    public int ZIndex { get; set; } = 1;
}

public class InvoicePdfOptions
{
    public const string SectionName = "InvoicePdf";

    public string BrandName { get; set; } = string.Empty;
    public string BrandTagline { get; set; } = "Vente et reparation motos";
    public string DocumentTitle { get; set; } = "FACTURE";
    public string SellerBlockTitle { get; set; } = "Vendeur";
    public string ClientBlockTitle { get; set; } = "Client";
    public string InvoiceDateLabel { get; set; } = "Date";
    public string InvoiceNumberLabel { get; set; } = "Facture N";
    public string InvoiceNumberPrefix { get; set; } = string.Empty;
    public int InvoiceNumberStart { get; set; } = 100;
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
    public string FooterColumn1Title { get; set; } = string.Empty;
    public string FooterColumn2Title { get; set; } = "Coordonnees";
    public string FooterColumn3Title { get; set; } = "Reglement";
    public string FooterColumn1Line1 { get; set; } = string.Empty;
    public string FooterColumn1Line2 { get; set; } = string.Empty;
    public string FooterColumn1Line3 { get; set; } = string.Empty;
    public string FooterColumn2Line1 { get; set; } = string.Empty;
    public string FooterColumn2Line2 { get; set; } = string.Empty;
    public string FooterColumn2Line3 { get; set; } = string.Empty;
    public string FooterColumn3Line1 { get; set; } = string.Empty;
    public string FooterColumn3Line2 { get; set; } = string.Empty;
    public string FooterColumn3Line3 { get; set; } = string.Empty;
    public string FontFamily { get; set; } = "Helvetica";
    public double TitleFontSize { get; set; } = 31;
    public double HeadingFontSize { get; set; } = 9.4;
    public double BodyFontSize { get; set; } = 8.8;
    public double SmallFontSize { get; set; } = 7;
    public string LogoDataUrl { get; set; } = string.Empty;
    public string SignatureDataUrl { get; set; } = string.Empty;
    public string StampDataUrl { get; set; } = string.Empty;
    public double LogoX { get; set; } = 491;
    public double LogoY { get; set; } = 734;
    public double LogoSize { get; set; } = 68;
    public double SellerBlockX { get; set; } = 36;
    public double SellerBlockY { get; set; } = 682;
    public double SellerBlockWidth { get; set; } = 240;
    public double ClientBlockX { get; set; } = 36;
    public double ClientBlockY { get; set; } = 616;
    public double ClientBlockWidth { get; set; } = 240;
    public double MetadataX { get; set; } = 36;
    public double MetadataY { get; set; } = 542;
    public double MetadataWidth { get; set; } = 523;
    public double AdditionalInfoX { get; set; } = 36;
    public double AdditionalInfoY { get; set; } = 496;
    public double AdditionalInfoWidth { get; set; } = 523;
    public double TableX { get; set; } = 36;
    public double TableY { get; set; } = 452;
    public double TableWidth { get; set; } = 523;
    public double TotalsX { get; set; } = 400;
    public double TotalsY { get; set; } = 206;
    public double TotalsWidth { get; set; } = 159;
    public double TotalWordsX { get; set; } = 36;
    public double TotalWordsY { get; set; } = 152;
    public double TotalWordsWidth { get; set; } = 523;
    public double SignatureBlockX { get; set; } = 187.5;
    public double SignatureBlockY { get; set; } = 112;
    public double SignatureBlockWidth { get; set; } = 220;
    public double FooterY { get; set; } = 96;
    public double FooterWidth { get; set; } = 523;
    public string AccentColorHex { get; set; } = "#111111";
    public string PageBackgroundHex { get; set; } = "#FFFFFF";
    public string BodyTextColorHex { get; set; } = "#111111";
    public string MutedTextColorHex { get; set; } = "#4B5563";
    public string DividerColorHex { get; set; } = "#111111";
    public string TableHeaderBackgroundHex { get; set; } = "#F8F8F8";
    public string TableHeaderTextColorHex { get; set; } = "#111111";
    public string TableBorderColorHex { get; set; } = "#D1D5DB";
    public string TableAlternateRowColorHex { get; set; } = "#FFFFFF";
    public string ServiceTitle { get; set; } = "Vente de motocycle";
    public string FooterTitle { get; set; } = "Signature et cachet";
    public string FooterLine1 { get; set; } = string.Empty;
    public string FooterLine2 { get; set; } = string.Empty;
    public bool ShowHeader { get; set; } = true;
    public bool ShowLogo { get; set; } = false;
    public bool ShowSellerBlock { get; set; } = true;
    public bool ShowClientBlock { get; set; } = true;
    public bool ShowMetadata { get; set; } = true;
    public bool ShowAdditionalInfo { get; set; } = true;
    public bool ShowTable { get; set; } = true;
    public bool ShowTotals { get; set; } = true;
    public bool ShowFooter { get; set; } = true;
    public bool ShowTotalInWords { get; set; } = true;
    public string TotalInWordsLabel { get; set; } = "Arrete la presente facture a la somme de :";
    public List<InvoicePdfCustomElement> CustomElements { get; set; } = new();
}

public class InvoicePdfCustomization
{
    public string? BrandName { get; set; }
    public string? BrandTagline { get; set; }
    public string? DocumentTitle { get; set; }
    public string? SellerBlockTitle { get; set; }
    public string? ClientBlockTitle { get; set; }
    public string? InvoiceDateLabel { get; set; }
    public string? InvoiceNumberLabel { get; set; }
    public string? InvoiceNumberPrefix { get; set; }
    public int? InvoiceNumberStart { get; set; }
    public string? DueDateLabel { get; set; }
    public string? PaymentLabel { get; set; }
    public string? ReferenceLabel { get; set; }
    public string? AdditionalInfoLabel { get; set; }
    public string? AdditionalInfoValue { get; set; }
    public string? PaymentTermText { get; set; }
    public string? ReferencePrefix { get; set; }
    public int? DueInDays { get; set; }
    public string? DefaultUnit { get; set; }
    public string? TableHeaderDescription { get; set; }
    public string? TableHeaderQuantity { get; set; }
    public string? TableHeaderUnit { get; set; }
    public string? TableHeaderUnitPrice { get; set; }
    public string? TableHeaderTaxRate { get; set; }
    public string? TableHeaderTaxAmount { get; set; }
    public string? TableHeaderTotal { get; set; }
    public string? TotalsSubtotalLabel { get; set; }
    public string? TotalsTaxLabel { get; set; }
    public string? TotalsTotalLabel { get; set; }
    public string? FooterColumn1Title { get; set; }
    public string? FooterColumn2Title { get; set; }
    public string? FooterColumn3Title { get; set; }
    public string? FooterColumn1Line1 { get; set; }
    public string? FooterColumn1Line2 { get; set; }
    public string? FooterColumn1Line3 { get; set; }
    public string? FooterColumn2Line1 { get; set; }
    public string? FooterColumn2Line2 { get; set; }
    public string? FooterColumn2Line3 { get; set; }
    public string? FooterColumn3Line1 { get; set; }
    public string? FooterColumn3Line2 { get; set; }
    public string? FooterColumn3Line3 { get; set; }
    public string? FontFamily { get; set; }
    public double? TitleFontSize { get; set; }
    public double? HeadingFontSize { get; set; }
    public double? BodyFontSize { get; set; }
    public double? SmallFontSize { get; set; }
    public string? LogoDataUrl { get; set; }
    public string? SignatureDataUrl { get; set; }
    public string? StampDataUrl { get; set; }
    public double? LogoX { get; set; }
    public double? LogoY { get; set; }
    public double? LogoSize { get; set; }
    public double? SellerBlockX { get; set; }
    public double? SellerBlockY { get; set; }
    public double? SellerBlockWidth { get; set; }
    public double? ClientBlockX { get; set; }
    public double? ClientBlockY { get; set; }
    public double? ClientBlockWidth { get; set; }
    public double? MetadataX { get; set; }
    public double? MetadataY { get; set; }
    public double? MetadataWidth { get; set; }
    public double? AdditionalInfoX { get; set; }
    public double? AdditionalInfoY { get; set; }
    public double? AdditionalInfoWidth { get; set; }
    public double? TableX { get; set; }
    public double? TableY { get; set; }
    public double? TableWidth { get; set; }
    public double? TotalsX { get; set; }
    public double? TotalsY { get; set; }
    public double? TotalsWidth { get; set; }
    public double? TotalWordsX { get; set; }
    public double? TotalWordsY { get; set; }
    public double? TotalWordsWidth { get; set; }
    public double? SignatureBlockX { get; set; }
    public double? SignatureBlockY { get; set; }
    public double? SignatureBlockWidth { get; set; }
    public double? FooterY { get; set; }
    public double? FooterWidth { get; set; }
    public string? AccentColorHex { get; set; }
    public string? PageBackgroundHex { get; set; }
    public string? BodyTextColorHex { get; set; }
    public string? MutedTextColorHex { get; set; }
    public string? DividerColorHex { get; set; }
    public string? TableHeaderBackgroundHex { get; set; }
    public string? TableHeaderTextColorHex { get; set; }
    public string? TableBorderColorHex { get; set; }
    public string? TableAlternateRowColorHex { get; set; }
    public string? ServiceTitle { get; set; }
    public string? FooterTitle { get; set; }
    public string? FooterLine1 { get; set; }
    public string? FooterLine2 { get; set; }
    public bool? ShowHeader { get; set; }
    public bool? ShowLogo { get; set; }
    public bool? ShowSellerBlock { get; set; }
    public bool? ShowClientBlock { get; set; }
    public bool? ShowMetadata { get; set; }
    public bool? ShowAdditionalInfo { get; set; }
    public bool? ShowTable { get; set; }
    public bool? ShowTotals { get; set; }
    public bool? ShowFooter { get; set; }
    public bool? ShowTotalInWords { get; set; }
    public string? TotalInWordsLabel { get; set; }
    public List<InvoicePdfCustomElement>? CustomElements { get; set; }

    public static InvoicePdfCustomization FromOptions(InvoicePdfOptions? options)
    {
        return new InvoicePdfCustomization
        {
            BrandName = options?.BrandName,
            BrandTagline = options?.BrandTagline,
            DocumentTitle = options?.DocumentTitle,
            SellerBlockTitle = options?.SellerBlockTitle,
            ClientBlockTitle = options?.ClientBlockTitle,
            InvoiceDateLabel = options?.InvoiceDateLabel,
            InvoiceNumberLabel = options?.InvoiceNumberLabel,
            InvoiceNumberPrefix = options?.InvoiceNumberPrefix,
            InvoiceNumberStart = options?.InvoiceNumberStart,
            DueDateLabel = options?.DueDateLabel,
            PaymentLabel = options?.PaymentLabel,
            ReferenceLabel = options?.ReferenceLabel,
            AdditionalInfoLabel = options?.AdditionalInfoLabel,
            AdditionalInfoValue = options?.AdditionalInfoValue,
            PaymentTermText = options?.PaymentTermText,
            ReferencePrefix = options?.ReferencePrefix,
            DueInDays = options?.DueInDays,
            DefaultUnit = options?.DefaultUnit,
            TableHeaderDescription = options?.TableHeaderDescription,
            TableHeaderQuantity = options?.TableHeaderQuantity,
            TableHeaderUnit = options?.TableHeaderUnit,
            TableHeaderUnitPrice = options?.TableHeaderUnitPrice,
            TableHeaderTaxRate = options?.TableHeaderTaxRate,
            TableHeaderTaxAmount = options?.TableHeaderTaxAmount,
            TableHeaderTotal = options?.TableHeaderTotal,
            TotalsSubtotalLabel = options?.TotalsSubtotalLabel,
            TotalsTaxLabel = options?.TotalsTaxLabel,
            TotalsTotalLabel = options?.TotalsTotalLabel,
            FooterColumn1Title = options?.FooterColumn1Title,
            FooterColumn2Title = options?.FooterColumn2Title,
            FooterColumn3Title = options?.FooterColumn3Title,
            FooterColumn1Line1 = options?.FooterColumn1Line1,
            FooterColumn1Line2 = options?.FooterColumn1Line2,
            FooterColumn1Line3 = options?.FooterColumn1Line3,
            FooterColumn2Line1 = options?.FooterColumn2Line1,
            FooterColumn2Line2 = options?.FooterColumn2Line2,
            FooterColumn2Line3 = options?.FooterColumn2Line3,
            FooterColumn3Line1 = options?.FooterColumn3Line1,
            FooterColumn3Line2 = options?.FooterColumn3Line2,
            FooterColumn3Line3 = options?.FooterColumn3Line3,
            FontFamily = options?.FontFamily,
            TitleFontSize = options?.TitleFontSize,
            HeadingFontSize = options?.HeadingFontSize,
            BodyFontSize = options?.BodyFontSize,
            SmallFontSize = options?.SmallFontSize,
            LogoDataUrl = options?.LogoDataUrl,
            SignatureDataUrl = options?.SignatureDataUrl,
            StampDataUrl = options?.StampDataUrl,
            LogoX = options?.LogoX,
            LogoY = options?.LogoY,
            LogoSize = options?.LogoSize,
            SellerBlockX = options?.SellerBlockX,
            SellerBlockY = options?.SellerBlockY,
            SellerBlockWidth = options?.SellerBlockWidth,
            ClientBlockX = options?.ClientBlockX,
            ClientBlockY = options?.ClientBlockY,
            ClientBlockWidth = options?.ClientBlockWidth,
            MetadataX = options?.MetadataX,
            MetadataY = options?.MetadataY,
            MetadataWidth = options?.MetadataWidth,
            AdditionalInfoX = options?.AdditionalInfoX,
            AdditionalInfoY = options?.AdditionalInfoY,
            AdditionalInfoWidth = options?.AdditionalInfoWidth,
            TableX = options?.TableX,
            TableY = options?.TableY,
            TableWidth = options?.TableWidth,
            TotalsX = options?.TotalsX,
            TotalsY = options?.TotalsY,
            TotalsWidth = options?.TotalsWidth,
            TotalWordsX = options?.TotalWordsX,
            TotalWordsY = options?.TotalWordsY,
            TotalWordsWidth = options?.TotalWordsWidth,
            SignatureBlockX = options?.SignatureBlockX,
            SignatureBlockY = options?.SignatureBlockY,
            SignatureBlockWidth = options?.SignatureBlockWidth,
            FooterY = options?.FooterY,
            FooterWidth = options?.FooterWidth,
            AccentColorHex = options?.AccentColorHex,
            PageBackgroundHex = options?.PageBackgroundHex,
            BodyTextColorHex = options?.BodyTextColorHex,
            MutedTextColorHex = options?.MutedTextColorHex,
            DividerColorHex = options?.DividerColorHex,
            TableHeaderBackgroundHex = options?.TableHeaderBackgroundHex,
            TableHeaderTextColorHex = options?.TableHeaderTextColorHex,
            TableBorderColorHex = options?.TableBorderColorHex,
            TableAlternateRowColorHex = options?.TableAlternateRowColorHex,
            ServiceTitle = options?.ServiceTitle,
            FooterTitle = options?.FooterTitle,
            FooterLine1 = options?.FooterLine1,
            FooterLine2 = options?.FooterLine2,
            ShowHeader = options?.ShowHeader,
            ShowLogo = options?.ShowLogo,
            ShowSellerBlock = options?.ShowSellerBlock,
            ShowClientBlock = options?.ShowClientBlock,
            ShowMetadata = options?.ShowMetadata,
            ShowAdditionalInfo = options?.ShowAdditionalInfo,
            ShowTable = options?.ShowTable,
            ShowTotals = options?.ShowTotals,
            ShowFooter = options?.ShowFooter,
            ShowTotalInWords = options?.ShowTotalInWords,
            TotalInWordsLabel = options?.TotalInWordsLabel,
            CustomElements = CloneCustomElements(options?.CustomElements)
        };
    }

    public InvoicePdfCustomization Merge(InvoicePdfCustomization? overrides)
    {
        if (overrides is null)
        {
            return new InvoicePdfCustomization
            {
                BrandName = BrandName,
                BrandTagline = BrandTagline,
                DocumentTitle = DocumentTitle,
                SellerBlockTitle = SellerBlockTitle,
                ClientBlockTitle = ClientBlockTitle,
                InvoiceDateLabel = InvoiceDateLabel,
                InvoiceNumberLabel = InvoiceNumberLabel,
                InvoiceNumberPrefix = InvoiceNumberPrefix,
                InvoiceNumberStart = InvoiceNumberStart,
                DueDateLabel = DueDateLabel,
                PaymentLabel = PaymentLabel,
                ReferenceLabel = ReferenceLabel,
                AdditionalInfoLabel = AdditionalInfoLabel,
                AdditionalInfoValue = AdditionalInfoValue,
                PaymentTermText = PaymentTermText,
                ReferencePrefix = ReferencePrefix,
                DueInDays = DueInDays,
                DefaultUnit = DefaultUnit,
                TableHeaderDescription = TableHeaderDescription,
                TableHeaderQuantity = TableHeaderQuantity,
                TableHeaderUnit = TableHeaderUnit,
                TableHeaderUnitPrice = TableHeaderUnitPrice,
                TableHeaderTaxRate = TableHeaderTaxRate,
                TableHeaderTaxAmount = TableHeaderTaxAmount,
                TableHeaderTotal = TableHeaderTotal,
                TotalsSubtotalLabel = TotalsSubtotalLabel,
                TotalsTaxLabel = TotalsTaxLabel,
                TotalsTotalLabel = TotalsTotalLabel,
                FooterColumn1Title = FooterColumn1Title,
                FooterColumn2Title = FooterColumn2Title,
                FooterColumn3Title = FooterColumn3Title,
                FooterColumn1Line1 = FooterColumn1Line1,
                FooterColumn1Line2 = FooterColumn1Line2,
                FooterColumn1Line3 = FooterColumn1Line3,
                FooterColumn2Line1 = FooterColumn2Line1,
                FooterColumn2Line2 = FooterColumn2Line2,
                FooterColumn2Line3 = FooterColumn2Line3,
                FooterColumn3Line1 = FooterColumn3Line1,
                FooterColumn3Line2 = FooterColumn3Line2,
                FooterColumn3Line3 = FooterColumn3Line3,
                FontFamily = FontFamily,
                TitleFontSize = TitleFontSize,
                HeadingFontSize = HeadingFontSize,
                BodyFontSize = BodyFontSize,
                SmallFontSize = SmallFontSize,
                LogoDataUrl = LogoDataUrl,
                SignatureDataUrl = SignatureDataUrl,
                StampDataUrl = StampDataUrl,
                LogoX = LogoX,
                LogoY = LogoY,
                LogoSize = LogoSize,
                SellerBlockX = SellerBlockX,
                SellerBlockY = SellerBlockY,
                SellerBlockWidth = SellerBlockWidth,
                ClientBlockX = ClientBlockX,
                ClientBlockY = ClientBlockY,
                ClientBlockWidth = ClientBlockWidth,
                MetadataX = MetadataX,
                MetadataY = MetadataY,
                MetadataWidth = MetadataWidth,
                AdditionalInfoX = AdditionalInfoX,
                AdditionalInfoY = AdditionalInfoY,
                AdditionalInfoWidth = AdditionalInfoWidth,
                TableX = TableX,
                TableY = TableY,
                TableWidth = TableWidth,
                TotalsX = TotalsX,
                TotalsY = TotalsY,
                TotalsWidth = TotalsWidth,
                TotalWordsX = TotalWordsX,
                TotalWordsY = TotalWordsY,
                TotalWordsWidth = TotalWordsWidth,
                SignatureBlockX = SignatureBlockX,
                SignatureBlockY = SignatureBlockY,
                SignatureBlockWidth = SignatureBlockWidth,
                FooterY = FooterY,
                FooterWidth = FooterWidth,
                AccentColorHex = AccentColorHex,
                PageBackgroundHex = PageBackgroundHex,
                BodyTextColorHex = BodyTextColorHex,
                MutedTextColorHex = MutedTextColorHex,
                DividerColorHex = DividerColorHex,
                TableHeaderBackgroundHex = TableHeaderBackgroundHex,
                TableHeaderTextColorHex = TableHeaderTextColorHex,
                TableBorderColorHex = TableBorderColorHex,
                TableAlternateRowColorHex = TableAlternateRowColorHex,
                ServiceTitle = ServiceTitle,
                FooterTitle = FooterTitle,
                FooterLine1 = FooterLine1,
                FooterLine2 = FooterLine2,
                ShowHeader = ShowHeader,
                ShowLogo = ShowLogo,
                ShowSellerBlock = ShowSellerBlock,
                ShowClientBlock = ShowClientBlock,
                ShowMetadata = ShowMetadata,
                ShowAdditionalInfo = ShowAdditionalInfo,
                ShowTable = ShowTable,
                ShowTotals = ShowTotals,
                ShowFooter = ShowFooter,
                ShowTotalInWords = ShowTotalInWords,
                TotalInWordsLabel = TotalInWordsLabel,
                CustomElements = CloneCustomElements(CustomElements)
            };
        }

        return new InvoicePdfCustomization
        {
            BrandName = Pick(overrides.BrandName, BrandName),
            BrandTagline = Pick(overrides.BrandTagline, BrandTagline),
            DocumentTitle = Pick(overrides.DocumentTitle, DocumentTitle),
            SellerBlockTitle = Pick(overrides.SellerBlockTitle, SellerBlockTitle),
            ClientBlockTitle = Pick(overrides.ClientBlockTitle, ClientBlockTitle),
            InvoiceDateLabel = Pick(overrides.InvoiceDateLabel, InvoiceDateLabel),
            InvoiceNumberLabel = Pick(overrides.InvoiceNumberLabel, InvoiceNumberLabel),
            InvoiceNumberPrefix = Pick(overrides.InvoiceNumberPrefix, InvoiceNumberPrefix),
            InvoiceNumberStart = PickInt(overrides.InvoiceNumberStart, InvoiceNumberStart),
            DueDateLabel = Pick(overrides.DueDateLabel, DueDateLabel),
            PaymentLabel = Pick(overrides.PaymentLabel, PaymentLabel),
            ReferenceLabel = Pick(overrides.ReferenceLabel, ReferenceLabel),
            AdditionalInfoLabel = Pick(overrides.AdditionalInfoLabel, AdditionalInfoLabel),
            AdditionalInfoValue = Pick(overrides.AdditionalInfoValue, AdditionalInfoValue),
            PaymentTermText = Pick(overrides.PaymentTermText, PaymentTermText),
            ReferencePrefix = Pick(overrides.ReferencePrefix, ReferencePrefix),
            DueInDays = PickInt(overrides.DueInDays, DueInDays),
            DefaultUnit = Pick(overrides.DefaultUnit, DefaultUnit),
            TableHeaderDescription = Pick(overrides.TableHeaderDescription, TableHeaderDescription),
            TableHeaderQuantity = Pick(overrides.TableHeaderQuantity, TableHeaderQuantity),
            TableHeaderUnit = Pick(overrides.TableHeaderUnit, TableHeaderUnit),
            TableHeaderUnitPrice = Pick(overrides.TableHeaderUnitPrice, TableHeaderUnitPrice),
            TableHeaderTaxRate = Pick(overrides.TableHeaderTaxRate, TableHeaderTaxRate),
            TableHeaderTaxAmount = Pick(overrides.TableHeaderTaxAmount, TableHeaderTaxAmount),
            TableHeaderTotal = Pick(overrides.TableHeaderTotal, TableHeaderTotal),
            TotalsSubtotalLabel = Pick(overrides.TotalsSubtotalLabel, TotalsSubtotalLabel),
            TotalsTaxLabel = Pick(overrides.TotalsTaxLabel, TotalsTaxLabel),
            TotalsTotalLabel = Pick(overrides.TotalsTotalLabel, TotalsTotalLabel),
            FooterColumn1Title = Pick(overrides.FooterColumn1Title, FooterColumn1Title),
            FooterColumn2Title = Pick(overrides.FooterColumn2Title, FooterColumn2Title),
            FooterColumn3Title = Pick(overrides.FooterColumn3Title, FooterColumn3Title),
            FooterColumn1Line1 = Pick(overrides.FooterColumn1Line1, FooterColumn1Line1),
            FooterColumn1Line2 = Pick(overrides.FooterColumn1Line2, FooterColumn1Line2),
            FooterColumn1Line3 = Pick(overrides.FooterColumn1Line3, FooterColumn1Line3),
            FooterColumn2Line1 = Pick(overrides.FooterColumn2Line1, FooterColumn2Line1),
            FooterColumn2Line2 = Pick(overrides.FooterColumn2Line2, FooterColumn2Line2),
            FooterColumn2Line3 = Pick(overrides.FooterColumn2Line3, FooterColumn2Line3),
            FooterColumn3Line1 = Pick(overrides.FooterColumn3Line1, FooterColumn3Line1),
            FooterColumn3Line2 = Pick(overrides.FooterColumn3Line2, FooterColumn3Line2),
            FooterColumn3Line3 = Pick(overrides.FooterColumn3Line3, FooterColumn3Line3),
            FontFamily = Pick(overrides.FontFamily, FontFamily),
            TitleFontSize = PickDouble(overrides.TitleFontSize, TitleFontSize),
            HeadingFontSize = PickDouble(overrides.HeadingFontSize, HeadingFontSize),
            BodyFontSize = PickDouble(overrides.BodyFontSize, BodyFontSize),
            SmallFontSize = PickDouble(overrides.SmallFontSize, SmallFontSize),
            LogoDataUrl = Pick(overrides.LogoDataUrl, LogoDataUrl),
            SignatureDataUrl = Pick(overrides.SignatureDataUrl, SignatureDataUrl),
            StampDataUrl = Pick(overrides.StampDataUrl, StampDataUrl),
            LogoX = PickDouble(overrides.LogoX, LogoX),
            LogoY = PickDouble(overrides.LogoY, LogoY),
            LogoSize = PickDouble(overrides.LogoSize, LogoSize),
            SellerBlockX = PickDouble(overrides.SellerBlockX, SellerBlockX),
            SellerBlockY = PickDouble(overrides.SellerBlockY, SellerBlockY),
            SellerBlockWidth = PickDouble(overrides.SellerBlockWidth, SellerBlockWidth),
            ClientBlockX = PickDouble(overrides.ClientBlockX, ClientBlockX),
            ClientBlockY = PickDouble(overrides.ClientBlockY, ClientBlockY),
            ClientBlockWidth = PickDouble(overrides.ClientBlockWidth, ClientBlockWidth),
            MetadataX = PickDouble(overrides.MetadataX, MetadataX),
            MetadataY = PickDouble(overrides.MetadataY, MetadataY),
            MetadataWidth = PickDouble(overrides.MetadataWidth, MetadataWidth),
            AdditionalInfoX = PickDouble(overrides.AdditionalInfoX, AdditionalInfoX),
            AdditionalInfoY = PickDouble(overrides.AdditionalInfoY, AdditionalInfoY),
            AdditionalInfoWidth = PickDouble(overrides.AdditionalInfoWidth, AdditionalInfoWidth),
            TableX = PickDouble(overrides.TableX, TableX),
            TableY = PickDouble(overrides.TableY, TableY),
            TableWidth = PickDouble(overrides.TableWidth, TableWidth),
            TotalsX = PickDouble(overrides.TotalsX, TotalsX),
            TotalsY = PickDouble(overrides.TotalsY, TotalsY),
            TotalsWidth = PickDouble(overrides.TotalsWidth, TotalsWidth),
            TotalWordsX = PickDouble(overrides.TotalWordsX, TotalWordsX),
            TotalWordsY = PickDouble(overrides.TotalWordsY, TotalWordsY),
            TotalWordsWidth = PickDouble(overrides.TotalWordsWidth, TotalWordsWidth),
            SignatureBlockX = PickDouble(overrides.SignatureBlockX, SignatureBlockX),
            SignatureBlockY = PickDouble(overrides.SignatureBlockY, SignatureBlockY),
            SignatureBlockWidth = PickDouble(overrides.SignatureBlockWidth, SignatureBlockWidth),
            FooterY = PickDouble(overrides.FooterY, FooterY),
            FooterWidth = PickDouble(overrides.FooterWidth, FooterWidth),
            AccentColorHex = Pick(overrides.AccentColorHex, AccentColorHex),
            PageBackgroundHex = Pick(overrides.PageBackgroundHex, PageBackgroundHex),
            BodyTextColorHex = Pick(overrides.BodyTextColorHex, BodyTextColorHex),
            MutedTextColorHex = Pick(overrides.MutedTextColorHex, MutedTextColorHex),
            DividerColorHex = Pick(overrides.DividerColorHex, DividerColorHex),
            TableHeaderBackgroundHex = Pick(overrides.TableHeaderBackgroundHex, TableHeaderBackgroundHex),
            TableHeaderTextColorHex = Pick(overrides.TableHeaderTextColorHex, TableHeaderTextColorHex),
            TableBorderColorHex = Pick(overrides.TableBorderColorHex, TableBorderColorHex),
            TableAlternateRowColorHex = Pick(overrides.TableAlternateRowColorHex, TableAlternateRowColorHex),
            ServiceTitle = Pick(overrides.ServiceTitle, ServiceTitle),
            FooterTitle = Pick(overrides.FooterTitle, FooterTitle),
            FooterLine1 = Pick(overrides.FooterLine1, FooterLine1),
            FooterLine2 = Pick(overrides.FooterLine2, FooterLine2),
            ShowHeader = PickBool(overrides.ShowHeader, ShowHeader),
            ShowLogo = PickBool(overrides.ShowLogo, ShowLogo),
            ShowSellerBlock = PickBool(overrides.ShowSellerBlock, ShowSellerBlock),
            ShowClientBlock = PickBool(overrides.ShowClientBlock, ShowClientBlock),
            ShowMetadata = PickBool(overrides.ShowMetadata, ShowMetadata),
            ShowAdditionalInfo = PickBool(overrides.ShowAdditionalInfo, ShowAdditionalInfo),
            ShowTable = PickBool(overrides.ShowTable, ShowTable),
            ShowTotals = PickBool(overrides.ShowTotals, ShowTotals),
            ShowFooter = PickBool(overrides.ShowFooter, ShowFooter),
            ShowTotalInWords = PickBool(overrides.ShowTotalInWords, ShowTotalInWords),
            TotalInWordsLabel = Pick(overrides.TotalInWordsLabel, TotalInWordsLabel),
            CustomElements = overrides.CustomElements is null
                ? CloneCustomElements(CustomElements)
                : CloneCustomElements(overrides.CustomElements)
        };
    }

    private static string? Pick(string? overrideValue, string? fallbackValue)
    {
        return string.IsNullOrWhiteSpace(overrideValue) ? fallbackValue : overrideValue.Trim();
    }

    private static int? PickInt(int? overrideValue, int? fallbackValue)
    {
        if (overrideValue.HasValue && overrideValue.Value > 0)
        {
            return overrideValue.Value;
        }

        return fallbackValue;
    }

    private static double? PickDouble(double? overrideValue, double? fallbackValue)
    {
        if (overrideValue.HasValue && !double.IsNaN(overrideValue.Value) && !double.IsInfinity(overrideValue.Value))
        {
            return overrideValue.Value;
        }

        return fallbackValue;
    }

    private static bool? PickBool(bool? overrideValue, bool? fallbackValue)
    {
        if (overrideValue.HasValue)
        {
            return overrideValue.Value;
        }

        return fallbackValue;
    }

    private static List<InvoicePdfCustomElement>? CloneCustomElements(IEnumerable<InvoicePdfCustomElement>? source)
    {
        if (source is null)
        {
            return null;
        }

        return source
            .Select(element => new InvoicePdfCustomElement
            {
                Id = element.Id,
                Type = element.Type,
                Text = element.Text,
                X = element.X,
                Y = element.Y,
                Width = element.Width,
                Height = element.Height,
                FontSize = element.FontSize,
                ColorHex = element.ColorHex,
                BackgroundColorHex = element.BackgroundColorHex,
                StrokeColorHex = element.StrokeColorHex,
                StrokeWidth = element.StrokeWidth,
                SrcDataUrl = element.SrcDataUrl,
                Bold = element.Bold,
                Italic = element.Italic,
                Align = element.Align,
                Visible = element.Visible,
                ZIndex = element.ZIndex
            })
            .ToList();
    }
}
