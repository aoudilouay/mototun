using mototun.Core.DTOs;

namespace mototun.API.Services.Invoices;

public interface IInvoiceDashboardService
{
    Task<FournisseurDashboardAnalyticsDto> GetFournisseurDashboardAsync(
        int fournisseurId,
        string? range,
        CancellationToken cancellationToken = default);

    Task<InvoiceDashboardExportFile> ExportRevendeurDashboardAsync(
        int revendeurId,
        string? range,
        string? type,
        CancellationToken cancellationToken = default);

    Task<InvoiceDashboardExportFile> ExportFournisseurDashboardAsync(
        int fournisseurId,
        string? range,
        string? type,
        CancellationToken cancellationToken = default);
}
