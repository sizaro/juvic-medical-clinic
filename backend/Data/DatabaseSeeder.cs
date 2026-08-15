using JuvicClinic.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JuvicClinic.Api.Data;

public sealed class DatabaseSeeder(ClinicDbContext db, IPasswordHasher<User> hasher, IConfiguration config, IHostEnvironment environment)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        foreach (var roleName in new[] { StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.CASHIER }) if (!await db.Roles.AnyAsync(x => x.Name == roleName, ct)) db.Roles.Add(new Role { Name = roleName });
        await db.SaveChangesAsync(ct);
        var accounts = environment.IsDevelopment()
            ? new[] { (StaffRole.DOCTOR, "Doctor", "Juvic", "doctor@juvic.local", "ChangeMe123!"), (StaffRole.NURSE, "Nurse", "Juvic", "nurse@juvic.local", "ChangeMe123!"), (StaffRole.CASHIER, "Cashier", "Juvic", "cashier@juvic.local", "ChangeMe123!") }
            : ProductionBootstrapAccount();
        foreach (var item in accounts)
        {
            if (await db.Users.AnyAsync(x => x.Email == item.Item4, ct)) continue; var role = await db.Roles.SingleAsync(x => x.Name == item.Item1, ct); var user = new User { RoleId = role.Id, FirstName = item.Item2, LastName = item.Item3, Email = item.Item4 }; user.PasswordHash = hasher.HashPassword(user, item.Item5); db.Users.Add(user);
        }
        if (!await db.Medicines.AnyAsync(ct)) db.Medicines.AddRange(new Medicine { Name = "Paracetamol", GenericName = "Acetaminophen", Strength = "500mg", Form = "TABLET", Unit = "tablet", MinimumStockLevel = 100, DefaultSellingPrice = 500 }, new Medicine { Name = "Amoxicillin", Strength = "500mg", Form = "CAPSULE", Unit = "capsule", MinimumStockLevel = 50, DefaultSellingPrice = 1000 });
        await db.SaveChangesAsync(ct);
    }

    private (StaffRole, string, string, string, string)[] ProductionBootstrapAccount()
    {
        var email = config["BootstrapUser:Email"]?.Trim().ToLowerInvariant();
        var password = config["BootstrapUser:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return [];
        var role = Enum.TryParse<StaffRole>(config["BootstrapUser:Role"], true, out var parsed) ? parsed : StaffRole.DOCTOR;
        return [(role, config["BootstrapUser:FirstName"]?.Trim() ?? "Clinic", config["BootstrapUser:LastName"]?.Trim() ?? "Administrator", email, password)];
    }
}
