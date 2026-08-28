using ClinicManagement.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicManagement.Api.Migrations;

[DbContext(typeof(ClinicDbContext))]
[Migration("20260827000100_PatientSafetyAndDischarge")]
public sealed class PatientSafetyAndDischarge : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "Allergies", table: "Patients", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "MedicalConditions", table: "Patients", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "CurrentMedication", table: "Patients", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "DischargeSummary", table: "Visits", type: "text", nullable: true);
        migrationBuilder.AddColumn<Guid>(name: "DischargedById", table: "Visits", type: "uuid", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Allergies", table: "Patients");
        migrationBuilder.DropColumn(name: "MedicalConditions", table: "Patients");
        migrationBuilder.DropColumn(name: "CurrentMedication", table: "Patients");
        migrationBuilder.DropColumn(name: "DischargeSummary", table: "Visits");
        migrationBuilder.DropColumn(name: "DischargedById", table: "Visits");
    }
}
