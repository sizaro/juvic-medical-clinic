using ClinicManagement.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace ClinicManagement.Api.Features.Auth;

[ApiController, Route("api/auth")]
public sealed class AuthController(AuthService service, ClinicDbContext db) : ControllerBase
{
    [AllowAnonymous, HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await service.LoginAsync(request, ct);
        return result is null ? Unauthorized(new { message = "Invalid email or password." }) : Ok(result);
    }

    [Authorize, HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id)) return Unauthorized();
        var user = await db.Users.AsNoTracking().Include(x => x.Role).Where(x => x.Id == id && x.IsActive).Select(x => new { x.Id, x.FirstName, x.LastName, x.Email, role = x.Role.Name }).SingleOrDefaultAsync(ct);
        return user is null ? Unauthorized() : Ok(user);
    }
}
