using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class InventoryRetailSalesAndProofDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentProofMimeType",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProofOriginalName",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProofPublicId",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProofUrl",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptDocumentMimeType",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptDocumentOriginalName",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptDocumentPublicId",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptDocumentUrl",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageMimeType",
                table: "Medicines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImagePublicId",
                table: "Medicines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Medicines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceMimeType",
                table: "Diagnoses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceOriginalName",
                table: "Diagnoses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidencePublicId",
                table: "Diagnoses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceUrl",
                table: "Diagnoses",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RetailSales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleNumber = table.Column<string>(type: "text", nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    AmountReceived = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                    PaymentReference = table.Column<string>(type: "text", nullable: true),
                    CustomerName = table.Column<string>(type: "text", nullable: true),
                    CustomerPhone = table.Column<string>(type: "text", nullable: true),
                    PaymentProofUrl = table.Column<string>(type: "text", nullable: true),
                    PaymentProofPublicId = table.Column<string>(type: "text", nullable: true),
                    ReceiptDocumentUrl = table.Column<string>(type: "text", nullable: true),
                    ReceiptDocumentPublicId = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    SoldAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SoldById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetailSales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VisitDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentType = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    FileUrl = table.Column<string>(type: "text", nullable: false),
                    PublicId = table.Column<string>(type: "text", nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: false),
                    OriginalName = table.Column<string>(type: "text", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VisitDocuments_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetailSaleItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RetailSaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    MedicineId = table.Column<Guid>(type: "uuid", nullable: false),
                    MedicineBatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetailSaleItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetailSaleItems_MedicineBatches_MedicineBatchId",
                        column: x => x.MedicineBatchId,
                        principalTable: "MedicineBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetailSaleItems_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetailSaleItems_RetailSales_RetailSaleId",
                        column: x => x.RetailSaleId,
                        principalTable: "RetailSales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetailSaleItems_MedicineBatchId",
                table: "RetailSaleItems",
                column: "MedicineBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_RetailSaleItems_MedicineId_MedicineBatchId",
                table: "RetailSaleItems",
                columns: new[] { "MedicineId", "MedicineBatchId" });

            migrationBuilder.CreateIndex(
                name: "IX_RetailSaleItems_RetailSaleId",
                table: "RetailSaleItems",
                column: "RetailSaleId");

            migrationBuilder.CreateIndex(
                name: "IX_RetailSales_SaleNumber",
                table: "RetailSales",
                column: "SaleNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetailSales_SoldAt",
                table: "RetailSales",
                column: "SoldAt");

            migrationBuilder.CreateIndex(
                name: "IX_VisitDocuments_VisitId_DocumentType",
                table: "VisitDocuments",
                columns: new[] { "VisitId", "DocumentType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetailSaleItems");

            migrationBuilder.DropTable(
                name: "VisitDocuments");

            migrationBuilder.DropTable(
                name: "RetailSales");

            migrationBuilder.DropColumn(
                name: "PaymentProofMimeType",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentProofOriginalName",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentProofPublicId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentProofUrl",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ReceiptDocumentMimeType",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ReceiptDocumentOriginalName",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ReceiptDocumentPublicId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ReceiptDocumentUrl",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ImageMimeType",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "ImagePublicId",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "EvidenceMimeType",
                table: "Diagnoses");

            migrationBuilder.DropColumn(
                name: "EvidenceOriginalName",
                table: "Diagnoses");

            migrationBuilder.DropColumn(
                name: "EvidencePublicId",
                table: "Diagnoses");

            migrationBuilder.DropColumn(
                name: "EvidenceUrl",
                table: "Diagnoses");
        }
    }
}
