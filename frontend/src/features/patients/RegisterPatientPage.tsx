import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DocumentUploader from '../../shared/components/DocumentUploader';
import { api } from '../../shared/services/api';
import type { UploadedAsset } from '../../shared/services/uploadService';

type Form = {
  firstName: string; middleName?: string; lastName: string; dateOfBirth: string; sex: string;
  primaryPhone: string; alternativePhone?: string; email?: string; address: string; nin?: string; occupation?: string;
  bloodGroup?: string; allergies?: string; medicalConditions?: string; currentMedication?: string;
  kinFirstName: string; kinLastName: string; relationship: string; kinPhone: string; kinAddress: string;
  careType: 'OUTPATIENT' | 'INPATIENT'; reason: string; documentType: string; documentTitle: string;
};

export default function RegisterPatientPage() {
  const nav = useNavigate();
  const [document, setDocument] = useState<UploadedAsset | null>(null);
  const { register, handleSubmit } = useForm<Form>({ defaultValues: { sex: 'FEMALE', careType: 'OUTPATIENT', documentType: 'REGISTRATION_FORM', documentTitle: 'Initial medical/registration form' } });
  const create = useMutation({
    mutationFn: async (v: Form) => (await api.post('/patients', {
      firstName: v.firstName, middleName: v.middleName, lastName: v.lastName, dateOfBirth: v.dateOfBirth, sex: v.sex,
      primaryPhone: v.primaryPhone, alternativePhone: v.alternativePhone, email: v.email, address: v.address, nin: v.nin, occupation: v.occupation,
      bloodGroup: v.bloodGroup, allergies: v.allergies, medicalConditions: v.medicalConditions, currentMedication: v.currentMedication,
      nextOfKin: [{ firstName: v.kinFirstName, lastName: v.kinLastName, relationship: v.relationship, phone: v.kinPhone, address: v.kinAddress, isPrimary: true }],
      initialVisit: { careType: v.careType, reason: v.reason, initialDocument: document ? { documentType: v.documentType, title: v.documentTitle, fileUrl: document.url, publicId: document.publicId, mimeType: document.mimeType, originalName: document.originalName, fileSize: document.size } : null },
    })).data,
    onSuccess: d => { toast.success(`Patient ${d.patientNumber} registered and visit started.`); nav(`/patients/${d.id}`); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Patient could not be registered.'),
  });

  return <form className="mx-auto max-w-5xl space-y-5" onSubmit={handleSubmit(v => create.mutate(v))}>
    <header className="flex items-center gap-3"><button type="button" className="rounded-xl border bg-white p-2" onClick={() => nav('/patients')}><ArrowLeft /></button><div><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Patient registry</p><h1 className="text-3xl font-bold">Register a new patient</h1><p className="text-slate-500">For a returning patient, search the patient list and start a new visit instead.</p></div></header>
    <Card title="Core patient information"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="First name"><input className="input" {...register('firstName', { required: true })} /></Field><Field label="Last name"><input className="input" {...register('lastName', { required: true })} /></Field><Field label="Date of birth"><input type="date" className="input" {...register('dateOfBirth', { required: true })} /></Field><Field label="Sex"><select className="input" {...register('sex')}><option>FEMALE</option><option>MALE</option><option>OTHER</option></select></Field><Field label="Primary phone"><input className="input" {...register('primaryPhone', { required: true })} /></Field><Field label="Address"><input className="input" {...register('address', { required: true })} /></Field>
    </div><details className="mt-4 rounded-xl border bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">Optional identity and contact details</summary><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Middle name"><input className="input" {...register('middleName')} /></Field><Field label="Alternative phone"><input className="input" {...register('alternativePhone')} /></Field><Field label="Email"><input type="email" className="input" {...register('email')} /></Field><Field label="NIN"><input className="input" {...register('nin')} /></Field><Field label="Occupation"><input className="input" {...register('occupation')} /></Field></div></details></Card>
    <Card title="Primary guardian or next of kin"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="First name"><input className="input" {...register('kinFirstName', { required: true })} /></Field><Field label="Last name"><input className="input" {...register('kinLastName', { required: true })} /></Field><Field label="Relationship"><input className="input" {...register('relationship', { required: true })} /></Field><Field label="Phone"><input className="input" {...register('kinPhone', { required: true })} /></Field><Field label="Address"><input className="input" {...register('kinAddress', { required: true })} /></Field></div></Card>
    <Card title="Medical safety record"><div className="mb-4 flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><ShieldAlert className="shrink-0" size={20} /><p>Record known risks now. Staff can update these later after assessment or test results, and treatment cannot proceed without acknowledging them.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Blood group"><select className="input" {...register('bloodGroup')}><option value="">Not recorded</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Known allergies"><textarea className="input min-h-24" placeholder="Medicine, food or other allergies" {...register('allergies')} /></Field><Field label="Medical conditions"><textarea className="input min-h-24" placeholder="Asthma, diabetes, hypertension…" {...register('medicalConditions')} /></Field><Field label="Current medicines"><textarea className="input min-h-24" placeholder="Medicines already being taken" {...register('currentMedication')} /></Field></div></Card>
    <Card title="Start the first visit"><div className="grid gap-4 sm:grid-cols-2"><Field label="Care type"><select className="input" {...register('careType')}><option value="OUTPATIENT">Outpatient</option><option value="INPATIENT">Inpatient</option></select></Field><Field label="Reason for visit"><textarea className="input min-h-24" {...register('reason', { required: true })} /></Field><Field label="Document type"><select className="input" {...register('documentType')}><option value="REGISTRATION_FORM">Registration form</option><option value="TEST_RESULT">Test result</option><option value="REFERRAL">Referral</option><option value="OTHER">Other</option></select></Field><Field label="Document title"><input className="input" {...register('documentTitle')} /></Field></div><div className="mt-4"><DocumentUploader label="Take a picture or upload an initial medical document (optional)" folder="clinical-documents" value={document} onChange={setDocument} /></div></Card>
    <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border bg-white px-4 py-2.5" onClick={() => nav('/patients')}>Cancel</button><button className="btn-primary" disabled={create.isPending}><Save size={18} />{create.isPending ? 'Registering and starting visit…' : 'Register patient and start visit'}</button></div>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<div className="mt-1">{children}</div></label>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}</section>; }
