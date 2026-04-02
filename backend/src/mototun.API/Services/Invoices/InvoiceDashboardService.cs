using Microsoft.EntityFrameworkCore;
using mototun.API.Services.Settings;
using mototun.Core.DTOs;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.Globalization;
using System.Text;

namespace mototun.API.Services.Invoices;

public class InvoiceDashboardService : IInvoiceDashboardService
{
    private readonly ApplicationDbContext _context;

    public InvoiceDashboardService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<FournisseurDashboardAnalyticsDto> GetFournisseurDashboardAsync(
        int fournisseurId,
        string? range,
        CancellationToken cancellationToken = default)
    {
        var normalizedRange = NormalizeDashboardRange(range);
        var now = DateTime.UtcNow;
        var rangeStart = GetDashboardRangeStart(normalizedRange, now);
        var previousRangeStart = GetPreviousDashboardRangeStart(normalizedRange, rangeStart);

        var invoices = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.AssignedFournisseurId == fournisseurId)
            .Include(i => i.ClientPortalDocuments)
            .Include(i => i.Revendeur)
            .ToListAsync(cancellationToken);

        var invoiceFacts = invoices
            .Select(MapFournisseurInvoiceFact)
            .ToList();

        var revendeurIds = invoiceFacts
            .Select(i => i.RevendeurId)
            .Distinct()
            .ToList();

        var persistedSettingsByRevendeurId = revendeurIds.Count == 0
            ? new Dictionary<int, RevendeurSettings>()
            : await _context.RevendeurSettings
                .AsNoTracking()
                .Where(s => revendeurIds.Contains(s.RevendeurId))
                .ToDictionaryAsync(s => s.RevendeurId, cancellationToken);

        var effectiveSettingsByRevendeurId = revendeurIds.ToDictionary(
            revendeurIdValue => revendeurIdValue,
            revendeurIdValue =>
            {
                persistedSettingsByRevendeurId.TryGetValue(revendeurIdValue, out var settings);
                return RevendeurSettingsPolicy.BuildEffective(settings);
            });

        var openInvoiceFacts = invoiceFacts
            .Where(i => IsOpenDossier(i.Status))
            .ToList();

        var slaAtRiskOpen = 0;
        var slaStuckOpen = 0;
        foreach (var invoiceFact in openInvoiceFacts)
        {
            var effectiveSettings = effectiveSettingsByRevendeurId.TryGetValue(invoiceFact.RevendeurId, out var candidate)
                ? candidate
                : RevendeurSettingsPolicy.BuildEffective(null);
            var inactivityHours = (now - invoiceFact.LastActivityAt).TotalHours;

            if (inactivityHours >= effectiveSettings.StuckAfterHours)
            {
                slaStuckOpen++;
                continue;
            }

            if (inactivityHours >= effectiveSettings.WarningAfterHours)
            {
                slaAtRiskOpen++;
            }
        }

        var currentRangeInvoices = invoiceFacts
            .Where(i => IsBetween(i.ReceivedAt, rangeStart, now))
            .ToList();

        var previousRangeInvoices = invoiceFacts
            .Where(i => IsBetween(i.ReceivedAt, previousRangeStart, rangeStart))
            .ToList();

        var completedCurrent = currentRangeInvoices
            .Where(i => i.Status is CarteGriseStatus.Ready or CarteGriseStatus.Delivered)
            .ToList();

        var completedPrevious = previousRangeInvoices
            .Where(i => i.Status is CarteGriseStatus.Ready or CarteGriseStatus.Delivered)
            .ToList();

        var partnerships = await _context.RevendeurFournisseurConnections
            .AsNoTracking()
            .Where(c => c.FournisseurId == fournisseurId)
            .ToListAsync(cancellationToken);

        var acceptedPartnershipsCurrent = partnerships.Count(p =>
            p.Status == PartnershipRequestStatus.Accepted
            && IsBetween(GetPartnershipEventDate(p), rangeStart, now));

        var acceptedPartnershipsPrevious = partnerships.Count(p =>
            p.Status == PartnershipRequestStatus.Accepted
            && IsBetween(GetPartnershipEventDate(p), previousRangeStart, rangeStart));

