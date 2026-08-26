using ClinicManagement.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data.Seeding;

public sealed class UsersSeeder(ClinicDbContext db, IPasswordHasher<User> hasher, IConfiguration config, IHostEnvironment environment)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        var accounts = environment.IsDevelopment() ? DevelopmentAccounts() : ProductionBootstrapAccounts();
        var pendingEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var account in accounts)
        {
            var email = account.Email.Trim().ToLowerInvariant();
            if (!pendingEmails.Add(email)) continue;
            if (await db.Users.AnyAsync(x => x.Email == email, ct)) continue;
            var role = await db.Roles.SingleAsync(x => x.Name == account.Role, ct);
            var user = new User { RoleId = role.Id, FirstName = account.FirstName, LastName = account.LastName, Email = email };
            user.PasswordHash = hasher.HashPassword(user, account.Password);
            db.Users.Add(user);
        }
        await db.SaveChangesAsync(ct);
    }

    private static Account[] DevelopmentAccounts() =>
    [
        new(StaffRole.DOCTOR, "Clinic", "Doctor", "doctor@clinic.local", "ChangeMe123!"),
        new(StaffRole.NURSE, "Clinic", "Nurse", "nurse@clinic.local", "ChangeMe123!"),
        new(StaffRole.CASHIER, "Clinic", "Cashier", "cashier@clinic.local", "ChangeMe123!"),
    ];

    private Account[] ProductionBootstrapAccounts()
    {
        var accounts = new List<Account>();
        AddConfigured(accounts, StaffRole.DOCTOR, "Doctor");
        AddConfigured(accounts, StaffRole.NURSE, "Nurse");
        AddConfigured(accounts, StaffRole.CASHIER, "Cashier");

        // Retain the original single-account configuration for existing deployments.
        var email = config["BootstrapUser:Email"]?.Trim().ToLowerInvariant();
        var password = config["BootstrapUser:Password"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            var role = Enum.TryParse<StaffRole>(config["BootstrapUser:Role"], true, out var parsed) ? parsed : StaffRole.DOCTOR;
            accounts.Add(new(role, config["BootstrapUser:FirstName"]?.Trim() ?? "Clinic", config["BootstrapUser:LastName"]?.Trim() ?? "Administrator", email, password));
        }
        return [.. accounts];
    }

    private void AddConfigured(List<Account> accounts, StaffRole role, string section)
    {
        var prefix = $"BootstrapUsers:{section}";
        var email = config[$"{prefix}:Email"]?.Trim().ToLowerInvariant();
        var password = config[$"{prefix}:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;
        accounts.Add(new(role, config[$"{prefix}:FirstName"]?.Trim() ?? "Clinic", config[$"{prefix}:LastName"]?.Trim() ?? section, email, password));
    }

    private sealed record Account(StaffRole Role, string FirstName, string LastName, string Email, string Password);
}
