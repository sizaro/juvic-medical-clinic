using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JuvicClinic.Api.Features.RetailSales;

[Authorize(Roles = "ADMIN,DOCTOR,NURSE,CASHIER"), ApiController, Route("api/retail-sales")]
public sealed class RetailSalesController(RetailSalesService service) : ControllerBase
{
    private bool UserId(out Guid id) => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);
    [HttpGet] public Task<object> List(string? search, DateTime? from, DateTime? to, int page = 1, int pageSize = 20, CancellationToken ct = default) => service.ListAsync(search, from, to, page, pageSize, ct);
    [HttpGet("{id:guid}")] public async Task<IActionResult> Find(Guid id, CancellationToken ct) { var sale = await service.FindAsync(id, ct); return sale is null ? NotFound() : Ok(sale); }
    [HttpGet("reports/summary")] public Task<object> Summary(string period = "today", DateTime? from = null, DateTime? to = null, CancellationToken ct = default) => service.SummaryAsync(period, from, to, ct);
    [HttpPost] public async Task<IActionResult> Create(CreateRetailSaleRequest input, CancellationToken ct) { if (!UserId(out var userId)) return Unauthorized(); try { return Created("", await service.CreateAsync(input, userId, ct)); } catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); } }
}
