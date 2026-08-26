using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicManagement.Api.Features.Uploads;

[Authorize, ApiController, Route("api/uploads")]
public sealed class UploadsController(UploadService service) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string folder = "documents", CancellationToken ct = default)
    {
        try { return Ok(await service.UploadAsync(file, folder, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return StatusCode(503, new { message = ex.Message }); }
    }
}
