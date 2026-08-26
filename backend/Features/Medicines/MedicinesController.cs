using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicManagement.Api.Features.Medicines;

[Authorize, ApiController, Route("api/medicines")]
public sealed class MedicinesController(MedicinesService service) : ControllerBase
{
    private bool UserId(out Guid id) => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);
    [HttpGet] public Task<object> Search(string? search, bool includeInactive = false, int page = 1, int pageSize = 20, CancellationToken ct = default) => service.SearchAsync(search, includeInactive, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
    [HttpGet("{id:guid}")] public async Task<IActionResult> Find(Guid id, CancellationToken ct) { var item = await service.FindAsync(id, ct); return item is null ? NotFound() : Ok(item); }
    [Authorize(Roles = "ADMIN,DOCTOR"), HttpPost] public async Task<IActionResult> Create(SaveMedicineRequest request, CancellationToken ct) { if (!UserId(out var id)) return Unauthorized(); try { return Created("", await service.CreateAsync(request, id, ct)); } catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); } }
    [Authorize(Roles = "ADMIN,DOCTOR"), HttpPatch("{id:guid}")] public async Task<IActionResult> Update(Guid id, SaveMedicineRequest request, CancellationToken ct) { if (!UserId(out var userId)) return Unauthorized(); return await service.UpdateAsync(id, request, userId, ct) ? NoContent() : NotFound(); }
    [Authorize(Roles = "ADMIN,DOCTOR"), HttpPost("{id:guid}/batches")] public async Task<IActionResult> AddBatch(Guid id, AddBatchRequest request, CancellationToken ct) { if (!UserId(out var userId)) return Unauthorized(); try { return Created("", await service.AddBatchAsync(id, request, userId, ct)); } catch (Exception ex) when (ex is ArgumentException or KeyNotFoundException) { return BadRequest(new { message = ex.Message }); } }
    [Authorize(Roles = "ADMIN,DOCTOR"), HttpPost("{id:guid}/adjust-stock")] public async Task<IActionResult> Adjust(Guid id, AdjustStockRequest request, CancellationToken ct) { if (!UserId(out var userId)) return Unauthorized(); try { return await service.AdjustAsync(id, request, userId, ct) ? NoContent() : NotFound(); } catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); } }
}
