using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using ClinicManagement.Api.Data;
using ClinicManagement.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Features.Settings;

public sealed record ClinicSettingsResponse(Guid Id, string ClinicName, string ShortName, string? LogoUrl, string? Phone, string? Email, string? Address, string Currency, string Timezone, string? PrimaryContact, string? ReceiptFooter, DateTime CreatedAt, DateTime UpdatedAt);

public sealed class UpdateClinicSettingsRequest
{
    [Required, StringLength(200, MinimumLength = 2)] public string ClinicName { get; init; } = "";
    [Required, StringLength(80, MinimumLength = 2)] public string ShortName { get; init; } = "";
    [Url, StringLength(1000)] public string? LogoUrl { get; init; }
    [Phone, StringLength(50)] public string? Phone { get; init; }
    [EmailAddress, StringLength(254)] public string? Email { get; init; }
    [StringLength(500)] public string? Address { get; init; }
    [Required, RegularExpression("^[A-Za-z]{3}$")] public string Currency { get; init; } = "UGX";
    [Required, StringLength(100)] public string Timezone { get; init; } = "Africa/Kampala";
    [StringLength(200)] public string? PrimaryContact { get; init; }
    [StringLength(1000)] public string? ReceiptFooter { get; init; }
}

[ApiController, Route("api/settings/clinic")]
public sealed class ClinicSettingsController(ClinicDbContext db) : ControllerBase
{
    [AllowAnonymous, HttpGet]
    public async Task<ActionResult<ClinicSettingsResponse>> Get(CancellationToken ct)
    {
        var settings = await db.ClinicSettings.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.CreatedAt).FirstOrDefaultAsync(ct);
        return settings is null ? NotFound(new { message = "Clinic settings have not been initialized." }) : Ok(ToResponse(settings));
    }

    [Authorize(Roles = "ADMIN,DOCTOR"), HttpPut]
    public async Task<ActionResult<ClinicSettingsResponse>> Update(UpdateClinicSettingsRequest request, CancellationToken ct)
    {
        try { _ = TimeZoneInfo.FindSystemTimeZoneById(request.Timezone.Trim()); }
        catch (TimeZoneNotFoundException) { return BadRequest(new { message = "Use a valid IANA timezone such as Africa/Kampala." }); }
        catch (InvalidTimeZoneException) { return BadRequest(new { message = "The selected timezone is invalid." }); }

        var settings = await db.ClinicSettings.Where(x => x.IsActive).OrderBy(x => x.CreatedAt).FirstOrDefaultAsync(ct);
        if (settings is null) { settings = new ClinicSetting(); db.ClinicSettings.Add(settings); }
        var oldValues = System.Text.Json.JsonSerializer.Serialize(ToResponse(settings));
        settings.ClinicName = request.ClinicName.Trim(); settings.ShortName = request.ShortName.Trim(); settings.LogoUrl = Clean(request.LogoUrl);
        settings.Phone = Clean(request.Phone); settings.Email = Clean(request.Email)?.ToLowerInvariant(); settings.Address = Clean(request.Address);
        settings.Currency = request.Currency.Trim().ToUpperInvariant(); settings.Timezone = request.Timezone.Trim(); settings.PrimaryContact = Clean(request.PrimaryContact);
        settings.ReceiptFooter = Clean(request.ReceiptFooter); settings.UpdatedAt = DateTime.UtcNow;
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId);
        db.AuditLogs.Add(new AuditLog { UserId = userId == Guid.Empty ? null : userId, Action = "UPDATE_CLINIC_SETTINGS", EntityType = nameof(ClinicSetting), EntityId = settings.Id.ToString(), OldValues = oldValues, NewValues = System.Text.Json.JsonSerializer.Serialize(request) });
        await db.SaveChangesAsync(ct);
        return Ok(ToResponse(settings));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static ClinicSettingsResponse ToResponse(ClinicSetting x) => new(x.Id, x.ClinicName, x.ShortName, x.LogoUrl, x.Phone, x.Email, x.Address, x.Currency, x.Timezone, x.PrimaryContact, x.ReceiptFooter, x.CreatedAt, x.UpdatedAt);
}
