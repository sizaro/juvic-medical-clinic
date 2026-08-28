using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data;

public sealed class TrialDataResetService(ClinicDbContext db,ILogger<TrialDataResetService> logger)
{
    public async Task ResetAsync(CancellationToken ct=default)
    {
        await using var tx=await db.Database.BeginTransactionAsync(ct);
        await db.Payments.ExecuteDeleteAsync(ct);await db.BillItems.ExecuteDeleteAsync(ct);await db.Bills.ExecuteDeleteAsync(ct);
        await db.TreatmentDoses.ExecuteDeleteAsync(ct);await db.TreatmentOrders.ExecuteDeleteAsync(ct);await db.TreatmentPlans.ExecuteDeleteAsync(ct);
        await db.VisitDocuments.ExecuteDeleteAsync(ct);await db.Diagnoses.ExecuteDeleteAsync(ct);await db.AssessmentObservations.ExecuteDeleteAsync(ct);await db.Assessments.ExecuteDeleteAsync(ct);
        await db.Visits.ExecuteDeleteAsync(ct);await db.NextOfKin.ExecuteDeleteAsync(ct);await db.Patients.ExecuteDeleteAsync(ct);
        await db.RetailSaleItems.ExecuteDeleteAsync(ct);await db.RetailSales.ExecuteDeleteAsync(ct);await db.StockTransactions.ExecuteDeleteAsync(ct);await db.MedicineBatches.ExecuteDeleteAsync(ct);await db.Medicines.ExecuteDeleteAsync(ct);
        await db.Expenses.ExecuteDeleteAsync(ct);await db.AuditLogs.ExecuteDeleteAsync(ct);await tx.CommitAsync(ct);
        logger.LogWarning("Trial business data was reset. Clinic settings, roles and user login accounts were preserved.");
    }
}
