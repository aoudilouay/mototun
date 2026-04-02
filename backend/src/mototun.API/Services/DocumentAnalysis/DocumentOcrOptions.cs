namespace mototun.API.Services.DocumentAnalysis;

public sealed class DocumentOcrOptions
{
    public const string SectionName = "DocumentOcr";

    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public string AnalyzePath { get; set; } = "/api/ocr/analyze";
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
    public decimal MinConfidence { get; set; } = 0.65m;
}
