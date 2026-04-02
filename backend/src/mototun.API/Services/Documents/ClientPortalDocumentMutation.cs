using mototun.Core.Entities;
using mototun.Core.Enums;

namespace mototun.API.Services.Documents;

public sealed record ClientPortalStoredFile(
    string OriginalFileName,
    string StoredFileName,
    string ContentType,
    long SizeBytes,
    string RelativePath);

public sealed record ClientPortalDocumentMutationResult(
    ClientPortalDocument Document,
    IReadOnlyList<ClientPortalDocument> DuplicateDocuments,
    IReadOnlyList<string> DuplicateRelativePaths,
    string? ReplacedRelativePath);

public static class ClientPortalDocumentMutation
{
    public static ClientPortalDocumentMutationResult Upsert(
        ICollection<ClientPortalDocument> documents,
        int invoiceId,
        ClientPortalDocumentType documentType,
        ClientPortalStoredFile storedFile,
        bool uploadedByClient,
        DateTime now)
    {
        var sameTypeDocuments = documents
            .Where(document => document.DocumentType == documentType)
            .OrderByDescending(document => document.UpdatedAt)
            .ThenByDescending(document => document.Id)
            .ToList();

        var existing = sameTypeDocuments.FirstOrDefault();
        var duplicates = sameTypeDocuments.Skip(1).ToList();
        var duplicateRelativePaths = duplicates
            .Select(document => document.RelativePath)
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Cast<string>()
            .ToList();

        string? replacedRelativePath = null;

        if (existing is null)
        {
            existing = new ClientPortalDocument
            {
                InvoiceId = invoiceId,
                DocumentType = documentType,
                CreatedAt = now
            };
            documents.Add(existing);
        }
        else
        {
            replacedRelativePath = existing.RelativePath;
        }

        existing.OriginalFileName = storedFile.OriginalFileName;
        existing.StoredFileName = storedFile.StoredFileName;
        existing.ContentType = storedFile.ContentType;
        existing.SizeBytes = storedFile.SizeBytes;
        existing.RelativePath = storedFile.RelativePath;
        existing.UploadedByClient = uploadedByClient;
        existing.UpdatedAt = now;

        return new ClientPortalDocumentMutationResult(
            existing,
            duplicates,
            duplicateRelativePaths,
            replacedRelativePath);
    }
}
