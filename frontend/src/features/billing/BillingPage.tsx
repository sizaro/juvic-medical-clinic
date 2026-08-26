import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Search, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import DocumentUploader from '../../shared/components/DocumentUploader';
import { api } from '../../shared/services/api';
import type { UploadedAsset } from '../../shared/services/uploadService';
import { useAuth } from '../auth/auth';
import { formatClinicMoney, useClinicMoney } from '../settings/clinicSettings';

const money = formatClinicMoney;

export default function BillingPage() {
  const money = useClinicMoney();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [bill, setBill] = useState<any>(null);
  const [mode, setMode] = useState<'view' | 'pay'>('view');
  const canReverse = user?.role === 'ADMIN' || user?.role === 'DOCTOR';
  const q = useQuery({ queryKey: ['bills', search], queryFn: async () => (await api.get('/billing/bills', { params: { search } })).data });
  const details = useQuery({ queryKey: ['bill-details', bill?.visitId], queryFn: async () => (await api.get(`/billing/visits/${bill.visitId}`)).data, enabled: !!bill });
  const reverse = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/billing/payments/${id}/reverse`, { reason }),
    onSuccess: () => {
      toast.success('Mistaken payment reversed and balance recalculated.');
      qc.invalidateQueries({ queryKey: ['bill-details'] });
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Payment reversal failed.'),
  });

  return <div className="space-y-5">
    <header><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Patient finance</p><h1 className="text-3xl font-bold">Billing and payments</h1><p className="text-slate-500">Payments cannot exceed the calculated balance. Proof and manual receipt copies remain attached to every transaction.</p></header>
    <section className="card">
      <label className="relative block max-w-xl"><Search size={18} className="absolute left-3 top-3 text-slate-400"/><input className="input pl-10" placeholder="Bill, patient number or patient name" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b text-left text-slate-500"><tr><th className="p-3">Patient</th><th className="p-3">Bill</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Balance</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>
        {q.isLoading && <tr><td colSpan={7} className="p-8 text-center">Loading bills…</td></tr>}
        {q.data?.data?.map((b: any) => <tr className="border-b" key={b.id}><td className="p-3"><Link className="font-semibold text-brand-700" to={`/patients/${b.patient.id}`}>{b.patient.firstName} {b.patient.lastName}</Link><p className="text-xs">{b.patient.patientNumber}</p></td><td className="p-3">{b.billNumber}</td><td className="p-3">{money(b.totalAmount)}</td><td className="p-3">{money(b.paidAmount)}</td><td className="p-3 font-semibold">{money(b.balance)}</td><td className="p-3">{b.status}</td><td className="p-3"><div className="flex gap-2"><button className="rounded-lg border p-2" title="View bill and payments" onClick={() => { setBill(b); setMode('view'); }}><Eye size={17}/></button>{b.balance > 0 && <button className="btn-primary px-3 py-2" onClick={() => { setBill(b); setMode('pay'); }}>Receive payment</button>}</div></td></tr>)}
        {!q.isLoading && q.data?.data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No bills have been generated yet.</td></tr>}
      </tbody></table></div>
    </section>
    {bill && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><section className="relative my-8 w-full max-w-3xl rounded-2xl bg-white p-5"><button aria-label="Close" className="absolute right-3 top-3 p-2" onClick={() => setBill(null)}><X/></button>
      {mode === 'pay' ? <PaymentForm bill={bill} done={() => { setBill(null); qc.invalidateQueries({ queryKey: ['bills'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); }}/> : <div>
        <h2 className="text-xl font-bold">{bill.billNumber}</h2><p className="text-sm text-slate-500">{bill.patient.firstName} {bill.patient.lastName} · {bill.patient.patientNumber}</p>
        <div className="mt-4 grid grid-cols-3 gap-2"><Summary label="Total" value={money(details.data?.bill.totalAmount)}/><Summary label="Paid" value={money(details.data?.bill.paidAmount)}/><Summary label="Balance" value={money(details.data?.balance)}/></div>
        <h3 className="mt-5 font-bold">Charges</h3>{details.data?.bill.items.map((x: any) => <div className="flex justify-between border-b py-2 text-sm" key={x.id}><span>{x.description} × {x.quantity}</span><strong>{money(x.amount)}</strong></div>)}
        <h3 className="mt-5 font-bold">Payment and receipt history</h3>{details.data?.payments.map((p: any) => <div className="mt-2 rounded-xl border p-3" key={p.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{p.receiptNumber} · {money(p.amount)}</strong><p className="text-xs text-slate-500">{p.method} · {new Date(p.receivedAt).toLocaleString()} · {p.status}</p></div><div className="flex gap-2">{p.paymentProofUrl && <a className="rounded-lg border px-3 py-2 text-sm" target="_blank" rel="noreferrer" href={p.paymentProofUrl}>Payment proof</a>}{p.receiptDocumentUrl && <a className="rounded-lg border px-3 py-2 text-sm" target="_blank" rel="noreferrer" href={p.receiptDocumentUrl}>Receipt copy</a>}{canReverse && p.status !== 'REVERSED' && <button className="rounded-lg border px-3 py-2 text-sm text-red-600" onClick={() => { const reason = prompt('Why is this payment being reversed?'); if (reason) reverse.mutate({ id: p.id, reason }); }}><Undo2 className="mr-1 inline" size={15}/>Reverse</button>}</div></div></div>)}
        {details.data?.payments.length === 0 && <p className="py-4 text-sm text-slate-500">No payments recorded.</p>}
      </div>}
    </section></div>}
  </div>;
}

function PaymentForm({ bill, done }: { bill: any; done: () => void }) {
  const [proof, setProof] = useState<UploadedAsset | null>(null);
  const [receipt, setReceipt] = useState<UploadedAsset | null>(null);
  const { register, handleSubmit } = useForm<any>({ defaultValues: { method: 'CASH', amount: bill.balance } });
  const pay = useMutation({
    mutationFn: (v: any) => api.post(`/billing/bills/${bill.id}/payments`, { amount: Number(v.amount), method: v.method, reference: v.reference, paymentProofUrl: proof?.url, paymentProofPublicId: proof?.publicId, paymentProofMimeType: proof?.mimeType, paymentProofOriginalName: proof?.originalName, receiptDocumentUrl: receipt?.url, receiptDocumentPublicId: receipt?.publicId, receiptDocumentMimeType: receipt?.mimeType, receiptDocumentOriginalName: receipt?.originalName }),
    onSuccess: r => { toast.success(`Payment saved. Receipt ${r.data.receiptNumber}`); done(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Payment could not be saved.'),
  });
  return <form onSubmit={handleSubmit(v => pay.mutate(v))}><h2 className="text-xl font-bold">Receive payment</h2><p className="text-sm text-slate-500">{bill.patient.firstName} {bill.patient.lastName} · Maximum allowed {money(bill.balance)}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Amount received<input className="input mt-1" type="number" min="1" max={bill.balance} {...register('amount', { required: true, valueAsNumber: true, max: bill.balance })}/></label><label className="text-sm">Payment method<select className="input mt-1" {...register('method')}>{['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'OTHER'].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm sm:col-span-2">Transaction reference<input className="input mt-1" {...register('reference')}/></label></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><DocumentUploader label="Proof of payment" folder="payment-proofs" value={proof} onChange={setProof}/><DocumentUploader label="Copy/photo of issued receipt" folder="receipts" value={receipt} onChange={setReceipt}/></div><button className="btn-primary mt-4 w-full" disabled={pay.isPending}>{pay.isPending ? 'Recording…' : 'Record payment and issue receipt'}</button></form>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">{label}</p><strong>{value}</strong></div>; }
