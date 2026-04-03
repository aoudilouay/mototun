namespace mototun.API.Services.Storage;

public sealed class AzureBlobOptions
{
    public const string SectionName = "AzureBlob";

    public string ConnectionString { get; set; } = string.Empty;
    public string DocumentsContainer { get; set; } = "client-portal-docs";
    public string AvatarsContainer { get; set; } = "avatars";
    public string InvoiceSettingsContainer { get; set; } = "invoice-pdf-settings";
}