        var slaEscalationsLast30Days = await _context.InvoiceTimelineEvents
            .AsNoTracking()
            .CountAsync(e =>
                e.EventType == InvoiceTimelineEventType.StuckEscalationTriggered
                && e.CreatedAt >= now.AddDays(-30)
                && e.Invoice.AssignedFournisseurId == fournisseurId,
                cancellationToken);

        return new FournisseurDashboardAnalyticsDto
        {
            Range = normalizedRange,
            RangeStartUtc = rangeStart,
            RangeEndUtc = now,
            PreviousRangeStartUtc = previousRangeStart,
            ReceivedCurrent = currentRangeInvoices.Count,
            ReceivedPrevious = previousRangeInvoices.Count,
            CompletedCurrent = completedCurrent.Count,
            CompletedPrevious = completedPrevious.Count,
            RejectedCurrent = currentRangeInvoices.Count(i => i.Status == CarteGriseStatus.Rejected),
            RejectedPrevious = previousRangeInvoices.Count(i => i.Status == CarteGriseStatus.Rejected),
            CompletionRateCurrent = ComputeRatioPercent(completedCurrent.Count, currentRangeInvoices.Count),
            CompletionRatePrevious = ComputeRatioPercent(completedPrevious.Count, previousRangeInvoices.Count),
            DocumentsCoverageCurrent = ComputeRatioPercent(
                currentRangeInvoices.Count(i => i.RequiredDocsComplete),
                currentRangeInvoices.Count),
            DocumentsCoveragePrevious = ComputeRatioPercent(
                previousRangeInvoices.Count(i => i.RequiredDocsComplete),
                previousRangeInvoices.Count),
            AverageTurnaroundDaysCurrent = ComputeAverageTurnaroundDays(completedCurrent),
            AverageTurnaroundDaysPrevious = ComputeAverageTurnaroundDays(completedPrevious),
            AmountCurrent = currentRangeInvoices.Sum(i => i.TotalAmount),
            AmountPrevious = previousRangeInvoices.Sum(i => i.TotalAmount),
            TotalDossiers = invoiceFacts.Count,
            BacklogOpen = invoiceFacts.Count(i => IsOpenDossier(i.Status)),
            DocumentsCompleteTotal = invoiceFacts.Count(i => i.RequiredDocsComplete),
            SlaAtRiskOpen = slaAtRiskOpen,
            SlaStuckOpen = slaStuckOpen,
            SlaEscalationsLast30Days = slaEscalationsLast30Days,
            StatusPending = invoiceFacts.Count(i => i.Status == CarteGriseStatus.PendingDocuments),
            StatusDocumentsReceived = invoiceFacts.Count(i => i.Status == CarteGriseStatus.DocumentsReceived),
            StatusInProgress = invoiceFacts.Count(i => i.Status is CarteGriseStatus.InProgress or CarteGriseStatus.DepotAntt),
            StatusCompleted = invoiceFacts.Count(i => i.Status is CarteGriseStatus.Ready or CarteGriseStatus.Delivered),
            StatusRejected = invoiceFacts.Count(i => i.Status == CarteGriseStatus.Rejected),
            ConnectedRevendeurs = partnerships.Count(p => p.Status == PartnershipRequestStatus.Accepted),
            IncomingPendingPartnerships = partnerships.Count(p =>
                p.Status == PartnershipRequestStatus.Pending
                && p.RequestedByRole == UserRole.Revendeur),
            OutgoingPendingPartnerships = partnerships.Count(p =>
                p.Status == PartnershipRequestStatus.Pending
                && p.RequestedByRole == UserRole.Fournisseur),
            PartnershipsAcceptedCurrent = acceptedPartnershipsCurrent,
            PartnershipsAcceptedPrevious = acceptedPartnershipsPrevious,
            Timeline = BuildFournisseurTimeline(normalizedRange, rangeStart, invoiceFacts),
            Revendeurs = BuildFournisseurRevendeurAnalytics(invoiceFacts)
        };
    }

    public async Task<InvoiceDashboardExportFile> ExportRevendeurDashboardAsync(
        int revendeurId,
        string? range,
        string? type,
        CancellationToken cancellationToken = default)
    {
        var normalizedRange = NormalizeDashboardRange(range);
        var normalizedType = NormalizeDashboardExportType(type);
        var now = DateTime.UtcNow;
        var rangeStart = GetDashboardRangeStart(normalizedRange, now);
        var previousRangeStart = GetPreviousDashboardRangeStart(normalizedRange, rangeStart);

        var invoices = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.RevendeurId == revendeurId)
            .Include(i => i.Client)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.ClientPortalDocuments)
            .ToListAsync(cancellationToken);

        if (normalizedType == "dossiers")
        {
            var dossierRows = invoices
                .OrderByDescending(i => i.UpdatedAt)
                .Select(i =>
                {
                    var sold = i.SoldMotorcycles.OrderByDescending(s => s.CreatedAt).FirstOrDefault();
                    var hasRequiredDocs = HasRequiredCarteGriseDocs(i.ClientPortalDocuments);
                    return new List<string>
                    {
                        i.InvoiceNumber,
                        i.Client?.FullName ?? string.Empty,
                        sold?.Brand ?? string.Empty,
                        sold?.Model ?? string.Empty,
                        sold?.ChassisNumber ?? string.Empty,
                        i.CarteGriseStatus.ToString(),
                        hasRequiredDocs ? "Oui" : "Non",
                        i.TotalAmount.ToString("0.00", CultureInfo.InvariantCulture),
                        NormalizeUtc(i.InvoiceDate).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                        NormalizeUtc(i.UpdatedAt).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                    };
                })
                .ToList();

            return BuildCsvFile(
                $"revendeur_dossiers_{normalizedRange}_{now:yyyyMMddHHmmss}.csv",
                new[] { "InvoiceNumber", "Client", "Brand", "Model", "Chassis", "CarteGriseStatus", "RequiredDocsComplete", "TotalAmountTnd", "InvoiceDate", "UpdatedAtUtc" },
                dossierRows);
        }

        var currentRangeInvoices = invoices
            .Where(i => IsBetween(NormalizeUtc(i.InvoiceDate), rangeStart, now))
            .ToList();

        var previousRangeInvoices = invoices
            .Where(i => IsBetween(NormalizeUtc(i.InvoiceDate), previousRangeStart, rangeStart))
            .ToList();

        var summaryRows = new List<List<string>>
        {
            new()
            {
                now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                normalizedRange,
                invoices.Count.ToString(CultureInfo.InvariantCulture),
                currentRangeInvoices.Count.ToString(CultureInfo.InvariantCulture),
                previousRangeInvoices.Count.ToString(CultureInfo.InvariantCulture),
                invoices.Count(i => i.CarteGriseStatus == CarteGriseStatus.PendingDocuments).ToString(CultureInfo.InvariantCulture),
                invoices.Count(i => i.CarteGriseStatus == CarteGriseStatus.DocumentsReceived).ToString(CultureInfo.InvariantCulture),
                invoices.Count(i => i.CarteGriseStatus is CarteGriseStatus.InProgress or CarteGriseStatus.DepotAntt).ToString(CultureInfo.InvariantCulture),
                invoices.Count(i => i.CarteGriseStatus is CarteGriseStatus.Ready or CarteGriseStatus.Delivered).ToString(CultureInfo.InvariantCulture),
                invoices.Count(i => i.CarteGriseStatus == CarteGriseStatus.Rejected).ToString(CultureInfo.InvariantCulture),
                currentRangeInvoices.Sum(i => i.TotalAmount).ToString("0.00", CultureInfo.InvariantCulture),
                previousRangeInvoices.Sum(i => i.TotalAmount).ToString("0.00", CultureInfo.InvariantCulture)
            }
        };

        return BuildCsvFile(
            $"revendeur_kpi_{normalizedRange}_{now:yyyyMMddHHmmss}.csv",
            new[]
            {
                "GeneratedAtUtc",
                "Range",
                "TotalInvoices",
                "CurrentRangeInvoices",
                "PreviousRangeInvoices",
                "PendingDossiers",
                "DocumentsReceivedDossiers",
                "InProgressDossiers",
                "CompletedDossiers",
                "RejectedDossiers",
                "CurrentAmountTnd",
                "PreviousAmountTnd"
            },
            summaryRows);
    }

    public async Task<InvoiceDashboardExportFile> ExportFournisseurDashboardAsync(
        int fournisseurId,
        string? range,
        string? type,
        CancellationToken cancellationToken = default)
    {
        var normalizedRange = NormalizeDashboardRange(range);
        var normalizedType = NormalizeDashboardExportType(type);
        var now = DateTime.UtcNow;
        var rangeStart = GetDashboardRangeStart(normalizedRange, now);
        var previousRangeStart = GetPreviousDashboardRangeStart(normalizedRange, rangeStart);

        var invoices = await _context.Invoices
            .AsNoTracking()
            .AsSplitQuery()
            .Where(i => i.AssignedFournisseurId == fournisseurId)
            .Include(i => i.ClientPortalDocuments)
            .Include(i => i.SoldMotorcycles)
            .Include(i => i.Revendeur)
            .Include(i => i.Client)
            .ToListAsync(cancellationToken);

        var invoiceFacts = invoices
            .Select(MapFournisseurInvoiceFact)
            .ToList();

        if (normalizedType == "dossiers")
        {
            var dossierRows = invoices
                .OrderByDescending(i => i.UpdatedAt)
                .Select(i =>
                {
                    var sold = i.SoldMotorcycles.OrderByDescending(s => s.CreatedAt).FirstOrDefault();
                    return new List<string>
                    {
                        i.InvoiceNumber,
                        i.Revendeur?.BusinessName ?? $"Revendeur #{i.RevendeurId}",
                        i.Client?.FullName ?? string.Empty,
                        sold is null ? string.Empty : $"{sold.Brand} {sold.Model}",
                        i.CarteGriseStatus.ToString(),
                        HasRequiredCarteGriseDocs(i.ClientPortalDocuments) ? "Oui" : "Non",
                        i.TotalAmount.ToString("0.00", CultureInfo.InvariantCulture),
                        NormalizeUtc(i.SentToFournisseurAt ?? i.InvoiceDate).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                        NormalizeUtc(i.UpdatedAt).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                    };
                })
                .ToList();

            return BuildCsvFile(
                $"fournisseur_dossiers_{normalizedRange}_{now:yyyyMMddHHmmss}.csv",
                new[] { "InvoiceNumber", "Revendeur", "Client", "Motorcycle", "CarteGriseStatus", "RequiredDocsComplete", "TotalAmountTnd", "ReceivedAtUtc", "UpdatedAtUtc" },
                dossierRows);
        }

        if (normalizedType == "revendeurs")
        {
            var revendeurRows = BuildFournisseurRevendeurAnalytics(invoiceFacts)
                .Select(r => new List<string>
                {
                    r.RevendeurId.ToString(CultureInfo.InvariantCulture),
                    r.BusinessName,
                    r.City,
                    r.TotalDossiers.ToString(CultureInfo.InvariantCulture),
                    r.OpenDossiers.ToString(CultureInfo.InvariantCulture),
                    r.CompletedDossiers.ToString(CultureInfo.InvariantCulture),
                    r.RejectedDossiers.ToString(CultureInfo.InvariantCulture),
                    r.DocumentsCompleteDossiers.ToString(CultureInfo.InvariantCulture),
                    r.TotalAmount.ToString("0.00", CultureInfo.InvariantCulture),
                    r.CompletionRate.ToString("0.00", CultureInfo.InvariantCulture),
                    r.DocumentsCoverageRate.ToString("0.00", CultureInfo.InvariantCulture)
                })
                .ToList();

            return BuildCsvFile(
                $"fournisseur_revendeurs_{normalizedRange}_{now:yyyyMMddHHmmss}.csv",
                new[]
                {
                    "RevendeurId",
                    "BusinessName",
                    "City",
                    "TotalDossiers",
                    "OpenDossiers",
                    "CompletedDossiers",
                    "RejectedDossiers",
                    "DocumentsCompleteDossiers",
                    "TotalAmountTnd",
                    "CompletionRatePercent",
                    "DocumentsCoverageRatePercent"
                },
                revendeurRows);
        }

        var currentRangeInvoices = invoiceFacts
            .Where(i => IsBetween(i.ReceivedAt, rangeStart, now))
            .ToList();

        var previousRangeInvoices = invoiceFacts
            .Where(i => IsBetween(i.ReceivedAt, previousRangeStart, rangeStart))
            .ToList();

        var completedCurrent = currentRangeInvoices
            .Where(i => i.Status is CarteGriseStatus.Ready or CarteGriseStatus.Delivered)
            .ToList();

        var completedPrevious = previousRangeInvoices
            .Where(i => i.Status is CarteGriseStatus.Ready or CarteGriseStatus.Delivered)
            .ToList();

        var kpiRows = new List<List<string>>
        {
            new()
            {
                now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                normalizedRange,
                currentRangeInvoices.Count.ToString(CultureInfo.InvariantCulture),
                previousRangeInvoices.Count.ToString(CultureInfo.InvariantCulture),
                completedCurrent.Count.ToString(CultureInfo.InvariantCulture),
                completedPrevious.Count.ToString(CultureInfo.InvariantCulture),
                ComputeRatioPercent(completedCurrent.Count, currentRangeInvoices.Count).ToString("0.00", CultureInfo.InvariantCulture),
                ComputeRatioPercent(currentRangeInvoices.Count(i => i.RequiredDocsComplete), currentRangeInvoices.Count).ToString("0.00", CultureInfo.InvariantCulture),
                ComputeAverageTurnaroundDays(completedCurrent).ToString("0.00", CultureInfo.InvariantCulture),
                currentRangeInvoices.Sum(i => i.TotalAmount).ToString("0.00", CultureInfo.InvariantCulture)
            }
        };

        return BuildCsvFile(
            $"fournisseur_kpi_{normalizedRange}_{now:yyyyMMddHHmmss}.csv",
            new[]
            {
                "GeneratedAtUtc",
                "Range",
                "ReceivedCurrent",
                "ReceivedPrevious",
                "CompletedCurrent",
                "CompletedPrevious",
                "CompletionRatePercent",
                "DocumentsCoveragePercent",
                "AverageTurnaroundDays",
                "AmountCurrentTnd"
            },
            kpiRows);
    }

    private static string NormalizeDashboardRange(string? range)
    {
        var normalized = range?.Trim().ToLowerInvariant();
        return normalized is "today" or "week" or "month" or "year"
            ? normalized
            : "month";
    }

    private static string NormalizeDashboardExportType(string? type)
    {
        var normalized = type?.Trim().ToLowerInvariant();
        return normalized is "dossiers" or "revendeurs"
            ? normalized
            : "kpi";
    }

    private static DateTime GetDashboardRangeStart(string range, DateTime nowUtc)
    {
        var normalizedNow = NormalizeUtc(nowUtc);
        return range switch
        {
            "today" => normalizedNow.Date,
            "week" => normalizedNow.Date.AddDays(-(normalizedNow.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)normalizedNow.DayOfWeek - 1)),
            "year" => new DateTime(normalizedNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => new DateTime(normalizedNow.Year, normalizedNow.Month, 1, 0, 0, 0, DateTimeKind.Utc)
        };
    }

    private static DateTime GetPreviousDashboardRangeStart(string range, DateTime currentRangeStartUtc)
    {
        return range switch
        {
            "today" => currentRangeStartUtc.AddDays(-1),
            "week" => currentRangeStartUtc.AddDays(-7),
            "year" => currentRangeStartUtc.AddYears(-1),
            _ => currentRangeStartUtc.AddMonths(-1)
        };
    }

    private static bool IsBetween(DateTime value, DateTime startInclusive, DateTime endExclusive)
    {
        return value >= startInclusive && value < endExclusive;
    }

    private static bool HasRequiredCarteGriseDocs(IEnumerable<ClientPortalDocument> documents)
    {
        var docs = documents.ToList();
        var hasLegacyCin = docs.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = docs.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = docs.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = docs.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = docs.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);
        return hasCin && hasDeclaration && hasFacture;
    }

    private static FournisseurInvoiceFact MapFournisseurInvoiceFact(Invoice invoice)
    {
        var hasLegacyCin = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Cin);
        var hasCinFront = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinFront);
        var hasCinBack = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.CinBack);
        var hasCin = hasLegacyCin || (hasCinFront && hasCinBack);
        var hasDeclaration = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.DeclarationImpot);
        var hasFacture = invoice.ClientPortalDocuments.Any(d => d.DocumentType == ClientPortalDocumentType.Facture);
        var requiredDocsComplete = hasCin && hasDeclaration && hasFacture;

        var receivedAt = NormalizeUtc(invoice.SentToFournisseurAt ?? invoice.InvoiceDate);
        var updatedAt = NormalizeUtc(invoice.UpdatedAt);
        var statusUpdatedAt = NormalizeUtc(invoice.CarteGriseStatusUpdatedAt) ?? updatedAt;
        var lastActivityAt = statusUpdatedAt > updatedAt ? statusUpdatedAt : updatedAt;

        DateTime? completedAt = invoice.CarteGriseStatus is CarteGriseStatus.Ready or CarteGriseStatus.Delivered
            ? statusUpdatedAt
            : null;

        DateTime? rejectedAt = invoice.CarteGriseStatus == CarteGriseStatus.Rejected
            ? statusUpdatedAt
            : null;

        var revendeurName = string.IsNullOrWhiteSpace(invoice.Revendeur?.BusinessName)
            ? $"Revendeur #{invoice.RevendeurId}"
            : invoice.Revendeur.BusinessName.Trim();

        var revendeurCity = string.IsNullOrWhiteSpace(invoice.Revendeur?.City)
            ? "-"
            : invoice.Revendeur.City.Trim();

        return new FournisseurInvoiceFact
        {
            InvoiceId = invoice.Id,
            RevendeurId = invoice.RevendeurId,
            RevendeurBusinessName = revendeurName,
            RevendeurCity = revendeurCity,
            Status = invoice.CarteGriseStatus,
            ReceivedAt = receivedAt,
            UpdatedAt = updatedAt,
            StatusUpdatedAt = statusUpdatedAt,
            LastActivityAt = lastActivityAt,
            CompletedAt = completedAt,
            RejectedAt = rejectedAt,
            RequiredDocsComplete = requiredDocsComplete,
            TotalAmount = invoice.TotalAmount
        };
    }

    private static bool IsOpenDossier(CarteGriseStatus status)
    {
        return status is CarteGriseStatus.PendingDocuments
            or CarteGriseStatus.DocumentsReceived
            or CarteGriseStatus.InProgress
            or CarteGriseStatus.DepotAntt;
    }

    private static DateTime GetPartnershipEventDate(RevendeurFournisseurConnection connection)
    {
        return NormalizeUtc(connection.RespondedAt ?? connection.UpdatedAt);
    }

    private static decimal ComputeRatioPercent(int numerator, int denominator)
    {
        if (denominator <= 0)
        {
            return 0m;
        }

        return Math.Round((decimal)numerator * 100m / denominator, 2, MidpointRounding.AwayFromZero);
    }

    private static double ComputeAverageTurnaroundDays(IEnumerable<FournisseurInvoiceFact> invoices)
    {
        var durations = invoices
            .Where(i => i.CompletedAt.HasValue && i.CompletedAt.Value >= i.ReceivedAt)
            .Select(i => (i.CompletedAt!.Value - i.ReceivedAt).TotalDays)
            .ToList();

        if (durations.Count == 0)
        {
            return 0d;
        }

        return Math.Round(durations.Average(), 2, MidpointRounding.AwayFromZero);
    }

    private static List<FournisseurDashboardTimelinePointDto> BuildFournisseurTimeline(
        string range,
        DateTime rangeStartUtc,
        IReadOnlyCollection<FournisseurInvoiceFact> invoices)
    {
        var buckets = BuildFournisseurTimelineBuckets(range, rangeStartUtc);
        var timeline = new List<FournisseurDashboardTimelinePointDto>(buckets.Count);

        foreach (var bucket in buckets)
        {
            var receivedInBucket = invoices
                .Where(i => IsBetween(i.ReceivedAt, bucket.Start, bucket.End))
                .ToList();

            timeline.Add(new FournisseurDashboardTimelinePointDto
            {
                BucketStartUtc = bucket.Start,
                BucketEndUtc = bucket.End,
                Label = bucket.Label,
                ReceivedCount = receivedInBucket.Count,
                CompletedCount = invoices.Count(i => i.CompletedAt.HasValue && IsBetween(i.CompletedAt.Value, bucket.Start, bucket.End)),
                RejectedCount = invoices.Count(i => i.RejectedAt.HasValue && IsBetween(i.RejectedAt.Value, bucket.Start, bucket.End)),
                AmountReceived = receivedInBucket.Sum(i => i.TotalAmount)
            });
        }

        return timeline;
    }

    private static List<(DateTime Start, DateTime End, string Label)> BuildFournisseurTimelineBuckets(string range, DateTime rangeStartUtc)
    {
        var buckets = new List<(DateTime Start, DateTime End, string Label)>();

        if (range == "today")
        {
            for (var hour = 0; hour < 24; hour++)
            {
                var start = rangeStartUtc.AddHours(hour);
                buckets.Add((start, start.AddHours(1), start.ToString("HH\\h", CultureInfo.InvariantCulture)));
            }

            return buckets;
        }

        if (range == "week")
        {
            for (var day = 0; day < 7; day++)
            {
                var start = rangeStartUtc.AddDays(day);
                buckets.Add((start, start.AddDays(1), start.ToString("ddd", CultureInfo.InvariantCulture)));
            }

            return buckets;
        }

        if (range == "year")
        {
            for (var month = 0; month < 12; month++)
            {
                var start = new DateTime(rangeStartUtc.Year, month + 1, 1, 0, 0, 0, DateTimeKind.Utc);
                buckets.Add((start, start.AddMonths(1), start.ToString("MMM", CultureInfo.InvariantCulture)));
            }

            return buckets;
        }

        var daysInMonth = DateTime.DaysInMonth(rangeStartUtc.Year, rangeStartUtc.Month);
        for (var day = 0; day < daysInMonth; day++)
        {
            var start = rangeStartUtc.AddDays(day);
            buckets.Add((start, start.AddDays(1), start.Day.ToString(CultureInfo.InvariantCulture)));
        }

        return buckets;
    }

    private static List<FournisseurDashboardRevendeurDto> BuildFournisseurRevendeurAnalytics(IEnumerable<FournisseurInvoiceFact> invoices)
    {
        return invoices
            .GroupBy(i => new { i.RevendeurId, i.RevendeurBusinessName, i.RevendeurCity })
            .Select(group =>
            {
                var totalDossiers = group.Count();
                var completed = group.Count(i => i.Status is CarteGriseStatus.Ready or CarteGriseStatus.Delivered);
                var rejected = group.Count(i => i.Status == CarteGriseStatus.Rejected);
                var open = group.Count(i => IsOpenDossier(i.Status));
                var docsComplete = group.Count(i => i.RequiredDocsComplete);
                var totalAmount = group.Sum(i => i.TotalAmount);

                return new FournisseurDashboardRevendeurDto
                {
                    RevendeurId = group.Key.RevendeurId,
                    BusinessName = group.Key.RevendeurBusinessName,
                    City = group.Key.RevendeurCity,
                    TotalDossiers = totalDossiers,
                    OpenDossiers = open,
                    CompletedDossiers = completed,
                    RejectedDossiers = rejected,
                    DocumentsCompleteDossiers = docsComplete,
                    TotalAmount = totalAmount,
                    CompletionRate = ComputeRatioPercent(completed, totalDossiers),
                    DocumentsCoverageRate = ComputeRatioPercent(docsComplete, totalDossiers),
                    LastActivityAt = group.Max(i => i.LastActivityAt)
                };
            })
            .OrderByDescending(i => i.TotalDossiers)
            .ThenByDescending(i => i.CompletedDossiers)
            .ThenByDescending(i => i.TotalAmount)
            .ToList();
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static DateTime? NormalizeUtc(DateTime? value)
    {
        return value.HasValue ? NormalizeUtc(value.Value) : null;
    }

    private static InvoiceDashboardExportFile BuildCsvFile(
        string fileName,
        IReadOnlyList<string> headers,
        IReadOnlyList<List<string>> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine(string.Join(",", headers.Select(EscapeCsvCell)));
        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(",", row.Select(EscapeCsvCell)));
        }

        var content = "\uFEFF" + builder;
        var bytes = Encoding.UTF8.GetBytes(content);
        return new InvoiceDashboardExportFile(fileName, bytes);
    }

    private static string EscapeCsvCell(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var escaped = value.Replace("\"", "\"\"");
        return escaped.IndexOfAny(new[] { ',', '"', '\n', '\r' }) >= 0
            ? $"\"{escaped}\""
            : escaped;
    }

    private sealed class FournisseurInvoiceFact
    {
        public int InvoiceId { get; init; }
        public int RevendeurId { get; init; }
        public string RevendeurBusinessName { get; init; } = string.Empty;
        public string RevendeurCity { get; init; } = string.Empty;
        public CarteGriseStatus Status { get; init; }
        public DateTime ReceivedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
        public DateTime StatusUpdatedAt { get; init; }
        public DateTime LastActivityAt { get; init; }
        public DateTime? CompletedAt { get; init; }
        public DateTime? RejectedAt { get; init; }
        public bool RequiredDocsComplete { get; init; }
        public decimal TotalAmount { get; init; }
    }
}
