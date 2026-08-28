using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data.Seeding;

public sealed class ReferenceDataSeeder(ClinicDbContext db,IConfiguration configuration)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        if(!configuration.GetValue<bool>("Seed:IncludeDemoMedicines"))return;
        if (!await db.Medicines.AnyAsync(ct))
            db.Medicines.AddRange(
                new Medicine { Name = "Paracetamol", GenericName = "Acetaminophen", Strength = "500mg", Form = "TABLET", Unit = "tablet", MinimumStockLevel = 100, DefaultSellingPrice = 500 },
                new Medicine { Name = "Amoxicillin", Strength = "500mg", Form = "CAPSULE", Unit = "capsule", MinimumStockLevel = 50, DefaultSellingPrice = 1000 });
        await db.SaveChangesAsync(ct);
    }
}
