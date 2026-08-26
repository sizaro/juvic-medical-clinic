using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data.Seeding;

public sealed class RolesSeeder(ClinicDbContext db)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        foreach (var roleName in new[] { StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.CASHIER })
            if (!await db.Roles.AnyAsync(x => x.Name == roleName, ct)) db.Roles.Add(new Role { Name = roleName });
        await db.SaveChangesAsync(ct);
    }
}
