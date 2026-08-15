using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using JuvicClinic.Api.Data;
using JuvicClinic.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace JuvicClinic.Api.Features.Auth;

public record LoginRequest(string Email, string Password);
public record SessionUser(Guid Id, string FirstName, string LastName, string Email, StaffRole Role);
public record LoginResponse(string AccessToken, DateTime ExpiresAt, SessionUser User);

public sealed class AuthService(ClinicDbContext db, IConfiguration config, IPasswordHasher<User> hasher)
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(x => x.Role).SingleOrDefaultAsync(x => x.Email == email && x.IsActive, ct);
        if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed) return null;
        user.LastLoginAt = DateTime.UtcNow; await db.SaveChangesAsync(ct);
        var minutes = config.GetValue("Jwt:ExpiryMinutes", 480); var expires = DateTime.UtcNow.AddMinutes(minutes);
        var claims = new[] { new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Email, user.Email), new Claim(ClaimTypes.Role, user.Role.Name.ToString()) };
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"], claims, expires: expires, signingCredentials: credentials);
        return new(new JwtSecurityTokenHandler().WriteToken(token), expires, new(user.Id, user.FirstName, user.LastName, user.Email, user.Role.Name));
    }
}
