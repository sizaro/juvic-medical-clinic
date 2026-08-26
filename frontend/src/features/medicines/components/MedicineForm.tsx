import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import DocumentUploader from '../../../shared/components/DocumentUploader';
import type { UploadedAsset } from '../../../shared/services/uploadService';
import { useClinicSettings } from '../../settings/clinicSettings';
import type { Medicine, MedicineInput } from '../medicineApi';

const forms = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OTHER'];
type FormValues = Omit<MedicineInput, 'initialBatch'> & { batchNumber?: string; supplier?: string; openingQuantity?: number; unitCost?: number; sellingPrice?: number; expiryDate?: string };

export default function MedicineForm({ medicine, onSubmit, onCancel, busy }: { medicine?: Medicine; onSubmit: (value: MedicineInput) => void; onCancel: () => void; busy: boolean }) {
  const { clinic } = useClinicSettings();
  const [image, setImage] = useState<UploadedAsset | null>(medicine?.imageUrl ? { url: medicine.imageUrl, publicId: medicine.imagePublicId ?? '', mimeType: medicine.imageMimeType ?? 'image/jpeg', originalName: 'Medicine image', size: 0, resourceType: 'image' } : null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: '', genericName: '', strength: '', form: 'TABLET', unit: 'tablet', minimumStockLevel: 0, defaultSellingPrice: 0, isActive: true, openingQuantity: 0, unitCost: 0, sellingPrice: 0 } });

  useEffect(() => { if (medicine) reset({ ...medicine, openingQuantity: 0, unitCost: 0, sellingPrice: medicine.defaultSellingPrice ?? 0 }); }, [medicine, reset]);
  const submit = (value: FormValues) => {
    const quantity = Number(value.openingQuantity ?? 0);
    const initialBatch = !medicine && quantity > 0 ? { batchNumber: value.batchNumber ?? '', supplier: value.supplier, quantity, unitCost: Number(value.unitCost ?? 0), sellingPrice: Number(value.sellingPrice ?? value.defaultSellingPrice ?? 0), expiryDate: value.expiryDate ?? '' } : undefined;
    onSubmit({ name: value.name, genericName: value.genericName, strength: value.strength, form: value.form, unit: value.unit, minimumStockLevel: Number(value.minimumStockLevel), defaultSellingPrice: Number(value.defaultSellingPrice ?? 0), isActive: value.isActive, imageUrl: image?.url, imagePublicId: image?.publicId, imageMimeType: image?.mimeType, initialBatch });
  };

  return <form onSubmit={handleSubmit(submit)} className="space-y-4">
    <div><h2 className="text-xl font-bold">{medicine ? 'Edit medicine' : 'Add medicine and opening stock'}</h2><p className="text-sm text-slate-500">A medicine is the product identity. Each delivery remains a separate traceable batch.</p></div>
    <DocumentUploader label="Medicine picture" folder="medicines" value={image} onChange={setImage} allowPdf={false}/>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Medicine name<input className="input mt-1" {...register('name', { required: 'Name is required' })}/><span className="text-xs text-red-600">{errors.name?.message}</span></label>
      <label className="text-sm font-medium">Generic name<input className="input mt-1" {...register('genericName')}/></label>
      <label className="text-sm font-medium">Strength<input className="input mt-1" placeholder="e.g. 500mg" {...register('strength')}/></label>
      <label className="text-sm font-medium">Form<select className="input mt-1" {...register('form')}>{forms.map(form => <option key={form}>{form}</option>)}</select></label>
      <label className="text-sm font-medium">Unit<input className="input mt-1" placeholder="tablet, bottle…" {...register('unit', { required: true })}/></label>
      <label className="text-sm font-medium">Minimum stock<input className="input mt-1" type="number" min="0" step="0.01" {...register('minimumStockLevel', { valueAsNumber: true, min: 0 })}/></label>
      <label className="text-sm font-medium">Default selling price ({clinic.currency})<input className="input mt-1" type="number" min="0" step="1" {...register('defaultSellingPrice', { valueAsNumber: true, min: 0 })}/></label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" {...register('isActive')}/> Active medicine</label>
    </div>
    {!medicine && <section className="rounded-xl border bg-slate-50 p-4"><h3 className="font-bold">Opening batch (optional)</h3><p className="mb-3 text-sm text-slate-500">If stock is already available, record its batch and expiry now. Leave quantity at zero if stock will be received later.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-medium">Batch number<input className="input mt-1" {...register('batchNumber')}/></label><label className="text-sm font-medium">Supplier<input className="input mt-1" {...register('supplier')}/></label><label className="text-sm font-medium">Opening quantity<input className="input mt-1" type="number" min="0" step="0.01" {...register('openingQuantity', { valueAsNumber: true, min: 0 })}/></label><label className="text-sm font-medium">Unit cost<input className="input mt-1" type="number" min="0" {...register('unitCost', { valueAsNumber: true, min: 0 })}/></label><label className="text-sm font-medium">Selling price<input className="input mt-1" type="number" min="0" {...register('sellingPrice', { valueAsNumber: true, min: 0 })}/></label><label className="text-sm font-medium">Expiry date<input className="input mt-1" type="date" {...register('expiryDate')}/></label></div></section>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2.5">Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : medicine ? 'Save changes' : 'Create medicine'}</button></div>
  </form>;
}
