# Data Readiness Checklist

Run this checklist before starting a new feature phase.

## 1) Database integrity checks (SQL Server)

```sql
-- Orphan checks
SELECT COUNT(*) AS InvoicesMissingClient
FROM Invoices i
LEFT JOIN Clients c ON c.Id = i.ClientId
WHERE c.Id IS NULL;

SELECT COUNT(*) AS SoldMissingInvoice
FROM SoldMotorcycles s
LEFT JOIN Invoices i ON i.Id = s.InvoiceId
WHERE i.Id IS NULL;

SELECT COUNT(*) AS SoldBrokenStockRef
FROM SoldMotorcycles s
LEFT JOIN Motorcycles m ON m.Id = s.StockMotorcycleId
WHERE s.StockMotorcycleId IS NOT NULL AND m.Id IS NULL;

-- Financial consistency
SELECT COUNT(*) AS InvoiceTotalMismatch
FROM Invoices i
OUTER APPLY (SELECT ISNULL(SUM(s.SalePrice),0) AS SoldSum FROM SoldMotorcycles s WHERE s.InvoiceId = i.Id) x
WHERE ABS(ISNULL(i.TotalAmount,0) - x.SoldSum) > 0.01;

-- Stock sanity
SELECT COUNT(*) AS NegativeStock FROM Motorcycles WHERE Qty < 0;

-- Legacy data quality (should be 0 for new records)
SELECT COUNT(*) AS SoldWithoutChassis
FROM SoldMotorcycles
WHERE ChassisNumber IS NULL OR LTRIM(RTRIM(ChassisNumber)) = '';
```

## 2) Portal access quality

- Access code rule: `normalize(CIN) + last5(normalize(ChassisNumber))`.
- Every new sold motorcycle must have a non-empty `ChassisNumber`.
- If `SoldWithoutChassis > 0`, those are legacy rows and should be corrected manually.

## 3) Operational rules

- Never edit production data directly without a backup.
- Use EF migrations only (no schema hotfixes outside migrations).
- Keep document storage and DB rows in sync (`ClientPortalDocuments.RelativePath`).
- Do not hard-delete clients tied to invoices; deactivate/detach instead.

## 4) Release gate (must pass)

- `dotnet build backend/src/mototun.API/mototun.API.csproj`
- `npm run build` (frontend)
- Targeted lint for touched files
- Database integrity checks above

## 5) Backup before next phase

- Full DB backup of `mototun`
- Copy `backend/src/mototun.API/Storage/ClientPortal` if used in environment

