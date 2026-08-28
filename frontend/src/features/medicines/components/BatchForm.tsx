import { useForm } from 'react-hook-form';
import { useClinicSettings } from '../../settings/clinicSettings';

type Batch = {
  batchNumber: string;
  supplier?: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  expiryDate: string;
};

export default function BatchForm({ onSubmit, onCancel, busy }: { onSubmit: (value: Batch) => void; onCancel: () => void; busy: boolean }) {
  const { clinic } = useClinicSettings();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Batch>({
    defaultValues: { batchNumber: '', supplier: '', quantity: undefined, unitCost: undefined, sellingPrice: undefined, expiryDate: '' },
  });
  const quantity = Number(watch('quantity') || 0);
  const unitCost = Number(watch('unitCost') || 0);
  const totalPurchaseCost = quantity * unitCost;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
    <div><h2 className="text-xl font-bold">Receive medicine batch</h2><p className="text-sm text-slate-500">This creates a separate physical stock lot without replacing earlier batches.</p></div>

    <section className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <h3 className="font-bold">Purchase details</h3><p className="text-sm text-slate-500">Record the delivery quantity and what the clinic paid per unit.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Quantity purchased<input className="input mt-1" placeholder="0" type="number" min="0.01" step="0.01" {...register('quantity', { valueAsNumber: true, required: 'Quantity is required', min: { value: 0.01, message: 'Quantity must be greater than zero' } })}/><span className="text-xs text-red-600">{errors.quantity?.message}</span></label>
        <label className="text-sm font-medium">Purchase rate per unit ({clinic.currency})<input className="input mt-1" placeholder="0" type="number" min="0" step="1" {...register('unitCost', { valueAsNumber: true, required: 'Purchase rate is required', min: 0 })}/></label>
        <label className="text-sm font-medium">Supplier (optional)<input className="input mt-1" placeholder="Supplier or pharmacy name" {...register('supplier')}/></label>
        <label className="text-sm font-medium">Batch number (optional)<input className="input mt-1" placeholder="Leave blank to generate automatically" {...register('batchNumber')}/></label>
        <label className="text-sm font-medium">Expiry date<input className="input mt-1" min={tomorrow} type="date" {...register('expiryDate', { required: 'Expiry date is required' })}/><span className="text-xs text-red-600">{errors.expiryDate?.message}</span></label>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white p-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total purchase cost</p><p className="text-sm text-slate-500">{quantity} units × {clinic.currency} {unitCost.toLocaleString()}</p></div><strong className="text-xl text-brand-700">{clinic.currency} {totalPurchaseCost.toLocaleString()}</strong></div>
    </section>

    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
      <h3 className="font-bold">Selling details</h3><p className="text-sm text-slate-500">Set the selling rate for one unit from this batch.</p>
      <label className="mt-4 block max-w-md text-sm font-medium">Selling rate per unit ({clinic.currency})<input className="input mt-1" placeholder="0" type="number" min="1" step="1" {...register('sellingPrice', { valueAsNumber: true, required: 'Selling rate is required', min: 1 })}/></label>
    </section>

    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2.5">Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Receiving…' : 'Receive batch'}</button></div>
  </form>;
}
