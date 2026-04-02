using mototun.Core.Enums;

namespace mototun.API.Services.DocumentAnalysis;

public sealed class DocumentAutoValidationResult
{
    public static readonly DocumentAutoValidationResult Skipped = new()
    {
        WasAnalyzed = false
    };

    public bool WasAnalyzed { get; init; }
    public IReadOnlyList<DocumentValidationReason> Reasons { get; init; } = Array.Empty<DocumentValidationReason>();
    public IReadOnlyList<string> Checklist { get; init; } = Array.Empty<string>();
    public string? Summary { get; init; }
}
