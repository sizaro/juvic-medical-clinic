import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import DocumentUploader from '../../shared/components/DocumentUploader';
import { api } from '../../shared/services/api';
import type { UploadedAsset } from '../../shared/services/uploadService';
import { formatClinicMoney } from '../settings/clinicSettings';

const money = (value = 0) => formatClinicMoney(value);
type OpenForm = 'assessment' | 'diagnosis' | 'treatment' | 'document' | null;

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OpenForm>(null);
  const [editingAssessment, setEditingAssessment] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const patient = useQuery({ queryKey: ['patient', id], queryFn: async () => (await api.get(`/patients/${id}`)).data });
  const medicines = useQuery({ queryKey: ['medicines', 'treatment'], queryFn: async () => (await api.get('/medicines', { params: { pageSize: 100, inStockOnly: true } })).data.data });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['patient', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['bills'] });
    queryClient.invalidateQueries({ queryKey: ['due-treatments'] });
  };
  const closeForm = () => { setForm(null); setEditingAssessment(null); setEditingPlan(null); };
  const current = patient.data?.currentVisit;
  const clinical = patient.data?.clinical;

  return <div className="space-y-5">
    <header className="flex items-center gap-3">
      <button onClick={() => navigate('/patients')} className="rounded-xl border bg-white p-2"><ArrowLeft/></button>
      <div>{patient.isLoading ? <h1 className="text-2xl font-bold">Loading patient…</h1> : <><p className="text-sm font-semibold text-brand-700">{patient.data?.patientNumber}</p><h1 className="text-3xl font-bold">{patient.data?.firstName} {patient.data?.middleName} {patient.data?.lastName}</h1><p className="text-slate-500">{current ? `${current.careType} · ${current.visitNumber}` : 'No active visit'}</p></>}</div>
    </header>

    {patient.isError && <div className="card text-red-600">Patient information could not be loaded.</div>}
    {patient.data && <>
      <section className="grid gap-4 md:grid-cols-3">
        <Info title="Patient information" rows={[["Phone", patient.data.primaryPhone], ["Sex", patient.data.sex], ["Date of birth", patient.data.dateOfBirth], ["Address", patient.data.address], ["Blood group", patient.data.bloodGroup || 'Not recorded']]}/>
        <Info title="Primary next of kin" rows={patient.data.nextOfKin.slice(0, 1).map((kin: any) => ['Contact', `${kin.firstName} ${kin.lastName} · ${kin.relationship} · ${kin.phone}`])}/>
        <Info title="Clinical status" rows={[["Assessment", clinical?.assessments?.length ? 'Recorded' : 'Pending'], ["Diagnosis", clinical?.diagnoses?.length ? 'Recorded' : 'Not recorded'], ["Treatment", clinical?.treatmentPlans?.length ? 'Active' : 'Not started'], ["Bill", clinical?.bill?.status || 'Not created']]}/>
      </section>

      {current ? <>
        <div className="flex flex-wrap gap-2">
          <Action onClick={() => { setEditingAssessment(null); setForm('assessment'); }}>Record assessment</Action>
          <Action onClick={() => setForm('diagnosis')}>Add diagnosis/test proof</Action>
          <Action onClick={() => { setEditingPlan(null); setForm('treatment'); }}>Create treatment</Action>
          <Action onClick={() => setForm('document')}>Upload medical form</Action>
          {clinical?.bill && <Link className="btn-primary" to="/billing">Open proof-aware billing</Link>}
        </div>

        {form === 'assessment' && <AssessmentForm visitId={current.id} assessment={editingAssessment} close={closeForm} done={refresh}/>}
        {form === 'diagnosis' && <DiagnosisForm visitId={current.id} close={closeForm} done={refresh}/>}
        {form === 'treatment' && <TreatmentForm visitId={current.id} plan={editingPlan} medicines={medicines.data ?? []} close={closeForm} done={refresh}/>}
        {form === 'document' && <ClinicalDocumentForm visitId={current.id} close={closeForm} done={refresh}/>}

        <section className="grid gap-5 xl:grid-cols-2">
          <Panel title="Assessments">{clinical?.assessments?.length ? clinical.assessments.map((assessment: any) => <div key={assessment.id} className="border-b py-3 text-sm"><div className="flex items-center justify-between gap-3"><strong>{new Date(assessment.recordedAt).toLocaleString()}</strong><button className="rounded-lg border p-2 text-brand-700 hover:bg-brand-50" title="Correct assessment" onClick={() => { setEditingAssessment(assessment); setForm('assessment'); }}><Pencil size={15}/></button></div><p>Temperature: {assessment.temperature ?? '—'} °C · BP: {assessment.systolic ?? '—'}/{assessment.diastolic ?? '—'} · Pulse: {assessment.pulseRate ?? '—'}</p><p className="text-slate-500">{assessment.notes}</p></div>) : <Empty>Assessment pending.</Empty>}</Panel>

          <Panel title="Diagnoses and test proof">{clinical?.diagnoses?.length ? clinical.diagnoses.map((diagnosis: any) => <div key={diagnosis.id} className="border-b py-3"><strong>{diagnosis.description}</strong><p className="text-sm text-slate-500">{diagnosis.notes || 'No notes'} · {new Date(diagnosis.diagnosedAt).toLocaleString()}</p>{diagnosis.evidenceUrl && <a href={diagnosis.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">Open diagnosis/test evidence</a>}</div>) : <Empty>Diagnosis not recorded.</Empty>}</Panel>

          <Panel title="Treatment schedule">{clinical?.treatmentPlans?.length ? clinical.treatmentPlans.map((plan: any) => {
            const editable = plan.orders.every((order: any) => order.doses.every((dose: any) => dose.status === 'SCHEDULED'));
            return <article key={plan.id} className="mb-4 rounded-2xl border bg-slate-50/60 p-4 last:mb-0"><div className="mb-3 flex items-start justify-between gap-3"><div><strong>Treatment plan</strong><p className="text-xs text-slate-500">Starts {new Date(plan.startsAt).toLocaleString()} · {plan.orders.length} item{plan.orders.length === 1 ? '' : 's'}</p></div>{editable && <button className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => { setEditingPlan(plan); setForm('treatment'); }}><Pencil size={14}/>Correct</button>}</div>{plan.orders.map((order: any) => <div key={order.id} className="border-t py-3 first:border-t-0"><div className="flex justify-between gap-3"><strong>{order.treatmentName}</strong><span>{money(order.totalPrice)}</span></div><p className="text-sm text-slate-500">{order.doseQuantity} per dose · {order.numberOfDoses} doses · every {order.frequencyHours || 0} hours</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{order.doses.map((dose: any) => <span key={dose.id} className={`rounded-lg px-2 py-1.5 text-xs ${dose.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700' : dose.status === 'MISSED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{new Date(dose.scheduledAt).toLocaleString()} · <strong>{dose.status}</strong></span>)}</div></div>)}</article>;
          }) : <Empty>Treatment not started.</Empty>}</Panel>

          <Panel title="Clinical documents">{clinical?.documents?.length ? clinical.documents.map((document: any) => <a className="mb-2 block rounded-xl border p-3 hover:bg-slate-50" key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer"><strong>{document.title}</strong><p className="text-xs text-slate-500">{document.documentType} · {document.originalName}</p></a>) : <Empty>No medical forms or test documents uploaded.</Empty>}</Panel>

          <Panel title="Billing and payments">{clinical?.bill ? <><div className="grid grid-cols-3 gap-2 text-center"><Summary label="Total" value={money(clinical.bill.totalAmount)}/><Summary label="Paid" value={money(clinical.bill.paidAmount)}/><Summary label="Balance" value={money(clinical.bill.totalAmount - clinical.bill.paidAmount)}/></div><div className="mt-3 divide-y rounded-xl border">{clinical.bill.items?.map((item: any) => <div key={item.id} className="flex justify-between gap-3 p-3 text-sm"><span>{item.description} × {item.quantity}</span><strong>{money(item.amount)}</strong></div>)}</div>{clinical.payments.map((payment: any) => <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm" key={payment.id}><strong>{payment.receiptNumber} · {money(payment.amount)} · {payment.status}</strong><div className="mt-1 flex gap-3">{payment.paymentProofUrl && <a className="underline" href={payment.paymentProofUrl} target="_blank" rel="noreferrer">Payment proof</a>}{payment.receiptDocumentUrl && <a className="underline" href={payment.receiptDocumentUrl} target="_blank" rel="noreferrer">Receipt copy</a>}</div></div>)}</> : <Empty>No bill yet. Confirming a treatment creates the initial itemized bill.</Empty>}</Panel>
        </section>
      </> : <div className="card">This patient has no active visit.</div>}
    </>}
  </div>;
}

function AssessmentForm({ visitId, assessment, close, done }: { visitId: string; assessment?: any; close: () => void; done: () => void }) {
  const firstObservation = assessment?.observations?.[0] ?? assessment?.Observations?.[0];
  const { register, handleSubmit } = useForm<any>({ defaultValues: assessment ? { ...assessment, otherName: firstObservation?.name, otherValue: firstObservation?.value, otherUnit: firstObservation?.unit } : {} });
  const mutation = useMutation({ mutationFn: (value: any) => api.request({ method: assessment ? 'PUT' : 'POST', url: assessment ? `/clinical/assessments/${assessment.id}` : `/clinical/visits/${visitId}/assessments`, data: { ...value, temperature: num(value.temperature), systolic: num(value.systolic), diastolic: num(value.diastolic), pulseRate: num(value.pulseRate), respiratoryRate: num(value.respiratoryRate), weight: num(value.weight), height: num(value.height), observations: value.otherName && value.otherValue ? [{ name: value.otherName, value: value.otherValue, unit: value.otherUnit }] : [] } }), onSuccess: () => { toast.success(assessment ? 'Assessment corrected and audited.' : 'Assessment recorded.'); done(); close(); }, onError: (error: any) => toast.error(error.response?.data?.message ?? 'Assessment could not be saved.') });
  return <FormBox title={assessment ? 'Correct assessment' : 'Record assessment'} submit={handleSubmit(value => mutation.mutate(value))} close={close} busy={mutation.isPending}><div className="grid gap-3 sm:grid-cols-3">{['temperature', 'systolic', 'diastolic', 'pulseRate', 'respiratoryRate', 'weight', 'height'].map(field => <label className="text-sm capitalize" key={field}>{field.replace(/([A-Z])/g, ' $1')}<input className="input mt-1" type="number" step="0.01" {...register(field)}/></label>)}</div><textarea className="input mt-3" placeholder="General notes" {...register('notes')}/><div className="mt-3 grid gap-3 sm:grid-cols-3"><input className="input" placeholder="Other observation" {...register('otherName')}/><input className="input" placeholder="Value" {...register('otherValue')}/><input className="input" placeholder="Unit" {...register('otherUnit')}/></div></FormBox>;
}

function TreatmentForm({ visitId, plan, medicines, close, done }: { visitId: string; plan?: any; medicines: any[]; close: () => void; done: () => void }) {
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<any>({ defaultValues: { startsAt: toLocalInput(plan?.startsAt), planInstructions: plan?.instructions ?? '', safetyAcknowledged: false, orders: plan?.orders?.map((order: any) => ({ medicineId: order.medicineId ?? '', route: order.route ?? '', doseQuantity: order.doseQuantity, frequencyHours: order.frequencyHours ?? 0, numberOfDoses: order.numberOfDoses, instructions: order.instructions ?? '' })) ?? [{ medicineId: '', route: '', doseQuantity: 1, frequencyHours: 8, numberOfDoses: 1, instructions: '' }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'orders' });
  const watchedOrders = watch('orders') ?? [];
  const estimatedTotal = watchedOrders.reduce((sum: number, order: any) => { const medicine = medicines.find(item => item.id === order.medicineId); return sum + Number(medicine?.defaultSellingPrice ?? 0) * Number(order.doseQuantity || 0) * Number(order.numberOfDoses || 0); }, 0);
  const mutation = useMutation({ mutationFn: (value: any) => api.request({ method: plan ? 'PUT' : 'POST', url: plan ? `/treatments/plans/${plan.id}` : `/treatments/visits/${visitId}/plans`, data: { startsAt: new Date(value.startsAt).toISOString(), instructions: value.planInstructions, safetyAcknowledged: value.safetyAcknowledged, orders: value.orders.map((order: any) => { const medicine = medicines.find(item => item.id === order.medicineId); return { treatmentName: [medicine?.name, medicine?.strength].filter(Boolean).join(' '), medicineId: order.medicineId, preferredBatchId: null, route: order.route, doseQuantity: Number(order.doseQuantity), frequencyHours: Number(order.frequencyHours), numberOfDoses: Number(order.numberOfDoses), procedureUnitPrice: null, instructions: order.instructions }; }) } }), onSuccess: response => { const result = response.data; toast.success(`${plan ? 'Treatment corrected' : 'Treatment created'}. Initial bill ${result.billNumber}: ${money(result.totalAmount)}, balance ${money(result.balance)}.`); done(); close(); }, onError: (error: any) => toast.error(error.response?.data?.message ?? 'Treatment could not be saved.') });
  return <FormBox title={plan ? 'Correct treatment and billing' : 'Create treatment and initial bill'} submit={handleSubmit(value => mutation.mutate(value))} close={close} busy={mutation.isPending}>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Treatment starts at<input className="input mt-1" type="datetime-local" {...register('startsAt', { required: true })}/></label><label className="text-sm sm:col-span-2">Overall treatment instructions<textarea className="input mt-1" {...register('planInstructions')}/></label></div>
    <div className="mt-5 space-y-4">{fields.map((field, index) => <section key={field.id} className="rounded-2xl border bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Medicine or clinical supply {index + 1}</h3>{fields.length > 1 && <button type="button" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => remove(index)}><Trash2 size={17}/></button>}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm sm:col-span-2">Inventory item<select className="input mt-1" {...register(`orders.${index}.medicineId`, { required: 'Select a medicine or clinical supply' })}><option value="">Select medicine, IV fluid, syringe, or supply</option>{medicines.map(medicine => <option key={medicine.id} value={medicine.id}>{medicine.name} {medicine.strength} · stock {medicine.totalStock} · {money(medicine.defaultSellingPrice)} each</option>)}</select><span className="text-xs text-red-600">{(errors as any).orders?.[index]?.medicineId?.message}</span></label><label className="text-sm">Quantity per dose<input className="input mt-1" type="number" min="0.01" step="0.01" {...register(`orders.${index}.doseQuantity`, { required: true, valueAsNumber: true, min: 0.01 })}/></label><label className="text-sm">Number of doses<input className="input mt-1" type="number" min="1" {...register(`orders.${index}.numberOfDoses`, { required: true, valueAsNumber: true, min: 1 })}/></label><label className="text-sm">Repeat every hours<input className="input mt-1" type="number" min="0" {...register(`orders.${index}.frequencyHours`, { required: true, valueAsNumber: true, min: 0 })}/></label><label className="text-sm">Route / method<input className="input mt-1" placeholder="Oral, IV, IM…" {...register(`orders.${index}.route`)}/></label><label className="text-sm sm:col-span-2">Item instructions<input className="input mt-1" {...register(`orders.${index}.instructions`)}/></label></div></section>)}</div>
    <button type="button" className="mt-3 flex items-center gap-2 rounded-xl border border-brand-200 px-4 py-2.5 font-semibold text-brand-700 hover:bg-brand-50" onClick={() => append({ medicineId: '', route: '', doseQuantity: 1, frequencyHours: 8, numberOfDoses: 1, instructions: '' })}><Plus size={17}/>Add another medicine or supply</button>
    <div className="mt-4 rounded-xl bg-brand-50 p-4"><div className="flex justify-between gap-3"><span className="font-semibold">Estimated initial bill</span><strong>{money(estimatedTotal)}</strong></div><p className="mt-1 text-xs text-slate-500">The backend confirms the actual locked batch prices. Stock is deducted dose-by-dose when medicine is given, while payments reduce the bill balance.</p></div>
    <label className="mt-4 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" {...register('safetyAcknowledged', { required: true })}/><span>I reviewed the patient’s blood group, allergies, conditions, and current medicines before prescribing.</span></label>
  </FormBox>;
}

function DiagnosisForm({ visitId, close, done }: { visitId: string; close: () => void; done: () => void }) { const [evidence, setEvidence] = useState<UploadedAsset | null>(null); const { register, handleSubmit } = useForm<any>(); const mutation = useMutation({ mutationFn: (value: any) => api.post(`/clinical/visits/${visitId}/diagnoses`, { ...value, evidenceUrl: evidence?.url, evidencePublicId: evidence?.publicId, evidenceMimeType: evidence?.mimeType, evidenceOriginalName: evidence?.originalName }), onSuccess: () => { toast.success('Diagnosis and evidence recorded.'); done(); close(); }, onError: () => toast.error('Diagnosis could not be recorded.') }); return <FormBox title="Add diagnosis or test result" submit={handleSubmit(value => mutation.mutate(value))} close={close} busy={mutation.isPending}><input className="input" placeholder="Clinical diagnosis" {...register('description', { required: true })}/><textarea className="input my-3" placeholder="Notes" {...register('notes')}/><DocumentUploader label="Diagnosis form or test result" folder="diagnosis-evidence" value={evidence} onChange={setEvidence}/></FormBox>; }
function ClinicalDocumentForm({ visitId, close, done }: { visitId: string; close: () => void; done: () => void }) { const [file, setFile] = useState<UploadedAsset | null>(null); const { register, handleSubmit } = useForm<any>({ defaultValues: { documentType: 'TEST_RESULT' } }); const mutation = useMutation({ mutationFn: (value: any) => api.post(`/clinical/visits/${visitId}/documents`, { ...value, fileUrl: file?.url, publicId: file?.publicId, mimeType: file?.mimeType, originalName: file?.originalName, fileSize: file?.size }), onSuccess: () => { toast.success('Clinical document attached to this visit.'); done(); close(); }, onError: (error: any) => toast.error(error.response?.data?.message ?? 'Document could not be saved.') }); return <FormBox title="Upload medical form or test document" submit={handleSubmit(value => mutation.mutate(value))} close={close} busy={mutation.isPending}><div className="grid gap-3 sm:grid-cols-2"><select className="input" {...register('documentType')}><option value="TEST_RESULT">Test result</option><option value="DIAGNOSIS_FORM">Diagnosis form</option><option value="REGISTRATION_FORM">Registration form</option><option value="REFERRAL">Referral</option><option value="OTHER">Other</option></select><input className="input" placeholder="Document title" {...register('title', { required: true })}/></div><div className="mt-3"><DocumentUploader label="Take picture or choose file" folder="clinical-documents" value={file} onChange={setFile}/></div></FormBox>; }
function Action({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className="btn-primary"><Plus size={16}/>{children}</button>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h2 className="text-lg font-bold">{title}</h2><div className="mt-2">{children}</div></section>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-5 text-sm text-slate-500">{children}</p>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><strong>{value}</strong></div>; }
function Info({ title, rows }: { title: string; rows: any[][] }) { return <section className="card"><h2 className="font-bold">{title}</h2>{rows.map((row, index) => <div key={index} className="mt-2 text-sm"><span className="text-slate-500">{row[0]}: </span>{row[1]}</div>)}</section>; }
function FormBox({ title, submit, close, busy, children }: { title: string; submit: () => void; close: () => void; busy: boolean; children: React.ReactNode }) { return <form onSubmit={submit} className="card border-brand-100"><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}<div className="mt-4 flex justify-end gap-2"><button type="button" className="rounded-xl border px-4 py-2" onClick={close}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form>; }
function num(value: any) { return value === '' || value == null ? null : Number(value); }
function toLocalInput(value?: string) { const date = value ? new Date(value) : new Date(); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
