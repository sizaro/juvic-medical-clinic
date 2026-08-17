using System.Text;
using System.Text.Json.Serialization;
using JuvicClinic.Api.Data;
using JuvicClinic.Api.Domain;
using JuvicClinic.Api.Features.Auth;
using JuvicClinic.Api.Features.Patients;
using JuvicClinic.Api.Features.Medicines;
using JuvicClinic.Api.Features.Treatments;
using JuvicClinic.Api.Features.Uploads;
using JuvicClinic.Api.Features.RetailSales;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var configuredConnection = builder.Configuration.GetConnectionString("Default") ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");
var connection = NormalizePostgresConnectionString(configuredConnection);
var allowedOrigins = ResolveAllowedOrigins(builder.Configuration);
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is required.");
if (jwtKey.Length < 32) throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
builder.Services.AddDbContext<ClinicDbContext>(o => o.UseNpgsql(connection));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<AuthService>(); builder.Services.AddScoped<PatientsService>(); builder.Services.AddScoped<MedicinesService>(); builder.Services.AddScoped<TreatmentsService>(); builder.Services.AddScoped<RetailSalesService>(); builder.Services.AddScoped<DatabaseSeeder>(); builder.Services.AddHttpClient<UploadService>();
builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter())); builder.Services.AddHealthChecks();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters { ValidateIssuer = true, ValidIssuer = builder.Configuration["Jwt:Issuer"], ValidateAudience = true, ValidAudience = builder.Configuration["Jwt:Audience"], ValidateLifetime = true, ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), ClockSkew = TimeSpan.FromMinutes(1) });
builder.Services.AddAuthorization(); builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o => { o.SwaggerDoc("v1", new OpenApiInfo { Title = "JUVIC Clinic API", Version = "v1" }); o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { In = ParameterLocation.Header, Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" }); o.AddSecurityRequirement(new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [] }); });
var app = builder.Build();
app.Logger.LogInformation("Allowed CORS origins: {Origins}", string.Join(", ", allowedOrigins));
app.UseExceptionHandler("/error"); if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseCors(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); app.MapHealthChecks("/health"); app.Map("/error", () => Results.Problem("The request could not be completed."));
await using (var scope = app.Services.CreateAsyncScope())
{
    if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Database:SeedOnStartup"))
        await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();
    else if (builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
        await scope.ServiceProvider.GetRequiredService<ClinicDbContext>().Database.MigrateAsync();
}
app.Run();

static string[] ResolveAllowedOrigins(IConfiguration configuration)
{
    var configured = configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
    var frontendOrigins = configuration["FRONTEND_ORIGIN"]?
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];

    var origins = configured
        .Concat(frontendOrigins)
        .Select(origin => origin.Trim().TrimEnd('/'))
        .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                         (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    return origins.Length > 0 ? origins : ["http://localhost:5173"];
}

static string NormalizePostgresConnectionString(string configured)
{
    var value = configured.Trim().Trim('"', '\'');

    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
        !string.Equals(uri.Scheme, "postgres", StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(uri.Scheme, "postgresql", StringComparison.OrdinalIgnoreCase))
        return value;

    var userInfo = uri.UserInfo.Split(':', 2);
    if (userInfo.Length != 2)
        throw new InvalidOperationException("The PostgreSQL URL must include a username and password.");

    return new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = Uri.UnescapeDataString(userInfo[1]),
        Pooling = true,
        Timeout = 15,
        CommandTimeout = 30,
    }.ConnectionString;
}
