using System.Security.Claims;
using ClinicManagement.Api.Data;
using ClinicManagement.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Features.Billing;

public record ReceivePaymentRequest(decimal Amount, PaymentMethod Method, string? Reference, DateTime? ReceivedAt,
    string? PaymentProofUrl = null, string? PaymentProofPublicId = null, string? PaymentProofMimeType = null, string? PaymentProofOriginalName = null,
    string? ReceiptDocumentUrl = null, string? ReceiptDocumentPublicId = null, string? ReceiptDocumentMimeType = null, string? ReceiptDocumentOriginalName = null);
public record ReversePaymentRequest(string Reason);

[Authorize(Roles = "ADMIN,DOCTOR,CASHIER"), ApiController, Route("api/billing")]
public sealed class BillingController(ClinicDbContext db) : ControllerBase
{
    private bool UserId(out Guid id) => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);

    [HttpGet("bills")]
    public async Task<object> Bills(string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var q = from b in db.Bills.AsNoTracking()
                join v in db.Visits.AsNoTracking() on b.VisitId equals v.Id
                join p in db.Patients.AsNoTracking() on v.PatientId equals p.Id
                select new { b.Id, b.BillNumber, b.VisitId, b.OriginalAmount, b.AdjustmentAmount, b.TotalAmount, b.PaidAmount, b.Status, b.CreatedAt, balance = b.TotalAmount - b.PaidAmount, patient = new { p.Id, p.PatientNumber, p.FirstName, p.LastName }, v.VisitNumber };
        if (!string.IsNullOrWhiteSpace(search)) { var s = search.Trim().ToLower(); q = q.Where(x => x.BillNumber.ToLower().Contains(s) || x.patient.PatientNumber.ToLower().Contains(s) || x.patient.FirstName.ToLower().Contains(s) || x.patient.LastName.ToLower().Contains(s)); }
        var total = await q.CountAsync(ct); var size = Math.Clamp(pageSize, 1, 100);
        var data = await q.OrderByDescending(x => x.CreatedAt).Skip((Math.Max(page, 1) - 1) * size).Take(size).ToListAsync(ct);
        return new { data, total, page = Math.Max(page, 1), pageSize = size };
    }

    [HttpGet("visits/{visitId:guid}")]
    public async Task<IActionResult> VisitBill(Guid visitId, CancellationToken ct)
    {
        var bill = await db.Bills.AsNoTracking().Where(x => x.VisitId == visitId).Select(x => new { x.Id, x.BillNumber, x.VisitId, x.OriginalAmount, x.AdjustmentAmount, x.TotalAmount, x.PaidAmount, x.Status, x.CreatedAt, x.UpdatedAt, items = x.Items.Select(i => new { i.Id, i.ItemType, i.Description, i.Quantity, i.UnitPrice, i.Amount, i.SourceId }).ToList() }).SingleOrDefaultAsync(ct);
        if (bill is null) return NotFound();
        var payments = await db.Payments.AsNoTracking().Where(x => x.BillId == bill.Id).OrderByDescending(x => x.ReceivedAt).Select(x => new { x.Id, x.ReceiptNumber, x.Amount, x.Method, x.Reference, x.PaymentProofUrl, x.PaymentProofMimeType, x.ReceiptDocumentUrl, x.ReceiptDocumentMimeType, x.ReceivedAt, x.ReceivedById, x.Status }).ToListAsync(ct);
        return Ok(new { bill, payments, balance = bill.TotalAmount - bill.PaidAmount });
    }

    [HttpPost("bills/{billId:guid}/payments")]
    public async Task<IActionResult> Pay(Guid billId, ReceivePaymentRequest input, CancellationToken ct)
    {
        if (!UserId(out var userId)) return Unauthorized();
        if (input.Amount <= 0) return BadRequest(new { message = "Payment amount must be positive." });
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var bill = await db.Bills.SingleOrDefaultAsync(x => x.Id == billId, ct);
        if (bill is null) return NotFound();
        if (bill.Status == "CANCELLED") return Conflict(new { message = "Cancelled bills cannot receive payment." });
        var balance = bill.TotalAmount - bill.PaidAmount;
        var currency = await db.ClinicSettings.AsNoTracking().Where(x => x.IsActive).Select(x => x.Currency).FirstOrDefaultAsync(ct) ?? "UGX";
        if (balance <= 0) return BadRequest(new { message = "This bill has no outstanding balance." });
        if (input.Amount > balance) return BadRequest(new { message = $"Payment cannot exceed the outstanding balance of {currency} {balance:N0}." });
        var payment = new Payment { ReceiptNumber = $"RCT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..7].ToUpperInvariant()}", BillId = bill.Id, Amount = input.Amount, Method = input.Method, Reference = input.Reference?.Trim(), ReceivedAt = (input.ReceivedAt ?? DateTime.UtcNow).ToUniversalTime(), ReceivedById = userId, PaymentProofUrl = input.PaymentProofUrl, PaymentProofPublicId = input.PaymentProofPublicId, PaymentProofMimeType = input.PaymentProofMimeType, PaymentProofOriginalName = input.PaymentProofOriginalName, ReceiptDocumentUrl = input.ReceiptDocumentUrl, ReceiptDocumentPublicId = input.ReceiptDocumentPublicId, ReceiptDocumentMimeType = input.ReceiptDocumentMimeType, ReceiptDocumentOriginalName = input.ReceiptDocumentOriginalName };
        db.Payments.Add(payment); bill.PaidAmount += input.Amount; bill.Status = bill.PaidAmount >= bill.TotalAmount ? "PAID" : "PARTIAL"; bill.UpdatedAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "PAYMENT", EntityType = "Bill", EntityId = bill.Id.ToString(), NewValues = System.Text.Json.JsonSerializer.Serialize(input) });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return Created("", new { payment.Id, payment.ReceiptNumber, payment.Amount, bill.PaidAmount, balance = bill.TotalAmount - bill.PaidAmount, bill.Status });
    }

    [Authorize(Roles = "ADMIN,DOCTOR"), HttpPost("payments/{paymentId:guid}/reverse")]
    public async Task<IActionResult> Reverse(Guid paymentId, ReversePaymentRequest input, CancellationToken ct)
    {
        if (!UserId(out var userId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(input.Reason)) return BadRequest(new { message = "A reversal reason is required." });
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var payment = await db.Payments.SingleOrDefaultAsync(x => x.Id == paymentId, ct);
        if (payment is null) return NotFound();
        if (payment.Status == "REVERSED") return Conflict(new { message = "This payment is already reversed." });
        var bill = payment.BillId is null ? null : await db.Bills.SingleAsync(x => x.Id == payment.BillId, ct);
        payment.Status = "REVERSED"; payment.UpdatedAt = DateTime.UtcNow;
        if (bill is not null) { bill.PaidAmount = Math.Max(0, bill.PaidAmount - payment.Amount); bill.Status = bill.PaidAmount == 0 ? "OPEN" : bill.PaidAmount >= bill.TotalAmount ? "PAID" : "PARTIAL"; bill.UpdatedAt = DateTime.UtcNow; }
        db.AuditLogs.Add(new AuditLog { UserId = userId, Action = "REVERSE_PAYMENT", EntityType = "Payment", EntityId = payment.Id.ToString(), NewValues = input.Reason.Trim() });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return NoContent();
    }
}
