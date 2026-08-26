using ClinicManagement.Api.Data;
using ClinicManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicManagement.Api.Features.Patients;

public record KinInput(string FirstName, string LastName, string Relationship, string Phone, string? AlternativePhone, string? Address, bool IsPrimary);
public record InitialVisitDocumentInput(string DocumentType, string Title, string FileUrl, string PublicId, string MimeType, string OriginalName, long FileSize);
public record InitialVisitInput(CareType CareType, string Reason, InitialVisitDocumentInput? InitialDocument = null);
public record RegisterPatientRequest(string FirstName, string? MiddleName, string LastName, DateOnly DateOfBirth, string Sex, string PrimaryPhone, string? AlternativePhone, string? Email, string Address, string? Nin, string? Occupation, string? BloodGroup, List<KinInput> NextOfKin, InitialVisitInput? InitialVisit);

public sealed class PatientsService(ClinicDbContext db)
{
    public async Task<object?> FindAsync(Guid id, CancellationToken ct)
    {
        var patient = await db.Patients.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.PatientNumber, x.FirstName, x.MiddleName, x.LastName, x.DateOfBirth, x.Sex,
            x.PrimaryPhone, x.AlternativePhone, x.Email, x.Address, x.Nin, x.Occupation,
            x.BloodGroup, x.IsActive,
            NextOfKin = x.NextOfKin.OrderByDescending(k => k.IsPrimary).Select(k => new
            {
                k.Id, k.FirstName, k.LastName, k.Relationship, k.Phone, k.AlternativePhone,
                k.Address, k.IsPrimary
            }).ToList()
        }).SingleOrDefaultAsync(ct); if (patient is null) return null;
        var visits = await db.Visits.AsNoTracking().Where(x => x.PatientId == id).OrderByDescending(x => x.StartedAt).Select(x => new { x.Id, x.VisitNumber, x.CareType, x.Status, x.Reason, x.StartedAt, x.ClosedAt, assessmentCount = x.Assessments.Count, diagnosisCount = x.Diagnoses.Count, treatmentCount = x.TreatmentPlans.Count }).ToListAsync(ct);
        var current = visits.FirstOrDefault(x => x.Status == VisitStatus.OPEN || x.Status == VisitStatus.ACTIVE);
        object? clinical = null;
        if (current is not null)
        {
            var assessments = await db.Assessments.AsNoTracking().Where(x => x.VisitId == current.Id).OrderByDescending(x => x.RecordedAt).Select(x => new
            {
                x.Id, x.Temperature, x.Systolic, x.Diastolic, x.PulseRate, x.RespiratoryRate,
                x.Weight, x.Height, x.Notes, x.RecordedById, x.RecordedAt,
                Observations = x.Observations.Select(o => new { o.Id, o.Name, o.Value, o.Unit, o.Notes }).ToList()
            }).ToListAsync(ct);
            var diagnoses = await db.Diagnoses.AsNoTracking().Where(x => x.VisitId == current.Id).OrderByDescending(x => x.DiagnosedAt).Select(x => new
            {
                x.Id, x.Description, x.Notes, x.EvidenceUrl, x.EvidenceMimeType, x.EvidenceOriginalName, x.DiagnosedById, x.DiagnosedAt
            }).ToListAsync(ct);
            var plans = await db.TreatmentPlans.AsNoTracking().Where(x => x.VisitId == current.Id).OrderByDescending(x => x.StartsAt).Select(x => new
            {
                x.Id, x.Status, x.StartsAt, x.ExpectedEndAt, x.CompletedAt, x.Instructions, x.CreatedById,
                Orders = x.Orders.Select(o => new
                {
                    o.Id, o.TreatmentName, o.MedicineId, o.PreferredBatchId, o.Route,
                    o.DoseQuantity, o.FrequencyHours, o.NumberOfDoses, o.TotalQuantity,
                    o.LockedUnitPrice, o.TotalPrice, o.Instructions,
                    Doses = o.Doses.OrderBy(d => d.ScheduledAt).Select(d => new
                    {
                        d.Id, d.ScheduledAt, d.Status, d.AdministeredAt, d.AdministeredById,
                        d.MedicineBatchId, d.QuantityUsed, d.Notes
                    }).ToList()
                }).ToList()
            }).ToListAsync(ct);
            var bill = await db.Bills.AsNoTracking().Where(x => x.VisitId == current.Id).Select(x => new
            {
                x.Id, x.BillNumber, x.VisitId, x.OriginalAmount, x.AdjustmentAmount,
                x.TotalAmount, x.PaidAmount, x.Status, x.CreatedAt, x.UpdatedAt,
                Items = x.Items.Select(i => new { i.Id, i.ItemType, i.Description, i.Quantity, i.UnitPrice, i.Amount, i.SourceId }).ToList()
            }).SingleOrDefaultAsync(ct);
            var payments = bill is null ? [] : await db.Payments.AsNoTracking().Where(x => x.BillId == bill.Id).OrderByDescending(x => x.ReceivedAt).Select(x => new
            {
                x.Id, x.ReceiptNumber, x.Amount, x.Method, x.Reference, x.PaymentProofUrl, x.PaymentProofMimeType, x.ReceiptDocumentUrl, x.ReceiptDocumentMimeType, x.ReceivedAt,
                x.ReceivedById, x.Status
            }).ToListAsync(ct);
            var documents = await db.VisitDocuments.AsNoTracking().Where(x => x.VisitId == current.Id).OrderByDescending(x => x.CreatedAt).Select(x => new { x.Id, x.DocumentType, x.Title, x.FileUrl, x.MimeType, x.OriginalName, x.FileSize, x.CreatedAt }).ToListAsync(ct);
            clinical = new { assessments, diagnoses, treatmentPlans = plans, bill, payments, documents };
        }
        return new { patient.Id, patient.PatientNumber, patient.FirstName, patient.MiddleName, patient.LastName, patient.DateOfBirth, patient.Sex, patient.PrimaryPhone, patient.AlternativePhone, patient.Email, patient.Address, patient.Nin, patient.Occupation, patient.BloodGroup, patient.IsActive, patient.NextOfKin, visits, currentVisit = current, clinical };
    }
    public async Task<object> RegisterAsync(RegisterPatientRequest request, Guid userId, CancellationToken ct)
    {
        if (request.NextOfKin.Count == 0) throw new ArgumentException("At least one next of kin is required.");
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var next = await db.Patients.CountAsync(ct) + 1;
        var patient = new Patient { PatientNumber = $"JUV-{next:000000}", FirstName = request.FirstName.Trim(), MiddleName = request.MiddleName?.Trim(), LastName = request.LastName.Trim(), DateOfBirth = request.DateOfBirth, Sex = request.Sex, PrimaryPhone = request.PrimaryPhone.Trim(), AlternativePhone = request.AlternativePhone, Email = request.Email?.Trim().ToLowerInvariant(), Address = request.Address.Trim(), Nin = request.Nin, Occupation = request.Occupation, BloodGroup = request.BloodGroup };
        patient.NextOfKin = request.NextOfKin.Select(x => new NextOfKin { FirstName = x.FirstName.Trim(), LastName = x.LastName.Trim(), Relationship = x.Relationship.Trim(), Phone = x.Phone.Trim(), AlternativePhone = x.AlternativePhone, Address = x.Address, IsPrimary = x.IsPrimary }).ToList();
        db.Patients.Add(patient);
        Visit? visit = null;
        if (request.InitialVisit is not null) { visit = new Visit { VisitNumber = $"VIS-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}", Patient = patient, CareType = request.InitialVisit.CareType, Reason = request.InitialVisit.Reason.Trim(), CreatedById = userId }; db.Visits.Add(visit); if(request.InitialVisit.InitialDocument is not null){var file=request.InitialVisit.InitialDocument;db.VisitDocuments.Add(new VisitDocument{VisitId=visit.Id,DocumentType=file.DocumentType.Trim().ToUpperInvariant(),Title=file.Title.Trim(),FileUrl=file.FileUrl,PublicId=file.PublicId,MimeType=file.MimeType,OriginalName=file.OriginalName,FileSize=file.FileSize,UploadedById=userId});} }
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return new { patient.Id, patient.PatientNumber, visitId = visit?.Id, visitNumber = visit?.VisitNumber, registration = "Complete", assessment = "Pending", tests = "Not yet ordered", diagnosis = "Not recorded", treatment = "Not started" };
    }

    public async Task<object> SearchAsync(string? search, int page, int pageSize, CancellationToken ct)
    {
        var q = db.Patients.AsNoTracking().Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(search)) { var s = search.Trim().ToLower(); q = q.Where(x => x.PatientNumber.ToLower().Contains(s) || x.PrimaryPhone.Contains(s) || x.FirstName.ToLower().Contains(s) || x.LastName.ToLower().Contains(s)); }
        var total = await q.CountAsync(ct); var data = await q.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).Select(x => new { x.Id, x.PatientNumber, x.FirstName, x.MiddleName, x.LastName, x.DateOfBirth, x.Sex, x.PrimaryPhone }).ToListAsync(ct);
        return new { data, total, page, pageSize };
    }
}
