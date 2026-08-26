using ClinicManagement.Api.Data;
using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Features.RetailSales;

public record RetailSaleItemInput(Guid MedicineId, Guid BatchId, decimal Quantity, decimal? UnitPrice);
public record CreateRetailSaleRequest(List<RetailSaleItemInput> Items, decimal AmountReceived, PaymentMethod PaymentMethod, string? PaymentReference, string? CustomerName, string? CustomerPhone, DateTime? SoldAt, string? PaymentProofUrl, string? PaymentProofPublicId, string? ReceiptDocumentUrl, string? ReceiptDocumentPublicId);

public sealed class RetailSalesService(ClinicDbContext db)
{
    public async Task<object> CreateAsync(CreateRetailSaleRequest input, Guid userId, CancellationToken ct)
    {
        if (input.Items.Count == 0) throw new ArgumentException("Add at least one medicine to the sale.");
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var sale = new RetailSale { SaleNumber = $"SALE-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..7].ToUpperInvariant()}", PaymentMethod = input.PaymentMethod, PaymentReference = input.PaymentReference?.Trim(), CustomerName = input.CustomerName?.Trim(), CustomerPhone = input.CustomerPhone?.Trim(), SoldAt = (input.SoldAt ?? DateTime.UtcNow).ToUniversalTime(), SoldById = userId, PaymentProofUrl = input.PaymentProofUrl, PaymentProofPublicId = input.PaymentProofPublicId, ReceiptDocumentUrl = input.ReceiptDocumentUrl, ReceiptDocumentPublicId = input.ReceiptDocumentPublicId };
        foreach (var requested in input.Items)
        {
            if (requested.Quantity <= 0) throw new ArgumentException("Every sale quantity must be positive.");
            var batch = await db.MedicineBatches.Include(x => x.Medicine).SingleOrDefaultAsync(x => x.Id == requested.BatchId && x.MedicineId == requested.MedicineId && x.IsActive, ct);
            if (batch is null) throw new ArgumentException("The selected medicine batch is unavailable.");
            if (batch.ExpiryDate is not null && batch.ExpiryDate <= DateOnly.FromDateTime(DateTime.UtcNow)) throw new ArgumentException($"Batch {batch.BatchNumber} is expired and cannot be sold.");
            if (batch.QuantityRemaining < requested.Quantity) throw new ArgumentException($"Batch {batch.BatchNumber} only has {batch.QuantityRemaining:N2} {batch.Medicine.Unit} remaining.");
            // The selling price is controlled by the selected stock batch. Never trust a price supplied by the browser.
            var price = batch.SellingPrice;
            var item = new RetailSaleItem { MedicineId = batch.MedicineId, MedicineBatchId = batch.Id, Quantity = requested.Quantity, UnitCost = batch.UnitCost, UnitPrice = price, TotalCost = requested.Quantity * batch.UnitCost, TotalAmount = requested.Quantity * price };
            sale.Items.Add(item); sale.TotalCost += item.TotalCost; sale.TotalAmount += item.TotalAmount;
            batch.QuantityRemaining -= requested.Quantity; batch.UpdatedAt = DateTime.UtcNow;
            db.StockTransactions.Add(new StockTransaction { MedicineId = batch.MedicineId, MedicineBatchId = batch.Id, Type = MovementType.SALE, QuantityChange = -requested.Quantity, BalanceAfter = batch.QuantityRemaining, Reason = $"Walk-in sale {sale.SaleNumber}", ReferenceType = "RetailSale", ReferenceId = sale.Id, PerformedById = userId });
        }
        var currency = await db.ClinicSettings.AsNoTracking().Where(x => x.IsActive).Select(x => x.Currency).FirstOrDefaultAsync(ct) ?? "UGX";
        if (input.AmountReceived > sale.TotalAmount) throw new ArgumentException($"Amount received cannot exceed the sale total of {currency} {sale.TotalAmount:N0}.");
        if (input.AmountReceived < sale.TotalAmount) throw new ArgumentException($"Walk-in sales must be fully paid. {currency} {sale.TotalAmount - input.AmountReceived:N0} is still required.");
        sale.AmountReceived = input.AmountReceived;
        db.RetailSales.Add(sale); db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "CREATE", EntityType = "RetailSale", EntityId = sale.Id.ToString(), NewValues = System.Text.Json.JsonSerializer.Serialize(input) });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return new { sale.Id, sale.SaleNumber, sale.TotalAmount, sale.TotalCost, grossProfit = sale.TotalAmount - sale.TotalCost, sale.AmountReceived, sale.Status, sale.SoldAt };
    }

    public async Task<object> ListAsync(string? search, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct)
    {
        var q = db.RetailSales.AsNoTracking().AsQueryable();
        if (from is not null) q = q.Where(x => x.SoldAt >= from.Value.ToUniversalTime());
        if (to is not null) q = q.Where(x => x.SoldAt <= to.Value.ToUniversalTime());
        if (!string.IsNullOrWhiteSpace(search)) { var s = search.Trim().ToLower(); q = q.Where(x => x.SaleNumber.ToLower().Contains(s) || (x.CustomerName != null && x.CustomerName.ToLower().Contains(s)) || x.Items.Any(i => i.Medicine.Name.ToLower().Contains(s))); }
        var total = await q.CountAsync(ct); var size = Math.Clamp(pageSize, 1, 100);
        var data = await q.OrderByDescending(x => x.SoldAt).Skip((Math.Max(page, 1) - 1) * size).Take(size).Select(x => new { x.Id, x.SaleNumber, x.TotalCost, x.TotalAmount, grossProfit = x.TotalAmount - x.TotalCost, x.AmountReceived, x.PaymentMethod, x.PaymentReference, x.CustomerName, x.CustomerPhone, x.Status, x.SoldAt, itemCount = x.Items.Count, quantity = x.Items.Sum(i => i.Quantity) }).ToListAsync(ct);
        return new { data, total, page = Math.Max(page, 1), pageSize = size };
    }

    public async Task<object?> FindAsync(Guid id, CancellationToken ct) => await db.RetailSales.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Id, x.SaleNumber, x.TotalCost, x.TotalAmount, grossProfit = x.TotalAmount - x.TotalCost, x.AmountReceived, x.PaymentMethod, x.PaymentReference, x.CustomerName, x.CustomerPhone, x.PaymentProofUrl, x.ReceiptDocumentUrl, x.Status, x.SoldAt, items = x.Items.Select(i => new { i.Id, i.MedicineId, medicine = i.Medicine.Name + " " + i.Medicine.Strength, i.MedicineBatchId, i.MedicineBatch.BatchNumber, i.Quantity, i.UnitCost, i.UnitPrice, i.TotalCost, i.TotalAmount }).ToList() }).SingleOrDefaultAsync(ct);

    public async Task<object> SummaryAsync(string period, DateTime? from, DateTime? to, CancellationToken ct)
    {
        var (start, end) = PeriodBounds(period, from, to); var q = db.RetailSales.AsNoTracking().Where(x => x.Status == "COMPLETED" && x.SoldAt >= start && x.SoldAt < end);
        var totals = await q.GroupBy(_ => 1).Select(g => new { transactions = g.Count(), revenue = g.Sum(x => x.TotalAmount), cost = g.Sum(x => x.TotalCost), grossProfit = g.Sum(x => x.TotalAmount - x.TotalCost), quantity = g.SelectMany(x => x.Items).Sum(i => i.Quantity) }).SingleOrDefaultAsync(ct);
        var byMedicine = await db.RetailSaleItems.AsNoTracking().Where(i => i.RetailSale.Status == "COMPLETED" && i.RetailSale.SoldAt >= start && i.RetailSale.SoldAt < end).GroupBy(i => new { i.MedicineId, i.Medicine.Name, i.Medicine.Strength }).Select(g => new { g.Key.MedicineId, medicine = g.Key.Name + " " + g.Key.Strength, quantity = g.Sum(x => x.Quantity), revenue = g.Sum(x => x.TotalAmount), cost = g.Sum(x => x.TotalCost), grossProfit = g.Sum(x => x.TotalAmount - x.TotalCost) }).OrderByDescending(x => x.revenue).Take(20).ToListAsync(ct);
        return new { period, from = start, to = end, transactions = totals?.transactions ?? 0, revenue = totals?.revenue ?? 0, cost = totals?.cost ?? 0, grossProfit = totals?.grossProfit ?? 0, quantity = totals?.quantity ?? 0, byMedicine };
    }

    private static (DateTime Start, DateTime End) PeriodBounds(string period, DateTime? from, DateTime? to)
    {
        var zone = GetKampalaZone(); var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone); DateTime startLocal; DateTime endLocal;
        switch (period.ToLowerInvariant()) { case "week": startLocal = localNow.Date.AddDays(-(((int)localNow.DayOfWeek + 6) % 7)); endLocal = startLocal.AddDays(7); break; case "month": startLocal = new DateTime(localNow.Year, localNow.Month, 1); endLocal = startLocal.AddMonths(1); break; case "year": startLocal = new DateTime(localNow.Year, 1, 1); endLocal = startLocal.AddYears(1); break; case "custom" when from is not null && to is not null: return (from.Value.ToUniversalTime(), to.Value.ToUniversalTime()); default: startLocal = localNow.Date; endLocal = startLocal.AddDays(1); break; }
        return (TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(startLocal, DateTimeKind.Unspecified), zone), TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(endLocal, DateTimeKind.Unspecified), zone));
    }
    private static TimeZoneInfo GetKampalaZone() { try { return TimeZoneInfo.FindSystemTimeZoneById("Africa/Kampala"); } catch { return TimeZoneInfo.FindSystemTimeZoneById("E. Africa Standard Time"); } }
}
