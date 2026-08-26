using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data.Seeding;

public sealed class ClinicSettingsSeeder(ClinicDbContext db, IConfiguration config)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await db.ClinicSettings.AnyAsync(ct)) return;
        db.ClinicSettings.Add(new ClinicSetting
        {
            ClinicName = Value("Name", "Medical Clinic"),
            ShortName = Value("ShortName", "Clinic"),
            LogoUrl = Optional("LogoUrl"),
            Phone = Optional("Phone"),
            Email = Optional("Email"),
            Address = Optional("Address"),
            Currency = Value("Currency", "UGX").ToUpperInvariant(),
            Timezone = Value("Timezone", "Africa/Kampala"),
            PrimaryContact = Optional("PrimaryContact"),
            ReceiptFooter = Optional("ReceiptFooter"),
        });
        await db.SaveChangesAsync(ct);
    }

    private string Value(string key, string fallback) => Optional(key) ?? fallback;
    private string? Optional(string key) => string.IsNullOrWhiteSpace(config[$"Clinic:{key}"]) ? null : config[$"Clinic:{key}"]!.Trim();
}
