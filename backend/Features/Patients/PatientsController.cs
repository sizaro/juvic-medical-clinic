using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JuvicClinic.Api.Features.Patients;

[Authorize(Roles = "ADMIN,DOCTOR,NURSE,CASHIER"), ApiController, Route("api/patients")]
public sealed class PatientsController(PatientsService service) : ControllerBase
{
    [HttpGet] public Task<object> Search([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) => service.SearchAsync(search, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
    [HttpGet("{id:guid}")] public async Task<IActionResult> Find(Guid id, CancellationToken ct) { var patient = await service.FindAsync(id, ct); return patient is null ? NotFound() : Ok(patient); }
    [HttpPost] public async Task<IActionResult> Register(RegisterPatientRequest request, CancellationToken ct) { if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized(); try { return Created("", await service.RegisterAsync(request, userId, ct)); } catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); } }
}
