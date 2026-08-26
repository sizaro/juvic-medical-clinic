import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import DocumentUploader from '../../shared/components/DocumentUploader';
import type { UploadedAsset } from '../../shared/services/uploadService';
import { api } from '../../shared/services/api';
import { useClinicSettings, type ClinicSettings } from './clinicSettings';

const schema = z.object({
  clinicName: z.string().trim().min(2).max(200), shortName: z.string().trim().min(2).max(80),
  logoUrl: z.string().url().or(z.literal('')).optional(), phone: z.string().max(50).optional(),
  email: z.string().email().or(z.literal('')).optional(), address: z.string().max(500).optional(),
  currency: z.string().trim().length(3), timezone: z.string().trim().min(3).max(100),
  primaryContact: z.string().max(200).optional(), receiptFooter: z.string().max(1000).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function ClinicSettingsPage() {
  const { clinic, isLoading } = useClinicSettings();
  const queryClient = useQueryClient();
  const [logo, setLogo] = useState<UploadedAsset | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({ clinicName: clinic.clinicName, shortName: clinic.shortName, logoUrl: clinic.logoUrl ?? '', phone: clinic.phone ?? '', email: clinic.email ?? '', address: clinic.address ?? '', currency: clinic.currency, timezone: clinic.timezone, primaryContact: clinic.primaryContact ?? '', receiptFooter: clinic.receiptFooter ?? '' });
    setLogo(clinic.logoUrl ? { url: clinic.logoUrl, publicId: '', mimeType: 'image/*', originalName: 'Current clinic logo', size: 0, resourceType: 'image' } : null);
  }, [clinic, reset]);

  const update = useMutation({
    mutationFn: async (values: FormValues) => (await api.put<ClinicSettings>('/settings/clinic', values)).data,
    onSuccess: async data => { queryClient.setQueryData(['clinic-settings'], data); await queryClient.invalidateQueries({ queryKey: ['clinic-settings'] }); toast.success('Clinic settings updated across the system.'); },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Clinic settings could not be updated.'),
  });

  const changeLogo = (asset: UploadedAsset | null) => { setLogo(asset); setValue('logoUrl', asset?.url ?? '', { shouldDirty: true }); };
  if (isLoading) return <div className="card flex items-center gap-3"><Loader2 className="animate-spin text-brand-700"/>Loading clinic settings…</div>;

  return <div className="mx-auto max-w-5xl space-y-5">
    <header><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Installation identity</p><h1 className="text-3xl font-bold">Clinic settings</h1><p className="text-slate-500">These database values control the clinic identity shown throughout this deployment.</p></header>
    <form className="card space-y-6" onSubmit={handleSubmit(values => update.mutate(values))}>
      <div className="flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-3 text-brand-700"><Building2/></span><div><h2 className="text-xl font-bold">Identity and branding</h2><p className="text-sm text-slate-500">Only doctors and administrators can change these values.</p></div></div>
      <DocumentUploader label="Clinic logo" folder="clinic-branding" value={logo} onChange={changeLogo} allowPdf={false}/>
      <input type="hidden" {...register('logoUrl')}/>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Clinic name" error={errors.clinicName?.message}><input className="input mt-1" {...register('clinicName')}/></Field>
        <Field label="Short name" error={errors.shortName?.message}><input className="input mt-1" {...register('shortName')}/></Field>
        <Field label="Phone"><input className="input mt-1" type="tel" {...register('phone')}/></Field>
        <Field label="Email" error={errors.email?.message}><input className="input mt-1" type="email" {...register('email')}/></Field>
        <Field label="Primary contact"><input className="input mt-1" {...register('primaryContact')}/></Field>
        <Field label="Currency code" error={errors.currency?.message}><input className="input mt-1 uppercase" maxLength={3} {...register('currency')}/></Field>
        <Field label="Timezone" error={errors.timezone?.message}><input className="input mt-1" placeholder="Africa/Kampala" {...register('timezone')}/></Field>
        <Field label="Address" className="md:col-span-2"><textarea className="input mt-1 min-h-24" {...register('address')}/></Field>
        <Field label="Receipt footer" className="md:col-span-2"><textarea className="input mt-1 min-h-24" placeholder="Thank you for choosing our clinic." {...register('receiptFooter')}/></Field>
      </div>
      <div className="flex justify-end"><button className="btn-primary" disabled={update.isPending}>{update.isPending ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} {update.isPending ? 'Saving…' : 'Save clinic settings'}</button></div>
    </form>
  </div>;
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={`text-sm font-medium ${className}`}>{label}{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
