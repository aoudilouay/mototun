using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using mototun.Core.Enums;

namespace mototun.API.Services.DocumentAnalysis;

public sealed class PaddleOcrDocumentAutoValidationService : IDocumentAutoValidationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<DocumentOcrOptions> _optionsMonitor;
    private readonly ILogger<PaddleOcrDocumentAutoValidationService> _logger;

    public PaddleOcrDocumentAutoValidationService(
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<DocumentOcrOptions> optionsMonitor,
        ILogger<PaddleOcrDocumentAutoValidationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public bool IsSupported(ClientPortalDocumentType documentType)
    {
        return documentType is ClientPortalDocumentType.Cin
            or ClientPortalDocumentType.CinFront
            or ClientPortalDocumentType.CinBack
            or ClientPortalDocumentType.DeclarationImpot;
    }

    public async Task<DocumentAutoValidationResult> AnalyzeAsync(
        ClientPortalDocumentType documentType,
        string absolutePath,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        if (!IsSupported(documentType))
        {
            return DocumentAutoValidationResult.Skipped;
        }

        var options = _optionsMonitor.CurrentValue;
        if (!options.Enabled || string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            return DocumentAutoValidationResult.Skipped;
        }

        if (!File.Exists(absolutePath))
        {
            return DocumentAutoValidationResult.Skipped;
        }

        try
        {
            using var request = BuildRequest(options, documentType, absolutePath, originalFileName);
            using var client = _httpClientFactory.CreateClient(nameof(PaddleOcrDocumentAutoValidationService));
            client.BaseAddress = BuildBaseUri(options.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 5, 120));

            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Document verification endpoint returned HTTP {StatusCode} for document type {DocumentType}",
                    (int)response.StatusCode,
                    documentType);
                return DocumentAutoValidationResult.Skipped;
            }

            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(payload))
            {
                return new DocumentAutoValidationResult
                {
                    WasAnalyzed = true
                };
            }

            return ParsePayload(payload, documentType, options.MinConfidence);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Document verification call timed out for document type {DocumentType}", documentType);
            return DocumentAutoValidationResult.Skipped;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Document verification call failed for document type {DocumentType}", documentType);
            return DocumentAutoValidationResult.Skipped;
        }
    }

    private static HttpRequestMessage BuildRequest(
        DocumentOcrOptions options,
        ClientPortalDocumentType documentType,
        string absolutePath,
        string originalFileName)
    {
        var multipart = new MultipartFormDataContent();
        var fileStream = File.OpenRead(absolutePath);
        var fileContent = new StreamContent(fileStream);

        var mediaType = ResolveContentType(absolutePath);
        if (!string.IsNullOrWhiteSpace(mediaType))
        {
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(mediaType);
        }

        multipart.Add(fileContent, "file", string.IsNullOrWhiteSpace(originalFileName) ? Path.GetFileName(absolutePath) : originalFileName);
        multipart.Add(new StringContent(documentType.ToString()), "documentType");

        var request = new HttpRequestMessage(HttpMethod.Post, NormalizeAnalyzePath(options.AnalyzePath))
        {
            Content = multipart
        };

        if (!string.IsNullOrWhiteSpace(options.ApiKey))
        {
            request.Headers.TryAddWithoutValidation("X-Api-Key", options.ApiKey.Trim());
        }

        return request;
    }

    private static Uri BuildBaseUri(string baseUrl)
    {
        var normalized = baseUrl.Trim();
        if (!normalized.EndsWith("/", StringComparison.Ordinal))
        {
            normalized += "/";
        }

        return new Uri(normalized, UriKind.Absolute);
    }

    private static string NormalizeAnalyzePath(string? analyzePath)
    {
        if (string.IsNullOrWhiteSpace(analyzePath))
        {
            return "api/ocr/analyze";
        }

        return analyzePath.TrimStart('/');
    }

    private static string ResolveContentType(string path)
    {
        var extension = Path.GetExtension(path).ToLowerInvariant();
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".jfif" => "image/jpeg",
            ".heic" => "image/heic",
            ".heif" => "image/heif",
            ".avif" => "image/avif",
            _ => "application/octet-stream"
        };
    }

    private static DocumentAutoValidationResult ParsePayload(string payload, ClientPortalDocumentType documentType, decimal minConfidence)
    {
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;

        var reasons = new HashSet<DocumentValidationReason>();
        var checklist = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var issueCode in ReadStringArray(root, "issues", "issueCodes", "validation.issues", "flags.issues"))
        {
            ApplyIssueCode(issueCode, documentType, reasons, checklist);
        }

        if (TryReadBoolean(root, out var isBlurred, "isBlurred", "flags.isBlurred", "quality.isBlurred") && isBlurred)
        {
            AddReason(reasons, checklist, DocumentValidationReason.Blurred, documentType);
        }

        if (TryReadBoolean(root, out var hasSignature, "hasSignature", "signatureDetected", "flags.hasSignature")
            && !hasSignature)
        {
            AddReason(reasons, checklist, DocumentValidationReason.MissingSignature, documentType);
        }

        if (TryReadBoolean(root, out var isComplete, "isComplete", "documentComplete", "flags.isComplete")
            && !isComplete)
        {
            AddReason(reasons, checklist, DocumentValidationReason.Incomplete, documentType);
        }

        if (TryReadBoolean(root, out var isExpired, "isExpired", "flags.isExpired")
            && isExpired)
        {
            AddReason(reasons, checklist, DocumentValidationReason.Expired, documentType);
        }

        if (TryReadBoolean(root, out var matchesType, "matchesExpectedType", "documentTypeMatches", "flags.matchesExpectedType")
            && !matchesType)
        {
            AddReason(reasons, checklist, DocumentValidationReason.Mismatch, documentType);
        }

        if (documentType == ClientPortalDocumentType.CinFront
            && TryReadBoolean(root, out var hasFrontSide, "hasFrontSide", "frontDetected", "flags.hasFrontSide")
            && !hasFrontSide)
        {
            AddReason(reasons, checklist, DocumentValidationReason.MissingPage, documentType);
        }

        if (documentType == ClientPortalDocumentType.CinBack
            && TryReadBoolean(root, out var hasBackSide, "hasBackSide", "backDetected", "flags.hasBackSide")
            && !hasBackSide)
        {
            AddReason(reasons, checklist, DocumentValidationReason.MissingPage, documentType);
        }

        if (TryReadDecimal(root, out var confidence, "confidence", "ocrConfidence", "metrics.confidence")
            && confidence < minConfidence)
        {
            AddReason(reasons, checklist, DocumentValidationReason.Blurred, documentType);
        }

        var missingFields = ReadStringArray(root, "missingFields", "validation.missingFields").ToList();
        if (missingFields.Count > 0)
        {
            AddReason(reasons, checklist, DocumentValidationReason.Incomplete, documentType);
        }

        foreach (var suggestedFix in ReadStringArray(root, "checklist", "actions", "recommendedFixes"))
        {
            var normalized = NormalizeChecklistItem(suggestedFix);
            if (!string.IsNullOrWhiteSpace(normalized))
            {
                checklist.Add(normalized);
            }
        }

        var normalizedChecklist = checklist
            .Select(NormalizeChecklistItem)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .Cast<string>()
            .ToList();

        return new DocumentAutoValidationResult
        {
            WasAnalyzed = true,
            Reasons = reasons.OrderBy(reason => (int)reason).ToList(),
            Checklist = normalizedChecklist,
            Summary = null
        };
    }

    private static void ApplyIssueCode(
        string issueCode,
        ClientPortalDocumentType documentType,
        ISet<DocumentValidationReason> reasons,
        ISet<string> checklist)
    {
        var normalized = issueCode.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return;
        }

        switch (normalized)
        {
            case "blurred":
            case "blurry":
            case "low_quality":
            case "low_confidence":
                AddReason(reasons, checklist, DocumentValidationReason.Blurred, documentType);
                break;
            case "missing_signature":
            case "signature_missing":
            case "no_signature":
                AddReason(reasons, checklist, DocumentValidationReason.MissingSignature, documentType);
                break;
            case "mismatch":
            case "document_mismatch":
            case "identity_mismatch":
            case "wrong_document_type":
                AddReason(reasons, checklist, DocumentValidationReason.Mismatch, documentType);
                break;
            case "missing_page":
            case "page_missing":
            case "back_missing":
            case "front_missing":
                AddReason(reasons, checklist, DocumentValidationReason.MissingPage, documentType);
                break;
            case "expired":
            case "document_expired":
                AddReason(reasons, checklist, DocumentValidationReason.Expired, documentType);
                break;
            case "incomplete":
            case "missing_fields":
            case "partial_document":
                AddReason(reasons, checklist, DocumentValidationReason.Incomplete, documentType);
                break;
        }
    }

    private static void AddReason(
        ISet<DocumentValidationReason> reasons,
        ISet<string> checklist,
        DocumentValidationReason reason,
        ClientPortalDocumentType documentType)
    {
        reasons.Add(reason);
        var defaultFix = GetDefaultChecklist(reason, documentType);
        if (!string.IsNullOrWhiteSpace(defaultFix))
        {
            checklist.Add(defaultFix);
        }
    }

    private static string GetDefaultChecklist(DocumentValidationReason reason, ClientPortalDocumentType documentType)
    {
        var docLabel = documentType switch
        {
            ClientPortalDocumentType.Cin => "CIN",
            ClientPortalDocumentType.CinFront => "CIN recto",
            ClientPortalDocumentType.CinBack => "CIN verso",
            ClientPortalDocumentType.DeclarationImpot => "declaration d'impot",
            _ => "document"
        };

        return reason switch
        {
            DocumentValidationReason.Blurred => $"Reprendre une photo nette du {docLabel}.",
            DocumentValidationReason.MissingSignature => $"Ajouter la signature manquante sur le {docLabel}.",
            DocumentValidationReason.Mismatch => $"Verifier que le {docLabel} correspond aux donnees du client.",
            DocumentValidationReason.MissingPage => documentType == ClientPortalDocumentType.CinFront
                ? "Ajouter la face recto de la CIN."
                : documentType == ClientPortalDocumentType.CinBack
                    ? "Ajouter la face verso de la CIN."
                    : $"Ajouter toutes les pages du {docLabel}.",
            DocumentValidationReason.Expired => $"Fournir un {docLabel} valide (non expire).",
            DocumentValidationReason.Incomplete => $"Scanner le {docLabel} en entier, sans zone coupee.",
            _ => string.Empty
        };
    }

    private static string? NormalizeChecklistItem(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length <= 240 ? normalized : normalized[..240];
    }

    private static bool TryReadBoolean(JsonElement root, out bool value, params string[] candidatePaths)
    {
        foreach (var candidatePath in candidatePaths)
        {
            if (!TryReadElement(root, candidatePath, out var element))
            {
                continue;
            }

            if (element.ValueKind == JsonValueKind.True)
            {
                value = true;
                return true;
            }

            if (element.ValueKind == JsonValueKind.False)
            {
                value = false;
                return true;
            }

            if (element.ValueKind == JsonValueKind.String
                && bool.TryParse(element.GetString(), out var parsed))
            {
                value = parsed;
                return true;
            }

            if (element.ValueKind == JsonValueKind.Number
                && element.TryGetInt32(out var number))
            {
                value = number != 0;
                return true;
            }
        }

        value = false;
        return false;
    }

    private static bool TryReadDecimal(JsonElement root, out decimal value, params string[] candidatePaths)
    {
        foreach (var candidatePath in candidatePaths)
        {
            if (!TryReadElement(root, candidatePath, out var element))
            {
                continue;
            }

            if (element.ValueKind == JsonValueKind.Number && element.TryGetDecimal(out var decimalValue))
            {
                value = decimalValue;
                return true;
            }

            if (element.ValueKind == JsonValueKind.String
                && decimal.TryParse(element.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out decimalValue))
            {
                value = decimalValue;
                return true;
            }
        }

        value = 0;
        return false;
    }

    private static bool TryReadInt(JsonElement root, out int value, params string[] candidatePaths)
    {
        foreach (var candidatePath in candidatePaths)
        {
            if (!TryReadElement(root, candidatePath, out var element))
            {
                continue;
            }

            if (element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out var intValue))
            {
                value = intValue;
                return true;
            }

            if (element.ValueKind == JsonValueKind.String
                && int.TryParse(element.GetString(), out intValue))
            {
                value = intValue;
                return true;
            }
        }

        value = 0;
        return false;
    }

    private static IEnumerable<string> ReadStringArray(JsonElement root, params string[] candidatePaths)
    {
        foreach (var candidatePath in candidatePaths)
        {
            if (!TryReadElement(root, candidatePath, out var element))
            {
                continue;
            }

            if (element.ValueKind == JsonValueKind.String)
            {
                var value = element.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    yield return value;
                }

                continue;
            }

            if (element.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var item in element.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var itemValue = item.GetString();
                    if (!string.IsNullOrWhiteSpace(itemValue))
                    {
                        yield return itemValue;
                    }

                    continue;
                }

                if (item.ValueKind == JsonValueKind.Object
                    && TryReadObjectString(item, out var code, "code", "issueCode", "value")
                    && !string.IsNullOrWhiteSpace(code))
                {
                    yield return code!;
                }
            }
        }
    }

    private static bool TryReadElement(JsonElement root, string path, out JsonElement value)
    {
        value = root;
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        var segments = path.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var segment in segments)
        {
            if (value.ValueKind != JsonValueKind.Object || !TryReadObjectProperty(value, segment, out value))
            {
                return false;
            }
        }

        return true;
    }

    private static bool TryReadObjectString(JsonElement element, out string? value, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!TryReadObjectProperty(element, propertyName, out var propertyValue))
            {
                continue;
            }

            if (propertyValue.ValueKind == JsonValueKind.String)
            {
                value = propertyValue.GetString();
                return !string.IsNullOrWhiteSpace(value);
            }
        }

        value = null;
        return false;
    }

    private static bool TryReadObjectProperty(JsonElement element, string propertyName, out JsonElement value)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            value = property.Value;
            return true;
        }

        value = default;
        return false;
    }
}
