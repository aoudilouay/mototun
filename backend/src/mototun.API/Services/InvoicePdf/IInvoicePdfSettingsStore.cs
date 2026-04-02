using mototun.API.Extensions;

namespace mototun.API.Services.InvoicePdf;

public interface IInvoicePdfSettingsStore
{
    Task<InvoicePdfCustomization?> GetRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default);
    Task SaveRevendeurCustomizationAsync(int revendeurId, InvoicePdfCustomization customization, CancellationToken cancellationToken = default);
    Task DeleteRevendeurCustomizationAsync(int revendeurId, CancellationToken cancellationToken = default);
}
