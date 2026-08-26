using ClinicManagement.Api.Data;
using ClinicManagement.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Features.Dashboard;

[Authorize, ApiController, Route("api/dashboard")]
public sealed class DashboardController(ClinicDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<object> Get(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date; var tomorrow = today.AddDays(1); var now = DateTime.UtcNow;
        var retail = await db.RetailSales.AsNoTracking().Where(x => x.Status == "COMPLETED" && x.SoldAt >= today && x.SoldAt < tomorrow).GroupBy(_ => 1).Select(g => new { transactions = g.Count(), revenue = g.Sum(x => x.TotalAmount), grossProfit = g.Sum(x => x.TotalAmount - x.TotalCost) }).SingleOrDefaultAsync(ct);
        var recentSales = await db.RetailSales.AsNoTracking().OrderByDescending(x => x.SoldAt).Take(6).Select(x => new { x.Id, x.SaleNumber, x.TotalAmount, x.SoldAt, itemCount = x.Items.Count }).ToListAsync(ct);
        return new { patientsToday = await db.Visits.CountAsync(x => x.StartedAt >= today && x.StartedAt < tomorrow, ct), treatmentsDue = await db.TreatmentDoses.CountAsync(x => x.Status == DoseStatus.SCHEDULED && x.ScheduledAt <= now, ct), currentInpatients = await db.Visits.CountAsync(x => x.CareType == CareType.INPATIENT && (x.Status == VisitStatus.OPEN || x.Status == VisitStatus.ACTIVE), ct), lowStockItems = await db.Medicines.CountAsync(x => x.IsActive && x.Batches.Where(b => b.IsActive).Sum(b => b.QuantityRemaining) <= x.MinimumStockLevel, ct), retailSalesToday = retail?.revenue ?? 0, retailProfitToday = retail?.grossProfit ?? 0, retailTransactionsToday = retail?.transactions ?? 0, recentSales };
    }
}
