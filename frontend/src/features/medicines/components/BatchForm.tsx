import { useForm } from 'react-hook-form';

type Batch = {
  batchNumber: string;
  supplier?: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  expiryDate: string;
};

export default function BatchForm({ onSubmit, onCancel, busy }: { onSubmit: (value: Batch) => void; onCancel: () => void; busy: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Batch>({
    defaultValues: {
      batchNumber: '',
      supplier: '',
      quantity: undefined,
      unitCost: undefined,
      sellingPrice: undefined,
      expiryDate: '',
    },
  });

  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <div>
      <h2 className="text-xl font-bold">Receive medicine batch</h2>
      <p className="text-sm text-slate-500">This creates a separate physical stock lot. It will not replace or hide earlier batches.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Batch number<input className="input mt-1" {...register('batchNumber', { required: true })}/></label>
      <label className="text-sm font-medium">Supplier<input className="input mt-1" {...register('supplier')}/></label>
      <label className="text-sm font-medium">Quantity<input className="input mt-1" placeholder="0" type="number" min="0.01" step="0.01" {...register('quantity', { valueAsNumber: true, required: 'Quantity is required', min: { value: 0.01, message: 'Quantity must be greater than zero' } })}/><span className="text-xs text-red-600">{errors.quantity?.message}</span></label>
      <label className="text-sm font-medium">Unit cost<input className="input mt-1" placeholder="0" type="number" min="0" {...register('unitCost', { valueAsNumber: true, required: true, min: 0 })}/></label>
      <label className="text-sm font-medium">Selling price<input className="input mt-1" placeholder="0" type="number" min="0" {...register('sellingPrice', { valueAsNumber: true, required: true, min: 0 })}/></label>
      <label className="text-sm font-medium">Expiry date<input className="input mt-1" type="date" {...register('expiryDate', { required: true })}/></label>
    </div>
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2.5">Cancel</button>
      <button className="btn-primary" disabled={busy}>{busy ? 'Receiving…' : 'Receive batch'}</button>
    </div>
  </form>;
}
