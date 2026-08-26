using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "clinic_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    clinic_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    short_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    logo_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "UGX"),
                    timezone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "Africa/Kampala"),
                    primary_contact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    receipt_footer = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clinic_settings", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_clinic_settings_is_active",
                table: "clinic_settings",
                column: "is_active",
                unique: true,
                filter: "\"is_active\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "clinic_settings");
        }
    }
}
