using ClinicManagement.Api.Data.Seeding;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data;

public sealed class DatabaseSeeder(ClinicDbContext db, ClinicSettingsSeeder clinicSettings, RolesSeeder roles, UsersSeeder users, ReferenceDataSeeder referenceData)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        await clinicSettings.SeedAsync(ct);
        await roles.SeedAsync(ct);
        await users.SeedAsync(ct);
        await referenceData.SeedAsync(ct);
    }
}
