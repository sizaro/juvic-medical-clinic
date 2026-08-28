import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChevronDown, PackagePlus } from 'lucide-react';
import DocumentUploader from '../../../shared/components/DocumentUploader';
import type { UploadedAsset } from '../../../shared/services/uploadService';
import { useClinicSettings } from '../../settings/clinicSettings';
import type { Medicine, MedicineInput } from '../medicineApi';

const forms = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OTHER'];
const units = ['tablet', 'capsule', 'bottle', 'vial', 'ampoule', 'sachet', 'tube', 'millilitre', 'piece'];
type FormValues = Omit<MedicineInput, 'initialBatch' | 'defaultSellingPrice' | 'unit'> & {
  unit: string;
  customUnit?: string;
  quantityPurchased: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
  supplier?: string;
  batchNumber?: string;
};

export default function MedicineForm({ medicine, onSubmit, onCancel, busy }: { medicine?: Medicine; onSubmit: (value: MedicineInput) => void; onCancel: () => void; busy: boolean }) {
  const { clinic } = useClinicSettings();
  const [image, setImage] = useState<UploadedAsset | null>(medicine?.imageUrl ? { url: medicine.imageUrl, publicId: medicine.imagePublicId ?? '', mimeType: medicine.imageMimeType ?? 'image/jpeg', originalName: 'Medicine image', size: 0, resourceType: 'image' } : null);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', genericName: '', strength: '', form: 'TABLET', unit: 'tablet', minimumStockLevel: 10, isActive: true, quantityPurchased: undefined, purchasePrice: undefined, sellingPrice: undefined, expiryDate: '' },
  });

  useEffect(() => {
    if (medicine) {
      const knownUnit = units.includes(medicine.unit.toLowerCase());
      reset({ ...medicine, unit: knownUnit ? medicine.unit.toLowerCase() : 'OTHER', customUnit: knownUnit ? '' : medicine.unit, quantityPurchased: 1, purchasePrice: 0, sellingPrice: medicine.defaultSellingPrice ?? 0, expiryDate: '' });
    }
  }, [medicine, reset]);

  const selectedUnit = watch('unit');
  const customUnit = watch('customUnit');
  const displayUnit = selectedUnit === 'OTHER' ? customUnit?.trim() || 'unit' : selectedUnit || 'unit';
  const quantityPurchased = Number(watch('quantityPurchased') || 0);
  const purchasePrice = Number(watch('purchasePrice') || 0);
  const totalPurchaseCost = quantityPurchased * purchasePrice;

  const submit = (value: FormValues) => {
    const sellingPrice = Number(value.sellingPrice);
    onSubmit({
      name: value.name,
      genericName: value.genericName,
      strength: value.strength,
      form: value.form,
      unit: value.unit === 'OTHER' ? value.customUnit!.trim() : value.unit,
      minimumStockLevel: Number(value.minimumStockLevel),
      defaultSellingPrice: sellingPrice,
      isActive: value.isActive,
      imageUrl: image?.url,
      imagePublicId: image?.publicId,
      imageMimeType: image?.mimeType,
      initialBatch: medicine ? undefined : {
        batchNumber: value.batchNumber?.trim() || undefined,
        supplier: value.supplier,
        quantity: Number(value.quantityPurchased),
        unitCost: Number(value.purchasePrice),
        sellingPrice,
        expiryDate: value.expiryDate,
      },
    });
  };

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return <form onSubmit={handleSubmit(submit)} className="space-y-5">
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Medicine inventory</p>
      <h2 className="text-2xl font-bold">{medicine ? 'Edit medicine' : 'Add medicine'}</h2>
      <p className="mt-1 text-sm text-slate-500">Enter the medicine and the stock currently available. The system creates its internal stock reference automatically.</p>
    </div>

    <DocumentUploader label="Medicine picture (optional)" folder="medicines" value={image} onChange={setImage} allowPdf={false}/>

    <section className="rounded-2xl border bg-white p-4">
      <h3 className="font-bold">Medicine details</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Medicine name<input className="input mt-1" placeholder="e.g. Paracetamol" {...register('name', { required: 'Medicine name is required' })}/><span className="text-xs text-red-600">{errors.name?.message}</span></label>
        <label className="text-sm font-medium">Form<select className="input mt-1" {...register('form')}>{forms.map(form => <option key={form}>{form}</option>)}</select></label>
        <label className="text-sm font-medium">Strength<input className="input mt-1" placeholder="e.g. 500 mg" {...register('strength')}/></label>
        <label className="text-sm font-medium">Unit sold as<select className="input mt-1" {...register('unit', { required: 'Select how this medicine is counted' })}>{units.map(unit => <option key={unit} value={unit}>{unit[0].toUpperCase() + unit.slice(1)}</option>)}<option value="OTHER">Other</option></select><span className="text-xs text-red-600">{errors.unit?.message}</span></label>
        {selectedUnit === 'OTHER' && <label className="text-sm font-medium">Type the selling unit<input className="input mt-1" placeholder="e.g. pack, drop, syringe" {...register('customUnit', { required: 'Type the unit used for this item' })}/><span className="text-xs text-red-600">{errors.customUnit?.message}</span></label>}
      </div>
    </section>

    {!medicine && <section className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-brand-700 shadow-sm"><PackagePlus size={20}/></span><div><h3 className="font-bold">Purchase and opening-stock details</h3><p className="text-sm text-slate-600">Record the quantity bought, the clinic's purchase rate, supplier, batch, and expiry.</p></div></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Quantity purchased ({displayUnit})<input className="input mt-1" placeholder="0" type="number" min="0.01" step="0.01" {...register('quantityPurchased', { valueAsNumber: true, required: 'Quantity is required', min: { value: 0.01, message: 'Quantity must be greater than zero' } })}/><span className="text-xs text-red-600">{errors.quantityPurchased?.message}</span></label>
        <label className="text-sm font-medium">Purchase rate per {displayUnit} ({clinic.currency})<input className="input mt-1" placeholder="0" type="number" min="0" step="1" {...register('purchasePrice', { valueAsNumber: true, required: 'Purchase rate is required', min: { value: 0, message: 'Rate cannot be negative' } })}/><span className="text-xs text-red-600">{errors.purchasePrice?.message}</span></label>
        <label className="text-sm font-medium">Supplier (optional)<input className="input mt-1" placeholder="Supplier or pharmacy name" {...register('supplier')}/></label>
        <label className="text-sm font-medium">Batch number (optional)<input className="input mt-1" placeholder="Leave blank to generate automatically" {...register('batchNumber')}/></label>
        <label className="text-sm font-medium">Expiry date<input className="input mt-1" type="date" min={tomorrow} {...register('expiryDate', { required: 'Expiry date is required' })}/><span className="text-xs text-red-600">{errors.expiryDate?.message}</span></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-white p-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total amount spent buying this stock</p><p className="text-sm text-slate-500">{quantityPurchased || 0} {displayUnit}{quantityPurchased === 1 ? '' : 's'} × {clinic.currency} {purchasePrice.toLocaleString()}</p></div><strong className="text-xl text-brand-700">{clinic.currency} {totalPurchaseCost.toLocaleString()}</strong></div>
    </section>}

    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
      <h3 className="font-bold">Selling details</h3>
      <p className="text-sm text-slate-600">Set what the clinic charges for one {displayUnit}. Treatment billing and medicine sales use this rate.</p>
      <label className="mt-4 block max-w-md text-sm font-medium">Selling rate per {displayUnit} ({clinic.currency})<input className="input mt-1" placeholder="0" type="number" min="1" step="1" {...register('sellingPrice', { valueAsNumber: true, required: 'Selling rate is required', min: { value: 1, message: 'Selling rate must be greater than zero' } })}/><span className="text-xs text-red-600">{errors.sellingPrice?.message}</span></label>
    </section>

    <details className="group rounded-2xl border bg-slate-50 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">More details <ChevronDown className="transition group-open:rotate-180" size={18}/></summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Generic name (optional)<input className="input mt-1" {...register('genericName')}/></label>
        <label className="text-sm font-medium">Low-stock alert at<input className="input mt-1" type="number" min="0" step="0.01" {...register('minimumStockLevel', { valueAsNumber: true, min: 0 })}/></label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" {...register('isActive')}/> Medicine is active</label>
      </div>
    </details>

    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2.5">Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving medicine and stock…' : medicine ? 'Save changes' : 'Add medicine to inventory'}</button></div>
  </form>;
}
