using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using mototun.API.Extensions;
using mototun.API.Services.DocumentAnalysis;
using mototun.API.Services.Documents;
using mototun.API.Services.InvoicePdf;
using mototun.API.Services.Storage;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Text.Json;
using System.Diagnostics;

namespace mototun.API.Controllers;

[ApiController]
[Route("api/client-portal")]
public class ClientPortalController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
        ".jfif",
        ".heic",
        ".heif",
        ".avif"
    };
    private const long MaxUploadBytes = 50_000_000;

    private readonly ApplicationDbContext _context;
    private readonly IDocumentAutoValidationService _documentAutoValidationService;
    private readonly IOptionsMonitor<InvoicePdfOptions> _invoicePdfOptions;
    private readonly IInvoicePdfSettingsStore _invoicePdfSettingsStore;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<ClientPortalController> _logger;

    public ClientPortalController(
        ApplicationDbContext context,
        IDocumentAutoValidationService documentAutoValidationService,
        IOptionsMonitor<InvoicePdfOptions> invoicePdfOptions,
        IInvoicePdfSettingsStore invoicePdfSettingsStore,
        IFileStorage fileStorage,
        ILogger<ClientPortalController> logger)
    {
        _context = context;
        _documentAutoValidationService = documentAutoValidationService;
        _invoicePdfOptions = invoicePdfOptions;
        _invoicePdfSettingsStore = invoicePdfSettingsStore;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    [EnableRateLimiting("ClientPortalAccess")]
    [HttpPost("access")]
    public async Task<ActionResult<ApiResponse<ClientPortalDossierDto>>> AccessPortal([FromBody] ClientPortalAccessDto dto)
    {
        var normalizedCode = NormalizeCode(dto.Code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<ClientPortalDossierDto>
            {
                Success = false,
                Message = "Code incorrect."
            });
        }

        var invoice = await FindInvoiceByAccessCodeAsync(normalizedCode);
        if (invoice is null)
        {
            return Unauthorized(new ApiResponse<ClientPortalDossierDto>
            {
                Success = false,
                Message = "Code d'acces incorrect"
            });
        }

        var dossier = MapDossier(invoice);

        return Ok(new ApiResponse<ClientPortalDossierDto>
        {
            Success = true,
            Message = "Acces autorise",
            Data = dossier
        });
    }

    [EnableRateLimiting("ClientPortalRead")]
    [HttpGet("{invoiceId:int}")]
    public async Task<ActionResult<ApiResponse<ClientPortalDossierDto>>> GetDossier(int invoiceId, [FromQuery] string code)
    {
        var normalizedCode = NormalizeCode(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<ClientPortalDossierDto>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: true);
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<ClientPortalDossierDto>
            {
                Success = false,
                Message = "Acces refuse"
            });
        }

        return Ok(new ApiResponse<ClientPortalDossierDto>
        {
            Success = true,
            Message = "Dossier charge",
            Data = MapDossier(invoice)
        });
    }

    [EnableRateLimiting("ClientPortalRead")]
    [HttpGet("{invoiceId:int}/invoice-pdf")]
    public async Task<IActionResult> DownloadInvoicePdf(int invoiceId, [FromQuery] string code)
    {
        var normalizedCode = NormalizeCode(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: true);
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<object>
            {
                Success = false,
                Message = "Acces refuse"
            });
        }

        var customization = await BuildInvoicePdfCustomizationAsync(invoice.RevendeurId, HttpContext.RequestAborted);
        var bytes = InvoicePdfBuilder.Build(invoice, customization);
        return File(bytes, "application/pdf", BuildFactureFileName(invoice));
    }

    [EnableRateLimiting("ClientPortalRead")]
    [HttpGet("{invoiceId:int}/invoice-pdf/inline")]
    public async Task<IActionResult> PreviewInvoicePdf(int invoiceId, [FromQuery] string code)
    {
        var normalizedCode = NormalizeCode(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: true);
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<object>
            {
                Success = false,
                Message = "Acces refuse"
            });
        }

        var customization = await BuildInvoicePdfCustomizationAsync(invoice.RevendeurId, HttpContext.RequestAborted);
        var bytes = InvoicePdfBuilder.Build(invoice, customization);
        ApplyPrivateDocumentCacheHeaders($"invoice-pdf-{invoice.Id}", invoice.UpdatedAt);
        Response.Headers["Content-Disposition"] = BuildInlineContentDisposition(BuildFactureFileName(invoice));

        return new FileContentResult(bytes, "application/pdf")
        {
            EnableRangeProcessing = true
        };
    }

    [EnableRateLimiting("ClientPortalAccess")]
    [HttpPost("{invoiceId:int}/documents")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<ActionResult<ApiResponse<ClientPortalUploadResultDto>>> UploadDocument(int invoiceId, [FromForm] UploadClientPortalDocumentForm form)
    {
        var uploadStopwatch = Stopwatch.StartNew();
        var normalizedCode = NormalizeCode(form.Code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        if (form.File is null || form.File.Length <= 0)
        {
            return BadRequest(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = "Aucun fichier recu."
            });
        }

        if (form.File.Length > MaxUploadBytes)
        {
            return BadRequest(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = "Le fichier est trop grand. Maximum 50 Mo."
            });
        }

        if (!Enum.IsDefined(typeof(ClientPortalDocumentType), form.DocumentType))
        {
            return BadRequest(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = "Ce type de document n est pas reconnu."
            });
        }

        var documentType = (ClientPortalDocumentType)form.DocumentType;

        var extension = ResolveUploadExtension(form.File);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            return BadRequest(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = $"Format non pris en charge ({form.File.ContentType}). Ajoutez un PDF ou une photo."
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: false);
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = "Acces refuse."
            });
        }

        var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var storageKey = ClientPortalStoragePaths.BuildRelativePath(invoiceId, storedFileName);
        var tempFilePath = await CreateTemporaryUploadFileAsync(form.File, extension, HttpContext.RequestAborted);

        var now = DateTime.UtcNow;
        var storedFile = new ClientPortalStoredFile(
            SanitizeFileName(form.File.FileName),
            storedFileName,
            string.IsNullOrWhiteSpace(form.File.ContentType) ? "application/octet-stream" : form.File.ContentType,
            form.File.Length,
            storageKey);
        var mutation = ClientPortalDocumentMutation.Upsert(
            invoice.ClientPortalDocuments,
            invoice.Id,
            documentType,
            storedFile,
            uploadedByClient: true,
            now);
        var existing = mutation.Document;

        if (mutation.DuplicateDocuments.Count > 0)
        {
            _context.ClientPortalDocuments.RemoveRange(mutation.DuplicateDocuments);
        }

        var autoReasons = await TryApplyAutomaticValidationAsync(
            invoice,
            documentType,
            tempFilePath,
            now,
            HttpContext.RequestAborted);

        if (ShouldRejectUploadedDocument(documentType, autoReasons))
        {
            TryDeleteTemporaryFile(tempFilePath);

            return BadRequest(new ApiResponse<ClientPortalUploadResultDto>
            {
                Success = false,
                Message = BuildUploadRejectedMessage(documentType)
            });
        }

        await using (var storageStream = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            await _fileStorage.SaveAsync(storageKey, storageStream, storedFile.ContentType, HttpContext.RequestAborted);
        }

        ApplyCarteGriseProgress(invoice);
        invoice.UpdatedAt = now;

        await _context.SaveChangesAsync();

        await DeleteStoredFilesAsync(mutation.ReplacedRelativePath, mutation.DuplicateRelativePaths, HttpContext.RequestAborted);
        TryDeleteTemporaryFile(tempFilePath);
        uploadStopwatch.Stop();

        _logger.LogInformation(
            "Client portal document upload stored for invoice {InvoiceId}. DocumentType={DocumentType}. SizeBytes={SizeBytes}. ContentType={ContentType}. OptimizationApplied={OptimizationApplied}. TotalMs={TotalMs}",
            invoice.Id,
            documentType,
            form.File.Length,
            storedFile.ContentType,
            false,
            uploadStopwatch.ElapsedMilliseconds);

        return Ok(new ApiResponse<ClientPortalUploadResultDto>
        {
            Success = true,
            Message = "Document ajoute.",
            Data = new ClientPortalUploadResultDto
            {
                DocumentId = existing.Id,
                DocumentType = existing.DocumentType,
                FileName = existing.OriginalFileName,
                SizeBytes = existing.SizeBytes,
                UpdatedAt = existing.UpdatedAt
            }
        });
    }

    [HttpGet("{invoiceId:int}/documents/{documentId:int}/download")]
    public async Task<IActionResult> DownloadDocument(int invoiceId, int documentId, [FromQuery] string code)
    {
        var normalizedCode = NormalizeCode(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: true);
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<object>
            {
                Success = false,
                Message = "Acces refuse"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Document introuvable"
            });
        }

        var stream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
        if (stream is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Fichier introuvable"
            });
        }

        return CreateAttachmentDocumentResponse(stream, document);
    }

    [EnableRateLimiting("ClientPortalRead")]
    [HttpGet("{invoiceId:int}/documents/{documentId:int}/inline")]
    public async Task<IActionResult> PreviewDocument(int invoiceId, int documentId, [FromQuery] string code)
    {
        var normalizedCode = NormalizeCode(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: true);
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<object>
            {
                Success = false,
                Message = "Acces refuse"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Document introuvable"
            });
        }

        var stream = await _fileStorage.OpenReadAsync(document.RelativePath, HttpContext.RequestAborted);
        if (stream is null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Fichier introuvable"
            });
        }

        return CreateInlineDocumentResponse(stream, document);
    }

    [EnableRateLimiting("ClientPortalRead")]
    [HttpGet("{invoiceId:int}/documents/{documentId:int}/access-url")]
    public async Task<ActionResult<ApiResponse<DocumentAccessUrlDto>>> GetDocumentAccessUrl(int invoiceId, int documentId, [FromQuery] string code)
    {
        var authorizationStopwatch = Stopwatch.StartNew();
        var normalizedCode = NormalizeCode(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return BadRequest(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Code invalide"
            });
        }

        var invoice = await LoadInvoiceGraphAsync(invoiceId, asNoTracking: true);
        authorizationStopwatch.Stop();
        if (invoice is null || !HasAccess(invoice, normalizedCode))
        {
            return Unauthorized(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Acces refuse"
            });
        }

        var document = invoice.ClientPortalDocuments.FirstOrDefault(d => d.Id == documentId);
        if (document is null)
        {
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Document introuvable"
            });
        }

        var accessStopwatch = Stopwatch.StartNew();
        var inlineUrl = Url.ActionLink(
            nameof(PreviewDocument),
            values: new { invoiceId, documentId, code = normalizedCode });
        var sasUri = await _fileStorage.GenerateSasUriAsync(
            document.RelativePath,
            TimeSpan.FromMinutes(10),
            HttpContext.RequestAborted);
        accessStopwatch.Stop();

        var resolvedUrl = sasUri?.ToString() ?? inlineUrl;
        if (string.IsNullOrWhiteSpace(resolvedUrl))
        {
            _logger.LogWarning("Failed to build client portal preview URL for invoice {InvoiceId} document {DocumentId}", invoiceId, documentId);
            return NotFound(new ApiResponse<DocumentAccessUrlDto>
            {
                Success = false,
                Message = "Fichier introuvable"
            });
        }

        _logger.LogInformation(
            "Prepared client portal document access URL for invoice {InvoiceId} document {DocumentId}. DeliveryMode={DeliveryMode}. AuthMs={AuthMs}. AccessMs={AccessMs}. SizeBytes={SizeBytes}. ContentType={ContentType}",
            invoiceId,
            documentId,
            sasUri is null ? "inline-proxy" : "blob-sas",
            authorizationStopwatch.ElapsedMilliseconds,
            accessStopwatch.ElapsedMilliseconds,
            document.SizeBytes,
            document.ContentType);

        return Ok(new ApiResponse<DocumentAccessUrlDto>
        {
            Success = true,
            Message = "Acces document prepare",
            Data = new DocumentAccessUrlDto
            {
                Url = resolvedUrl,
                ExpiresIn = 600
            }
        });
    }

    private async Task<IReadOnlyCollection<DocumentValidationReason>> TryApplyAutomaticValidationAsync(
        Invoice invoice,
        ClientPortalDocumentType documentType,
        string absolutePath,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (!_documentAutoValidationService.IsSupported(documentType))
        {
            return Array.Empty<DocumentValidationReason>();
        }

        DocumentAutoValidationResult autoValidationResult;
        try
        {
            autoValidationResult = await _documentAutoValidationService.AnalyzeAsync(
                documentType,
                absolutePath,
                Path.GetFileName(absolutePath),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Automatic document verification failed for invoice {InvoiceId}", invoice.Id);
            return Array.Empty<DocumentValidationReason>();
        }

        if (!autoValidationResult.WasAnalyzed)
        {
            return Array.Empty<DocumentValidationReason>();
        }

        var detectedReasons = NormalizeValidationReasons(autoValidationResult.Reasons);
        var detectedChecklist = NormalizeChecklistItems(autoValidationResult.Checklist);
        if (detectedReasons.Count == 0 && detectedChecklist.Count == 0)
        {
            return Array.Empty<DocumentValidationReason>();
        }

        var existingReasons = DeserializeValidationReasons(invoice.DocumentIssueReasonsJson);
        var existingChecklist = DeserializeChecklistItems(invoice.DocumentFixChecklistJson);

        var mergedReasons = NormalizeValidationReasons(existingReasons.Concat(detectedReasons));
        var mergedChecklist = NormalizeChecklistItems(existingChecklist.Concat(detectedChecklist));

        var reasonsChanged = !existingReasons.SequenceEqual(mergedReasons);
        var checklistChanged = !existingChecklist.SequenceEqual(mergedChecklist);
        var sanitizedIssueMessage = SanitizeDocumentIssueMessage(invoice.DocumentIssueMessage);
        var issueMessageChanged = !string.Equals(
            NormalizeOptionalMessage(invoice.DocumentIssueMessage),
            NormalizeOptionalMessage(sanitizedIssueMessage),
            StringComparison.Ordinal);

        if (!reasonsChanged && !checklistChanged && !issueMessageChanged)
        {
            return detectedReasons;
        }

        invoice.DocumentIssueReasonsJson = SerializeValidationReasons(mergedReasons);
        invoice.DocumentFixChecklistJson = SerializeChecklistItems(mergedChecklist);
        invoice.DocumentIssueUpdatedByUserId = null;
        invoice.DocumentIssueUpdatedAt = now;
        invoice.DocumentIssueMessage = sanitizedIssueMessage;
        invoice.UpdatedAt = now;

        if (reasonsChanged || checklistChanged)
        {
            _context.InvoiceTimelineEvents.Add(new InvoiceTimelineEvent
            {
                InvoiceId = invoice.Id,
                EventType = InvoiceTimelineEventType.DocumentIssueUpdated,
                ActorUserId = null,
                ActorRole = UserRole.Client,
                Title = "Controle automatique document",
                Message = BuildAutoValidationTimelineMessage(documentType, detectedReasons),
                CreatedAt = now
            });
        }

        return detectedReasons;
    }

    private static List<DocumentValidationReason> NormalizeValidationReasons(IEnumerable<DocumentValidationReason>? reasons)
    {
        if (reasons is null)
        {
            return new List<DocumentValidationReason>();
        }

        return reasons
            .Where(reason => Enum.IsDefined(typeof(DocumentValidationReason), reason))
            .Distinct()
            .OrderBy(reason => (int)reason)
            .ToList();
    }

    private static List<string> NormalizeChecklistItems(IEnumerable<string>? checklist)
    {
        if (checklist is null)
        {
            return new List<string>();
        }

        return checklist
            .Select(item => item?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!.Length <= 240 ? item : item[..240])
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();
    }

    private static string? SerializeValidationReasons(IReadOnlyCollection<DocumentValidationReason> reasons)
    {
        return reasons.Count == 0 ? null : JsonSerializer.Serialize(reasons);
    }

    private static string? SerializeChecklistItems(IReadOnlyCollection<string> checklist)
    {
        return checklist.Count == 0 ? null : JsonSerializer.Serialize(checklist);
    }

    private static List<DocumentValidationReason> DeserializeValidationReasons(string? serialized)
    {
        if (string.IsNullOrWhiteSpace(serialized))
        {
            return new List<DocumentValidationReason>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<DocumentValidationReason>>(serialized);
            return NormalizeValidationReasons(parsed ?? new List<DocumentValidationReason>());
        }
        catch
        {
            return new List<DocumentValidationReason>();
        }
    }

    private static List<string> DeserializeChecklistItems(string? serialized)
    {
        if (string.IsNullOrWhiteSpace(serialized))
        {
            return new List<string>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(serialized);
            return NormalizeChecklistItems(parsed ?? new List<string>());
        }
        catch
        {
            return new List<string>();
        }
    }

    private static string BuildAutoValidationTimelineMessage(
        ClientPortalDocumentType documentType,
        IReadOnlyCollection<DocumentValidationReason> reasons)
    {
        var reasonLabel = reasons.Count == 0
            ? "Anomalie detectee"
            : string.Join(", ", reasons.Select(ToValidationReasonLabel));

        var message = $"{GetDocumentLabel(documentType)}: {reasonLabel}.";

        return message.Length <= 2000 ? message : message[..2000];
    }

    private static string ToValidationReasonLabel(DocumentValidationReason reason)
    {
        return reason switch
        {
            DocumentValidationReason.Blurred => "Document flou",
            DocumentValidationReason.MissingSignature => "Signature manquante",
            DocumentValidationReason.Mismatch => "Incoherence des informations",
            DocumentValidationReason.MissingPage => "Page manquante",
            DocumentValidationReason.Expired => "Document expire",
            DocumentValidationReason.Incomplete => "Document incomplet",
            _ => "Motif inconnu"
        };
    }

    private static string? NormalizeOptionalMessage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= 2000 ? trimmed : trimmed[..2000];
    }

    private static string? SanitizeDocumentIssueMessage(string? value)
    {
        var normalized = NormalizeOptionalMessage(value);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        var keptLines = normalized
            .Split('\n')
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Where(line => !IsAutoValidationNoiseLine(line))
            .ToList();

        if (keptLines.Count == 0)
        {
            return null;
        }

        return NormalizeOptionalMessage(string.Join("\n", keptLines));
    }

    private static bool IsAutoValidationNoiseLine(string line)
    {
        var normalized = line.Trim().ToLowerInvariant();
        return normalized.Contains("[auto ocr", StringComparison.Ordinal)
            || normalized.Contains("[verification auto", StringComparison.Ordinal)
            || normalized.Contains("ocr termine", StringComparison.Ordinal)
            || normalized.Contains("zones texte:", StringComparison.Ordinal)
            || normalized.Contains("champs manquants:", StringComparison.Ordinal);
    }

    private static bool ShouldRejectUploadedDocument(
        ClientPortalDocumentType documentType,
        IReadOnlyCollection<DocumentValidationReason> reasons)
    {
        // For now, uploads are never auto-rejected: auto-validation only records
        // warning reasons/checklists and revendeur remains the final reviewer.
        return false;
    }

    private static bool IsStrictDocumentType(ClientPortalDocumentType documentType)
    {
        return documentType is ClientPortalDocumentType.Cin
            or ClientPortalDocumentType.CinFront
            or ClientPortalDocumentType.CinBack
            or ClientPortalDocumentType.DeclarationImpot;
    }

    private static string BuildUploadRejectedMessage(ClientPortalDocumentType documentType)
    {
        return $"Le fichier envoye ne ressemble pas a un {GetDocumentLabel(documentType)} valide. Merci d envoyer une photo claire du vrai document.";
    }

    private async Task<Invoice?> FindInvoiceByAccessCodeAsync(string normalizedCode)
    {
        if (string.IsNullOrWhiteSpace(normalizedCode) || normalizedCode.Length < 6)
        {
            return null;
        }

        return await _context.Invoices
            .AsNoTracking()
            .Where(i => i.ClientPortalAccessCode == normalizedCode)
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r.User)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .FirstOrDefaultAsync();
    }

    private async Task<Invoice?> LoadInvoiceGraphAsync(int invoiceId, bool asNoTracking)
    {
        var query = _context.Invoices
            .Include(i => i.Client)
            .Include(i => i.Revendeur)
                .ThenInclude(r => r.User)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .Where(i => i.Id == invoiceId);

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync();
    }

    private static bool HasAccess(Invoice invoice, string normalizedCode)
    {
        return string.Equals(invoice.ClientPortalAccessCode, normalizedCode, StringComparison.Ordinal);
    }

    private static ClientPortalDossierDto MapDossier(Invoice invoice)
    {
        var sold = invoice.SoldMotorcycles
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefault();

        var documents = invoice.ClientPortalDocuments
            .OrderByDescending(d => d.UpdatedAt)
            .ThenByDescending(d => d.Id)
            .Select(d => new ClientPortalDocumentDto
            {
                DocumentId = d.Id,
                DocumentType = d.DocumentType,
                DocumentLabel = GetDocumentLabel(d.DocumentType),
                FileName = d.OriginalFileName,
                ContentType = d.ContentType,
                SizeBytes = d.SizeBytes,
                UploadedByClient = d.UploadedByClient,
                UpdatedAt = d.UpdatedAt
            })
            .ToList();

        var hasLegacyCin = documents.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = documents.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = documents.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = documents.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = documents.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);

        return new ClientPortalDossierDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            AccessCode = invoice.ClientPortalAccessCode,
            ClientName = invoice.Client.FullName,
            ClientCIN = invoice.Client.CIN,
            RevendeurName = invoice.Revendeur.BusinessName,
            RevendeurPhone = invoice.Revendeur.User.Phone,
            RevendeurEmail = invoice.Revendeur.User.Email,
            MotorcycleCompany = sold?.Company ?? string.Empty,
            MotorcycleBrand = sold?.Brand ?? string.Empty,
            MotorcycleModel = sold?.Model ?? string.Empty,
            ChassisNumber = sold?.ChassisNumber ?? string.Empty,
            Matricule = sold?.Matricule,
            TotalAmount = invoice.TotalAmount,
            InvoiceStatus = invoice.Status,
            CarteGriseStatus = invoice.CarteGriseStatus,
            InvoiceDate = invoice.InvoiceDate,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            IsCinUploaded = hasCin,
            IsCinFrontUploaded = hasCinFront || hasLegacyCin,
            IsCinBackUploaded = hasCinBack || hasLegacyCin,
            IsDeclarationUploaded = hasDeclaration,
            IsFactureUploaded = hasFacture,
            ClientUpdateMessage = invoice.ClientUpdateMessage,
            ClientUpdateUpdatedAt = invoice.ClientUpdateUpdatedAt,
            Documents = documents
        };
    }

    private static void ApplyCarteGriseProgress(Invoice invoice)
    {
        var hasLegacyCin = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);

        if (hasCin && hasDeclaration && hasFacture && invoice.CarteGriseStatus == CarteGriseStatus.PendingDocuments)
        {
            invoice.CarteGriseStatus = CarteGriseStatus.DocumentsReceived;
        }
    }

    private async Task<InvoicePdfCustomization> BuildInvoicePdfCustomizationAsync(
        int revendeurId,
        CancellationToken cancellationToken = default)
    {
        var defaults = InvoicePdfCustomization.FromOptions(_invoicePdfOptions.CurrentValue);
        if (revendeurId <= 0)
        {
            return defaults;
        }

        var custom = await _invoicePdfSettingsStore.GetRevendeurCustomizationAsync(revendeurId, cancellationToken);
        return defaults.Merge(custom);
    }

    private static string NormalizeCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return new string(value
            .Trim()
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());
    }

    private static async Task<string> CreateTemporaryUploadFileAsync(IFormFile file, string extension, CancellationToken cancellationToken)
    {
        var tempFilePath = Path.Combine(Path.GetTempPath(), $"mototun-upload-{Guid.NewGuid():N}{extension.ToLowerInvariant()}");
        await using var stream = new FileStream(tempFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, cancellationToken);
        return tempFilePath;
    }

    private async Task DeleteStoredFilesAsync(string? replacedRelativePath, IEnumerable<string> duplicateRelativePaths, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(replacedRelativePath))
        {
            await _fileStorage.DeleteIfExistsAsync(replacedRelativePath, cancellationToken);
        }

        foreach (var duplicatePath in duplicateRelativePaths)
        {
            await _fileStorage.DeleteIfExistsAsync(duplicatePath, cancellationToken);
        }
    }

    private static void TryDeleteTemporaryFile(string tempFilePath)
    {
        if (string.IsNullOrWhiteSpace(tempFilePath) || !System.IO.File.Exists(tempFilePath))
        {
            return;
        }

        try
        {
            System.IO.File.Delete(tempFilePath);
        }
        catch
        {
        }
    }

    private static string GetDocumentLabel(ClientPortalDocumentType documentType)
    {
        return documentType switch
        {
            ClientPortalDocumentType.Cin => "CIN",
            ClientPortalDocumentType.CinFront => "CIN (recto)",
            ClientPortalDocumentType.CinBack => "CIN (verso)",
            ClientPortalDocumentType.DeclarationImpot => "Declaration d'impot",
            ClientPortalDocumentType.JustificatifDomicile => "Justificatif de domicile",
            ClientPortalDocumentType.Facture => "Facture",
            ClientPortalDocumentType.CarteGrise => "Carte grise",
            _ => "Autre document"
        };
    }

    private static string BuildFactureFileName(Invoice invoice)
    {
        var numberToken = SanitizeFileNameToken(invoice.InvoiceNumber, "numero_facture");
        var clientToken = SanitizeFileNameToken(invoice.Client?.FullName, "client");
        return $"facture_{numberToken}_{clientToken}.pdf";
    }

    private static string SanitizeFileNameToken(string? value, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var cleaned = new string(value
            .Trim()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '_')
            .ToArray());

        while (cleaned.Contains("__", StringComparison.Ordinal))
        {
            cleaned = cleaned.Replace("__", "_", StringComparison.Ordinal);
        }

        cleaned = cleaned.Trim('_');

        return string.IsNullOrWhiteSpace(cleaned) ? fallback : cleaned;
    }

    private static string SanitizeFileName(string fileName)
    {
        var safe = Path.GetFileName(fileName);
        return string.IsNullOrWhiteSpace(safe) ? $"document-{Guid.NewGuid():N}" : safe;
    }

    private IActionResult CreateAttachmentDocumentResponse(Stream stream, ClientPortalDocument document)
    {
        ApplyPrivateDocumentCacheHeaders($"document-{document.Id}", document.UpdatedAt);
        return new FileStreamResult(stream, ResolveContentType(document.ContentType))
        {
            FileDownloadName = document.OriginalFileName,
            EnableRangeProcessing = true
        };
    }

    private IActionResult CreateInlineDocumentResponse(Stream stream, ClientPortalDocument document)
    {
        ApplyPrivateDocumentCacheHeaders($"document-{document.Id}", document.UpdatedAt);
        Response.Headers["Content-Disposition"] = BuildInlineContentDisposition(document.OriginalFileName);

        return new FileStreamResult(stream, ResolveContentType(document.ContentType))
        {
            EnableRangeProcessing = true
        };
    }

    private void ApplyPrivateDocumentCacheHeaders(string cacheKey, DateTime updatedAt)
    {
        Response.Headers.CacheControl = "private, max-age=600, must-revalidate";
        Response.Headers.ETag = $"\"{cacheKey}-{updatedAt.Ticks}\"";
    }

    private static string ResolveContentType(string? contentType)
    {
        return string.IsNullOrWhiteSpace(contentType)
            ? "application/octet-stream"
            : contentType;
    }

    private static string BuildInlineContentDisposition(string? fileName)
    {
        var safeFileName = string.IsNullOrWhiteSpace(fileName)
            ? $"document-{Guid.NewGuid():N}"
            : fileName;
        return $"inline; filename*=UTF-8''{Uri.EscapeDataString(safeFileName)}";
    }

    private static string ResolveUploadExtension(IFormFile file)
    {
        var fromName = Path.GetExtension(file.FileName);
        if (!string.IsNullOrWhiteSpace(fromName) && AllowedExtensions.Contains(fromName))
        {
            return fromName.ToLowerInvariant();
        }

        var fromContentType = (file.ContentType ?? string.Empty).ToLowerInvariant() switch
        {
            "application/pdf" => ".pdf",
            "image/png" => ".png",
            "image/jpg" => ".jpg",
            "image/jpeg" => ".jpeg",
            "image/webp" => ".webp",
            "image/bmp" => ".bmp",
            "image/jfif" => ".jfif",
            "image/heic" => ".heic",
            "image/heif" => ".heif",
            "image/avif" => ".avif",
            _ => string.Empty
        };

        if (!string.IsNullOrWhiteSpace(fromContentType))
        {
            return fromContentType;
        }

        var sniffed = TryDetectExtensionFromSignature(file);
        if (!string.IsNullOrWhiteSpace(sniffed))
        {
            return sniffed;
        }

        return string.IsNullOrWhiteSpace(fromName) ? string.Empty : fromName.ToLowerInvariant();
    }

    private static string TryDetectExtensionFromSignature(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            var buffer = new byte[32];
            var read = stream.Read(buffer, 0, buffer.Length);
            if (read < 4)
            {
                return string.Empty;
            }

            if (read >= 4 && buffer[0] == 0x25 && buffer[1] == 0x50 && buffer[2] == 0x44 && buffer[3] == 0x46)
            {
                return ".pdf";
            }

            if (read >= 3 && buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF)
            {
                return ".jpeg";
            }

            if (read >= 8 && buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47
                && buffer[4] == 0x0D && buffer[5] == 0x0A && buffer[6] == 0x1A && buffer[7] == 0x0A)
            {
                return ".png";
            }

            if (read >= 2 && buffer[0] == 0x42 && buffer[1] == 0x4D)
            {
                return ".bmp";
            }

            if (read >= 12
                && buffer[0] == 0x52 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x46
                && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50)
            {
                return ".webp";
            }

            if (read >= 12
                && buffer[4] == 0x66 && buffer[5] == 0x74 && buffer[6] == 0x79 && buffer[7] == 0x70)
            {
                var brand = new string(new[] { (char)buffer[8], (char)buffer[9], (char)buffer[10], (char)buffer[11] }).ToLowerInvariant();
                if (brand is "heic" or "heix" or "hevc" or "hevx")
                {
                    return ".heic";
                }

                if (brand is "mif1" or "msf1")
                {
                    return ".heif";
                }

                if (brand is "avif" or "avis")
                {
                    return ".avif";
                }
            }
        }
        catch
        {
            return string.Empty;
        }

        return string.Empty;
    }

    public class UploadClientPortalDocumentForm
    {
        public string Code { get; set; } = string.Empty;
        public int DocumentType { get; set; }
        public IFormFile? File { get; set; }
    }
}
