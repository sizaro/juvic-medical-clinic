import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../shared/services/api';

type Batch = { id: string; batchNumber?: string; quantityRemaining: number };
type DueTreatment = {
  id: string;
  status: string;
  patient: { id: string; firstName: string; lastName: string; patientNumber: string };
  treatmentName: string;
  medicineId?: string;
  route?: string;
  doseQuantity: number;
  scheduledAt: string;
  preferredBatchId?: string;
  availableBatches: Batch[];
};

const scopes = ['due', 'late', 'upcoming', 'missed'] as const;

export default function DueTreatmentsPage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<(typeof scopes)[number]>('due');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<{ action: 'give' | 'miss'; dose: DueTreatment } | null>(null);

  const queue = useQuery<DueTreatment[]>({
    queryKey: ['due-treatments', scope],
    queryFn: async () => (await api.get('/treatments/due', { params: { scope } })).data,
  });

  const patientGroups = useMemo(() => {
    const groups = new Map<string, { patient: DueTreatment['patient']; doses: DueTreatment[] }>();
    for (const dose of queue.data ?? []) {
      const current = groups.get(dose.patient.id);
      if (current) current.doses.push(dose);
      else groups.set(dose.patient.id, { patient: dose.patient, doses: [dose] });
    }
    return [...groups.values()];
  }, [queue.data]);

  useEffect(() => {
    if (!patientGroups.length) {
      setSelectedPatientId('');
      return;
    }
    if (!patientGroups.some(group => group.patient.id === selectedPatientId)) {
      setSelectedPatientId(patientGroups[0].patient.id);
    }
  }, [patientGroups, selectedPatientId]);

  const selectedGroup = patientGroups.find(group => group.patient.id === selectedPatientId) ?? patientGroups[0];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['due-treatments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['medicines'] });
    queryClient.invalidateQueries({ queryKey: ['patient'] });
  };

  const give = useMutation({
    mutationFn: (dose: DueTreatment) => api.post(`/treatments/doses/${dose.id}/administer`, {
      batchId: selectedBatches[dose.id] || dose.preferredBatchId,
      quantityUsed: dose.doseQuantity,
    }),
    onSuccess: () => {
      toast.success('Treatment administration recorded for the selected patient.');
      setConfirmation(null);
      refresh();
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Treatment could not be administered.'),
  });

  const markMissed = useMutation({
    mutationFn: (dose: DueTreatment) => api.post(`/treatments/doses/${dose.id}/miss`, { reason: 'Patient did not receive the scheduled treatment' }),
    onSuccess: () => {
      toast.success('Missed treatment preserved in history.');
      setConfirmation(null);
      refresh();
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Treatment could not be marked missed.'),
  });

  const busy = give.isPending || markMissed.isPending;

  return <div className="space-y-5">
    <header>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Clinical queue</p>
      <h1 className="text-3xl font-bold">Due treatments</h1>
      <p className="text-slate-500">Work with one patient at a time. Future doses remain scheduled until their actual administration time.</p>
    </header>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {scopes.map(item => <button key={item} onClick={() => { setScope(item); setSelectedPatientId(''); }} className={`rounded-xl px-4 py-2 capitalize transition ${scope === item ? 'bg-brand-700 text-white shadow-sm' : 'border bg-white hover:border-brand-300 hover:bg-brand-50'}`}>{item}</button>)}
    </div>

    {queue.isLoading && <section className="card flex min-h-48 items-center justify-center text-slate-500"><Clock3 className="mr-2 animate-spin" size={20}/>Loading treatment queue…</section>}

    {!queue.isLoading && patientGroups.length === 0 && <section className="card py-12 text-center">
      <CheckCircle2 className="mx-auto text-emerald-600" size={38}/>
      <h2 className="mt-3 text-lg font-bold">No {scope} treatments</h2>
      <p className="text-sm text-slate-500">There are no patients in this queue right now.</p>
    </section>}

    {!queue.isLoading && patientGroups.length > 0 && <>
      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="font-bold">Patients in this queue</h2><p className="text-sm text-slate-500">Select the patient before recording a dose.</p></div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{patientGroups.length} patient{patientGroups.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {patientGroups.map(group => <button key={group.patient.id} onClick={() => setSelectedPatientId(group.patient.id)} className={`min-w-48 rounded-2xl border p-3 text-left transition ${selectedGroup?.patient.id === group.patient.id ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'bg-white hover:border-brand-300'}`}>
            <span className="flex items-center gap-2 font-bold"><UserRound size={17}/>{group.patient.firstName} {group.patient.lastName}</span>
            <span className="mt-1 block text-xs text-slate-500">{group.patient.patientNumber} · {group.doses.length} dose{group.doses.length === 1 ? '' : 's'}</span>
          </button>)}
        </div>
      </section>

      {selectedGroup && <section className="card overflow-hidden p-0">
        <div className="border-b bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected patient</p><h2 className="text-xl font-bold">{selectedGroup.patient.firstName} {selectedGroup.patient.lastName}</h2><p className="text-sm text-slate-500">{selectedGroup.patient.patientNumber}</p></div>
            <Link className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" to={`/patients/${selectedGroup.patient.id}`}>Open patient record</Link>
          </div>
        </div>
        <div className="divide-y">
          {selectedGroup.doses.map(dose => <article key={dose.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
            <div><p className="font-bold">{dose.treatmentName}</p><p className="text-sm text-slate-500">{dose.doseQuantity} {dose.route ? `· ${dose.route}` : '· Route not recorded'}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled</p><p className="font-medium">{new Date(dose.scheduledAt).toLocaleString()}</p></div>
            <div>{dose.medicineId ? <><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Stock batch</p><select className="input min-w-48" value={selectedBatches[dose.id] ?? dose.preferredBatchId ?? ''} onChange={event => setSelectedBatches(value => ({ ...value, [dose.id]: event.target.value }))}>{dose.availableBatches.map(batch => <option key={batch.id} value={batch.id}>{batch.batchNumber || 'Batch'} · {batch.quantityRemaining} available</option>)}</select></> : <span className="text-sm text-slate-500">Clinical procedure — no stock batch</span>}</div>
            <div className="flex gap-2 lg:justify-end">{dose.status === 'SCHEDULED' && <><button className="btn-primary px-4 py-2" disabled={busy || (!!dose.medicineId && dose.availableBatches.length === 0)} onClick={() => setConfirmation({ action: 'give', dose })}>Give</button><button className="rounded-xl border px-4 py-2 font-semibold text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setConfirmation({ action: 'miss', dose })}>Missed</button></>}</div>
          </article>)}
        </div>
      </section>}
    </>}

    {confirmation && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <section className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <button aria-label="Close" className="absolute right-4 top-4 rounded-lg p-2 hover:bg-slate-100" onClick={() => setConfirmation(null)} disabled={busy}><X size={18}/></button>
        <AlertTriangle className={confirmation.action === 'give' ? 'text-amber-500' : 'text-red-600'} size={34}/>
        <h2 className="mt-3 text-xl font-bold">Confirm {confirmation.action === 'give' ? 'treatment administration' : 'missed dose'}</h2>
        <p className="mt-1 text-sm text-slate-500">Check every detail before saving. This action affects this patient only.</p>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <dt className="text-slate-500">Patient</dt><dd className="font-bold">{confirmation.dose.patient.firstName} {confirmation.dose.patient.lastName} ({confirmation.dose.patient.patientNumber})</dd>
          <dt className="text-slate-500">Treatment</dt><dd className="font-semibold">{confirmation.dose.treatmentName}</dd>
          <dt className="text-slate-500">Dose</dt><dd>{confirmation.dose.doseQuantity} {confirmation.dose.route ? `· ${confirmation.dose.route}` : ''}</dd>
          <dt className="text-slate-500">Scheduled</dt><dd>{new Date(confirmation.dose.scheduledAt).toLocaleString()}</dd>
          {confirmation.action === 'give' && confirmation.dose.medicineId && <><dt className="text-slate-500">Batch</dt><dd>{confirmation.dose.availableBatches.find(batch => batch.id === (selectedBatches[confirmation.dose.id] || confirmation.dose.preferredBatchId))?.batchNumber ?? 'Selected stock batch'}</dd></>}
        </dl>
        <div className="mt-5 flex justify-end gap-2"><button className="rounded-xl border px-4 py-2.5" onClick={() => setConfirmation(null)} disabled={busy}>Go back</button><button className={confirmation.action === 'give' ? 'btn-primary' : 'rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700'} disabled={busy} onClick={() => confirmation.action === 'give' ? give.mutate(confirmation.dose) : markMissed.mutate(confirmation.dose)}>{busy ? 'Saving…' : confirmation.action === 'give' ? 'Yes, give this dose' : 'Yes, mark missed'}</button></div>
      </section>
    </div>}
  </div>;
}
