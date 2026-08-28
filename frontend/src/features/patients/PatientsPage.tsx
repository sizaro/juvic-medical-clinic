import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, PlayCircle, Search, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../shared/services/api';

type Patient = { id: string; patientNumber: string; firstName: string; middleName?: string; lastName: string; dateOfBirth: string; sex: string; primaryPhone: string; hasActiveVisit: boolean; lastVisitAt?: string };

export default function PatientsPage() {
  const nav = useNavigate(); const qc = useQueryClient();
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [selected, setSelected] = useState<Patient | null>(null);
  const [careType, setCareType] = useState('OUTPATIENT'); const [reason, setReason] = useState('');
  const q = useQuery({ queryKey: ['patients', search, page], queryFn: async () => (await api.get('/patients', { params: { search, page, pageSize: 20 } })).data });
  const startVisit = useMutation({
    mutationFn: async () => (await api.post(`/patients/${selected!.id}/visits`, { careType, reason })).data,
    onSuccess: async () => { toast.success('New visit started using the existing patient record.'); await qc.invalidateQueries({ queryKey: ['patients'] }); const id = selected!.id; setSelected(null); setReason(''); nav(`/patients/${id}`); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'The visit could not be started.'),
  });
  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Patient registry</p><h1 className="text-3xl font-bold">Patients</h1><p className="text-slate-500">Search returning patients before registering a new record.</p></div><button className="btn-primary" onClick={() => nav('/patients/new')}><UserPlus size={18} />Register new patient</button></header>
    <section className="card"><label className="relative block max-w-xl"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input pl-10" placeholder="Patient number, name or phone" /></label>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Patient</th><th className="p-3">Number</th><th className="p-3">Sex</th><th className="p-3">Date of birth</th><th className="p-3">Phone</th><th className="p-3">Visit status</th><th className="p-3">Actions</th></tr></thead><tbody>
        {q.isLoading && <tr><td colSpan={7} className="p-8 text-center">Searching patient records…</td></tr>}
        {q.isError && <tr><td colSpan={7} className="p-8 text-center text-red-600">Patients could not be loaded.</td></tr>}
        {q.data?.data?.map((p: Patient) => <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3 font-semibold">{p.firstName} {p.middleName} {p.lastName}</td><td className="p-3 text-brand-700">{p.patientNumber}</td><td className="p-3">{p.sex}</td><td className="p-3">{p.dateOfBirth}</td><td className="p-3">{p.primaryPhone}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${p.hasActiveVisit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.hasActiveVisit ? 'Active visit' : 'No active visit'}</span></td><td className="p-3"><div className="flex gap-2"><Link className="inline-flex items-center gap-1 rounded-lg border px-3 py-2" to={`/patients/${p.id}`}><Eye size={16} />Open</Link>{!p.hasActiveVisit && <button onClick={() => setSelected(p)} className="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-2 text-white"><PlayCircle size={16} />Start visit</button>}</div></td></tr>)}
        {!q.isLoading && q.data?.data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No matching patients. Register only if this is a new patient.</td></tr>}
      </tbody></table></div>
      <footer className="mt-4 flex justify-between text-sm"><span>{q.data?.total ?? 0} patients</span><div className="flex gap-2"><button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={page === 1} onClick={() => setPage(x => x - 1)}>Previous</button><button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={page * 20 >= (q.data?.total ?? 0)} onClick={() => setPage(x => x + 1)}>Next</button></div></footer>
    </section>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><form className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onSubmit={e => { e.preventDefault(); startVisit.mutate(); }}><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-brand-700">Returning patient</p><h2 className="text-xl font-bold">Start visit for {selected.firstName} {selected.lastName}</h2><p className="text-sm text-slate-500">{selected.patientNumber}; previous records remain unchanged.</p></div><button type="button" onClick={() => setSelected(null)}><X /></button></div><label className="mt-4 block text-sm font-medium">Care type<select className="input mt-1" value={careType} onChange={e => setCareType(e.target.value)}><option value="OUTPATIENT">Outpatient</option><option value="INPATIENT">Inpatient</option></select></label><label className="mt-3 block text-sm font-medium">Reason for visit<textarea required className="input mt-1 min-h-24" value={reason} onChange={e => setReason(e.target.value)} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="rounded-xl border px-4 py-2" onClick={() => setSelected(null)}>Cancel</button><button className="btn-primary" disabled={startVisit.isPending}>{startVisit.isPending ? 'Starting visit…' : 'Start visit'}</button></div></form></div>}
  </div>;
}
