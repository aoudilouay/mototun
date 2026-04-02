namespace mototun.API.Services.Invoices;

public sealed record InvoiceDashboardExportFile(
    string FileName,
    byte[] Content,
    string ContentType = "text/csv; charset=utf-8");
