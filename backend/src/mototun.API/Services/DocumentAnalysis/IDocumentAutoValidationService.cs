using mototun.Core.Enums;

namespace mototun.API.Services.DocumentAnalysis;

public interface IDocumentAutoValidationService
{
    bool IsSupported(ClientPortalDocumentType documentType);

    Task<DocumentAutoValidationResult> AnalyzeAsync(
        ClientPortalDocumentType documentType,
        string absolutePath,
        string originalFileName,
        CancellationToken cancellationToken = default);
}
