using ClinicManagement.Api.Data;
using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Features.Medicines;

public record InitialBatchRequest(string BatchNumber, string? Supplier, decimal Quantity, decimal UnitCost, decimal SellingPrice, DateOnly ExpiryDate);
public record SaveMedicineRequest(string Name, string? GenericName, string? Strength, string Form, string Unit, decimal MinimumStockLevel, decimal? DefaultSellingPrice, bool IsActive = true, string? ImageUrl = null, string? ImagePublicId = null, string? ImageMimeType = null, InitialBatchRequest? InitialBatch = null);
public record AddBatchRequest(string? BatchNumber, string? Supplier, decimal Quantity, decimal UnitCost, decimal SellingPrice, DateOnly? ExpiryDate);
public record AdjustStockRequest(Guid BatchId, decimal NewQuantity, string Reason);

public sealed class MedicinesService(ClinicDbContext db)
{
    public async Task<object> SearchAsync(string? search, bool includeInactive, int page, int pageSize, CancellationToken ct)
    {
        var q = db.Medicines.AsNoTracking().AsQueryable();
        if (!includeInactive) q = q.Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(search)) { var s = search.Trim().ToLower(); q = q.Where(x => x.Name.ToLower().Contains(s) || (x.GenericName != null && x.GenericName.ToLower().Contains(s)) || (x.Strength != null && x.Strength.ToLower().Contains(s))); }
        var total = await q.CountAsync(ct);
        var data = await q.OrderBy(x => x.Name).Skip((page - 1) * pageSize).Take(pageSize).Select(x => new { x.Id, x.Name, x.GenericName, x.Strength, x.Form, x.Unit, x.MinimumStockLevel, x.DefaultSellingPrice, x.ImageUrl, x.ImagePublicId, x.ImageMimeType, x.IsActive, totalStock = x.Batches.Where(b => b.IsActive).Sum(b => b.QuantityRemaining), activeBatches = x.Batches.Count(b => b.IsActive) }).ToListAsync(ct);
        return new { data, total, page, pageSize };
    }

    public async Task<object?> FindAsync(Guid id, CancellationToken ct) => await db.Medicines.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Id, x.Name, x.GenericName, x.Strength, x.Form, x.Unit, x.MinimumStockLevel, x.DefaultSellingPrice, x.ImageUrl, x.ImagePublicId, x.ImageMimeType, x.IsActive, totalStock = x.Batches.Where(b => b.IsActive).Sum(b => b.QuantityRemaining), batches = x.Batches.OrderBy(b => b.ExpiryDate).ThenBy(b => b.ReceivedAt).Select(b => new { b.Id, b.BatchNumber, b.Supplier, b.QuantityReceived, b.QuantityRemaining, b.UnitCost, b.SellingPrice, b.ExpiryDate, b.ReceivedAt, b.IsActive }) }).SingleOrDefaultAsync(ct);

    public async Task<object> CreateAsync(SaveMedicineRequest request, Guid userId, CancellationToken ct)
    {
        if (await db.Medicines.AnyAsync(x => x.Name.ToLower() == request.Name.Trim().ToLower() && x.Strength == request.Strength, ct)) throw new InvalidOperationException("This medicine and strength already exist.");
        if (request.InitialBatch is not null) ValidateBatch(request.InitialBatch.BatchNumber, request.InitialBatch.Quantity, request.InitialBatch.UnitCost, request.InitialBatch.SellingPrice, request.InitialBatch.ExpiryDate);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var medicine = new Medicine { Name = request.Name.Trim(), GenericName = request.GenericName?.Trim(), Strength = request.Strength?.Trim(), Form = request.Form.Trim().ToUpperInvariant(), Unit = request.Unit.Trim(), MinimumStockLevel = request.MinimumStockLevel, DefaultSellingPrice = request.DefaultSellingPrice, ImageUrl = request.ImageUrl, ImagePublicId = request.ImagePublicId, ImageMimeType = request.ImageMimeType, IsActive = request.IsActive };
        db.Medicines.Add(medicine);
        if (request.InitialBatch is not null) { var first = request.InitialBatch; var batch = new MedicineBatch { MedicineId = medicine.Id, BatchNumber = first.BatchNumber.Trim(), Supplier = first.Supplier?.Trim(), QuantityReceived = first.Quantity, QuantityRemaining = first.Quantity, UnitCost = first.UnitCost, SellingPrice = first.SellingPrice, ExpiryDate = first.ExpiryDate, ReceivedById = userId }; db.MedicineBatches.Add(batch); db.StockTransactions.Add(new StockTransaction { MedicineId = medicine.Id, MedicineBatchId = batch.Id, Type = MovementType.PURCHASE, QuantityChange = first.Quantity, BalanceAfter = first.Quantity, Reason = "Opening batch created with medicine", PerformedById = userId }); }
        db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "CREATE", EntityType = "Medicine", EntityId = medicine.Id.ToString(), NewValues = System.Text.Json.JsonSerializer.Serialize(request) }); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return new { medicine.Id, medicine.Name, medicine.Strength, medicine.ImageUrl };
    }

    public async Task<bool> UpdateAsync(Guid id, SaveMedicineRequest request, Guid userId, CancellationToken ct)
    {
        var medicine = await db.Medicines.FindAsync([id], ct); if (medicine is null) return false;
        var old = System.Text.Json.JsonSerializer.Serialize(medicine); medicine.Name = request.Name.Trim(); medicine.GenericName = request.GenericName?.Trim(); medicine.Strength = request.Strength?.Trim(); medicine.Form = request.Form.Trim().ToUpperInvariant(); medicine.Unit = request.Unit.Trim(); medicine.MinimumStockLevel = request.MinimumStockLevel; medicine.DefaultSellingPrice = request.DefaultSellingPrice; medicine.ImageUrl = request.ImageUrl; medicine.ImagePublicId = request.ImagePublicId; medicine.ImageMimeType = request.ImageMimeType; medicine.IsActive = request.IsActive; medicine.UpdatedAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "UPDATE", EntityType = "Medicine", EntityId = id.ToString(), OldValues = old, NewValues = System.Text.Json.JsonSerializer.Serialize(request) }); await db.SaveChangesAsync(ct); return true;
    }

    public async Task<object> AddBatchAsync(Guid medicineId, AddBatchRequest request, Guid userId, CancellationToken ct)
    {
        ValidateBatch(request.BatchNumber, request.Quantity, request.UnitCost, request.SellingPrice, request.ExpiryDate);
        if (!await db.Medicines.AnyAsync(x => x.Id == medicineId && x.IsActive, ct)) throw new KeyNotFoundException("Medicine not found or inactive.");
        if (await db.MedicineBatches.AnyAsync(x => x.MedicineId == medicineId && x.BatchNumber == request.BatchNumber!.Trim(), ct)) throw new ArgumentException("This batch number already exists for the selected medicine.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var batch = new MedicineBatch { MedicineId = medicineId, BatchNumber = request.BatchNumber?.Trim(), Supplier = request.Supplier?.Trim(), QuantityReceived = request.Quantity, QuantityRemaining = request.Quantity, UnitCost = request.UnitCost, SellingPrice = request.SellingPrice, ExpiryDate = request.ExpiryDate, ReceivedById = userId };
        db.MedicineBatches.Add(batch); db.StockTransactions.Add(new StockTransaction { MedicineId = medicineId, MedicineBatchId = batch.Id, Type = MovementType.PURCHASE, QuantityChange = request.Quantity, BalanceAfter = request.Quantity, Reason = "Opening batch or stock receipt", PerformedById = userId }); db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "ADD_BATCH", EntityType = "MedicineBatch", EntityId = batch.Id.ToString(), NewValues = System.Text.Json.JsonSerializer.Serialize(request) }); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return batch;
    }

    private static void ValidateBatch(string? batchNumber, decimal quantity, decimal unitCost, decimal sellingPrice, DateOnly? expiryDate)
    {
        if (string.IsNullOrWhiteSpace(batchNumber)) throw new ArgumentException("A batch number is required so every stock lot can be identified.");
        if (quantity <= 0 || unitCost < 0 || sellingPrice < 0) throw new ArgumentException("Quantity must be positive and prices cannot be negative.");
        if (expiryDate is null) throw new ArgumentException("An expiry date is required for medicine stock.");
        if (expiryDate <= DateOnly.FromDateTime(DateTime.UtcNow)) throw new ArgumentException("Expired stock cannot be received.");
    }

    public async Task<bool> AdjustAsync(Guid medicineId, AdjustStockRequest request, Guid userId, CancellationToken ct)
    {
        if (request.NewQuantity < 0 || string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("A non-negative quantity and adjustment reason are required.");
        await using var tx = await db.Database.BeginTransactionAsync(ct); var batch = await db.MedicineBatches.SingleOrDefaultAsync(x => x.Id == request.BatchId && x.MedicineId == medicineId, ct); if (batch is null) return false; var old = batch.QuantityRemaining; batch.QuantityRemaining = request.NewQuantity; batch.UpdatedAt = DateTime.UtcNow; db.StockTransactions.Add(new StockTransaction { MedicineId = medicineId, MedicineBatchId = batch.Id, Type = MovementType.ADJUSTMENT, QuantityChange = request.NewQuantity - old, BalanceAfter = request.NewQuantity, Reason = request.Reason.Trim(), PerformedById = userId }); db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "ADJUST_STOCK", EntityType = "MedicineBatch", EntityId = batch.Id.ToString(), OldValues = old.ToString(), NewValues = request.NewQuantity.ToString() }); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return true;
    }
}
