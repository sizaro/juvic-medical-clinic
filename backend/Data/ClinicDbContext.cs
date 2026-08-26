using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Data;

public sealed class ClinicDbContext(DbContextOptions<ClinicDbContext> options) : DbContext(options)
{
    public DbSet<ClinicSetting> ClinicSettings => Set<ClinicSetting>(); public DbSet<Role> Roles => Set<Role>(); public DbSet<User> Users => Set<User>(); public DbSet<Patient> Patients => Set<Patient>(); public DbSet<NextOfKin> NextOfKin => Set<NextOfKin>(); public DbSet<Visit> Visits => Set<Visit>(); public DbSet<Assessment> Assessments => Set<Assessment>(); public DbSet<AssessmentObservation> AssessmentObservations => Set<AssessmentObservation>(); public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>(); public DbSet<VisitDocument> VisitDocuments => Set<VisitDocument>(); public DbSet<Medicine> Medicines => Set<Medicine>(); public DbSet<MedicineBatch> MedicineBatches => Set<MedicineBatch>(); public DbSet<TreatmentPlan> TreatmentPlans => Set<TreatmentPlan>(); public DbSet<TreatmentOrder> TreatmentOrders => Set<TreatmentOrder>(); public DbSet<TreatmentDose> TreatmentDoses => Set<TreatmentDose>(); public DbSet<StockTransaction> StockTransactions => Set<StockTransaction>(); public DbSet<Bill> Bills => Set<Bill>(); public DbSet<BillItem> BillItems => Set<BillItem>(); public DbSet<Payment> Payments => Set<Payment>(); public DbSet<RetailSale> RetailSales => Set<RetailSale>(); public DbSet<RetailSaleItem> RetailSaleItems => Set<RetailSaleItem>(); public DbSet<Expense> Expenses => Set<Expense>(); public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<ClinicSetting>(e =>
        {
            e.ToTable("clinic_settings");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ClinicName).HasColumnName("clinic_name").HasMaxLength(200).IsRequired();
            e.Property(x => x.ShortName).HasColumnName("short_name").HasMaxLength(80).IsRequired();
            e.Property(x => x.LogoUrl).HasColumnName("logo_url").HasMaxLength(1000);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(50);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(254);
            e.Property(x => x.Address).HasColumnName("address").HasMaxLength(500);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).HasDefaultValue("UGX").IsRequired();
            e.Property(x => x.Timezone).HasColumnName("timezone").HasMaxLength(100).HasDefaultValue("Africa/Kampala").IsRequired();
            e.Property(x => x.PrimaryContact).HasColumnName("primary_contact").HasMaxLength(200);
            e.Property(x => x.ReceiptFooter).HasColumnName("receipt_footer").HasMaxLength(1000);
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.IsActive).IsUnique().HasFilter("\"is_active\" = TRUE");
        });
        b.HasPostgresEnum<StaffRole>(); b.HasPostgresEnum<CareType>(); b.HasPostgresEnum<VisitStatus>(); b.HasPostgresEnum<DoseStatus>(); b.HasPostgresEnum<MovementType>(); b.HasPostgresEnum<PaymentMethod>();
        b.Entity<Role>().HasIndex(x => x.Name).IsUnique(); b.Entity<User>().HasIndex(x => x.Email).IsUnique(); b.Entity<Patient>().HasIndex(x => x.PatientNumber).IsUnique(); b.Entity<Patient>().HasIndex(x => x.PrimaryPhone); b.Entity<Patient>().HasIndex(x => new { x.LastName, x.FirstName }); b.Entity<Visit>().HasIndex(x => x.VisitNumber).IsUnique(); b.Entity<Visit>().HasIndex(x => new { x.PatientId, x.StartedAt }); b.Entity<VisitDocument>().HasIndex(x => new { x.VisitId, x.DocumentType }); b.Entity<TreatmentDose>().HasIndex(x => new { x.Status, x.ScheduledAt }); b.Entity<MedicineBatch>().HasIndex(x => new { x.MedicineId, x.ExpiryDate }); b.Entity<StockTransaction>().HasIndex(x => new { x.MedicineId, x.CreatedAt }); b.Entity<Bill>().HasIndex(x => x.BillNumber).IsUnique(); b.Entity<Payment>().HasIndex(x => x.ReceiptNumber).IsUnique(); b.Entity<RetailSale>().HasIndex(x => x.SaleNumber).IsUnique(); b.Entity<RetailSale>().HasIndex(x => x.SoldAt); b.Entity<RetailSaleItem>().HasIndex(x => new { x.MedicineId, x.MedicineBatchId });
        foreach (var type in b.Model.GetEntityTypes()) foreach (var p in type.GetProperties().Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?))) p.SetColumnType("numeric(18,2)");
    }
}
