import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, MinusCircle, Plus, ReceiptText, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import DocumentUploader from '../../shared/components/DocumentUploader';
import { api } from '../../shared/services/api';
import type { UploadedAsset } from '../../shared/services/uploadService';
import { medicineApi } from '../medicines/medicineApi';
import { formatClinicMoney, useClinicMoney } from '../settings/clinicSettings';

type Line = { key: string; medicineId: string; batchId: string; quantity: number; unitPrice: number; availableQuantity: number; medicineName?: string; batchLabel?: string };
const money = formatClinicMoney;
const blank = (): Line => ({ key: crypto.randomUUID(), medicineId: '', batchId: '', quantity: 1, unitPrice: 0, availableQuantity: 0 });

export default function QuickSalesPage() {
  const money = useClinicMoney();
  const qc = useQueryClient();
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [proof, setProof] = useState<UploadedAsset | null>(null);
  const medicines = useQuery({ queryKey: ['medicines', 'quick-sale'], queryFn: async () => (await api.get('/medicines', { params: { pageSize: 100, inStockOnly: true } })).data.data });
  const recent = useQuery({ queryKey: ['retail-sales'], queryFn: async () => (await api.get('/retail-sales', { params: { pageSize: 10 } })).data });
  const total = useMemo(() => lines.reduce((sum, x) => sum + (Number(x.quantity) || 0) * (Number(x.unitPrice) || 0), 0), [lines]);
  const update = (key: string, patch: Partial<Line>) => setLines(xs => xs.map(x => x.key === key ? { ...x, ...patch } : x));
  const validationMessage = useMemo(() => {
    if (medicines.isLoading) return 'Loading available medicines and batches…';
    const missingMedicine = lines.findIndex(x => !x.medicineId);
    if (missingMedicine >= 0) return `Select a medicine on item ${missingMedicine + 1}.`;
    const missingBatch = lines.findIndex(x => !x.batchId);
    if (missingBatch >= 0) return `Select the exact stock batch on item ${missingBatch + 1}.`;
    const invalidQuantity = lines.findIndex(x => !Number.isFinite(x.quantity) || x.quantity <= 0);
    if (invalidQuantity >= 0) return `Enter a quantity greater than zero on item ${invalidQuantity + 1}.`;
    const excessQuantity = lines.findIndex(x => x.quantity > x.availableQuantity);
    if (excessQuantity >= 0) return `Item ${excessQuantity + 1} only has ${lines[excessQuantity].availableQuantity} units in the selected batch.`;
    const missingPrice = lines.findIndex(x => x.unitPrice <= 0);
    if (missingPrice >= 0) return `The selected batch on item ${missingPrice + 1} has no selling price. Update that batch first.`;
    return '';
  }, [lines, medicines.isLoading]);
  const valid = !validationMessage && total > 0;
  const sale = useMutation({
    mutationFn: () => api.post('/retail-sales', {
      items: lines.map(x => ({ medicineId: x.medicineId, batchId: x.batchId, quantity: Number(x.quantity) })),
      amountReceived: total,
      paymentMethod: method,
      paymentReference: reference,
      customerName,
      customerPhone,
      paymentProofUrl: proof?.url,
      paymentProofPublicId: proof?.publicId,
    }),
    onSuccess: r => {
      toast.success(`Sale saved. Receipt ${r.data.saleNumber}`);
      setLines([blank()]); setReference(''); setCustomerName(''); setCustomerPhone(''); setProof(null);
      qc.invalidateQueries({ queryKey: ['retail-sales'] }); qc.invalidateQueries({ queryKey: ['inventory-batches'] }); qc.invalidateQueries({ queryKey: ['medicines'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'The sale could not be completed.'),
  });

  const complete = () => {
    if (!valid) { toast.error(validationMessage || 'Complete all sale details first.'); return; }
    sale.mutate();
  };

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Minute-by-minute pharmacy sales</p><h1 className="text-3xl font-bold">Quick medicine sale</h1><p className="text-slate-500">For walk-in customers who are not registered as inpatients or outpatients.</p></div><div className="rounded-xl bg-brand-50 px-5 py-3 text-right"><p className="text-xs text-brand-700">Sale total</p><strong className="text-2xl text-brand-900">{money(total)}</strong></div></header>
    <section className="card">
      <div className="space-y-3">{lines.map((line, index) => <SaleLine key={line.key} line={line} index={index} medicines={medicines.data ?? []} update={patch => update(line.key, patch)} remove={() => setLines(xs => xs.filter(x => x.key !== line.key))}/>)}</div>
      <button type="button" className="mt-3 rounded-xl border px-4 py-2 text-sm" onClick={() => setLines(xs => [...xs, blank()])}><Plus className="mr-1 inline" size={16}/>Add another medicine</button>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm">Payment method<select className="input mt-1" value={method} onChange={e => setMethod(e.target.value)}>{['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'OTHER'].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm">Payment reference (optional)<input className="input mt-1" value={reference} onChange={e => setReference(e.target.value)}/></label><label className="text-sm">Customer name (optional)<input className="input mt-1" value={customerName} onChange={e => setCustomerName(e.target.value)}/></label><label className="text-sm">Customer phone (optional)<input className="input mt-1" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}/></label></div>
      <div className="mt-4 max-w-xl"><DocumentUploader label="Proof of payment (optional)" folder="retail-payment-proofs" value={proof} onChange={setProof}/></div>
      {validationMessage && <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle className="mt-0.5 shrink-0" size={17}/><span>{validationMessage}</span></div>}
      <button className="btn-primary mt-4 w-full justify-center py-3" disabled={sale.isPending} onClick={complete}><ShoppingCart size={18}/>{sale.isPending ? 'Saving sale and updating stock…' : `Complete sale · ${money(total)}`}</button>
      <p className="mt-2 text-center text-xs text-slate-500">Selling prices are read-only and come from the selected medicine batch. The backend rechecks price, stock and expiry before deducting inventory.</p>
    </section>
    <section className="card"><h2 className="flex items-center gap-2 text-lg font-bold"><ReceiptText size={19}/>Recent walk-in sales</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b text-left text-slate-500"><tr><th className="p-2">Time</th><th className="p-2">Receipt</th><th className="p-2">Items</th><th className="p-2">Amount</th><th className="p-2">Gross profit</th><th className="p-2">Method</th></tr></thead><tbody>{recent.data?.data?.map((x: any) => <tr className="border-b" key={x.id}><td className="p-2">{new Date(x.soldAt).toLocaleString()}</td><td className="p-2 font-semibold">{x.saleNumber}</td><td className="p-2">{x.itemCount} · qty {x.quantity}</td><td className="p-2">{money(x.totalAmount)}</td><td className="p-2 text-emerald-700">{money(x.grossProfit)}</td><td className="p-2">{x.paymentMethod}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function SaleLine({ line, index, medicines, update, remove }: { line: Line; index: number; medicines: any[]; update: (x: Partial<Line>) => void; remove: () => void }) {
  const details = useQuery({ queryKey: ['medicine', line.medicineId, 'sale'], queryFn: () => medicineApi.details(line.medicineId), enabled: !!line.medicineId });
  const usable = details.data?.batches.filter(b => b.isActive && b.quantityRemaining > 0 && (!b.expiryDate || new Date(`${b.expiryDate}T23:59:59`) > new Date())) ?? [];
  return <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1.5fr_1.5fr_.7fr_.8fr_auto]">
    <label className="text-xs text-slate-500">Medicine<select className="input mt-1" value={line.medicineId} onChange={e => { const m = medicines.find(x => x.id === e.target.value); update({ medicineId: e.target.value, batchId: '', unitPrice: 0, availableQuantity: 0, medicineName: m?.name }); }}><option value="">Select medicine</option>{medicines.map(x => <option key={x.id} value={x.id}>{x.name} {x.strength} · total {x.totalStock}</option>)}</select></label>
    <label className="text-xs text-slate-500">Exact batch (earliest expiry first)<select className="input mt-1" value={line.batchId} disabled={!line.medicineId || details.isLoading} onChange={e => { const b = usable.find(x => x.id === e.target.value); update({ batchId: e.target.value, unitPrice: Number(b?.sellingPrice ?? 0), availableQuantity: Number(b?.quantityRemaining ?? 0), batchLabel: b?.batchNumber }); }}><option value="">{details.isLoading ? 'Loading batches…' : 'Select usable batch'}</option>{usable.map(b => <option key={b.id} value={b.id}>{b.batchNumber} · {b.quantityRemaining} left · expires {b.expiryDate}</option>)}</select></label>
    <label className="text-xs text-slate-500">Quantity<input className="input mt-1" type="number" min="0.01" max={line.availableQuantity || undefined} step="0.01" value={line.quantity} onChange={e => update({ quantity: Number(e.target.value) })}/></label>
    <label className="text-xs text-slate-500">Selling price<div className="input mt-1 flex items-center bg-slate-100 font-semibold text-slate-700" aria-label="Selling price">{line.batchId ? money(line.unitPrice) : 'Select batch'}</div></label>
    <button type="button" title={`Remove item ${index + 1}`} className="self-end rounded-lg p-3 text-red-600 disabled:opacity-30" disabled={index === 0} onClick={remove}><MinusCircle/></button>
  </div>;
}
