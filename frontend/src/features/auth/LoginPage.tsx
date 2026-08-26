import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useClinicSettings } from '../settings/clinicSettings';
import { useAuth } from './auth';

const schema = z.object({ email: z.email('Enter a valid email address'), password: z.string().min(8, 'Password must contain at least 8 characters') });
type Form = z.infer<typeof schema>;
const heroImage = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85';

export default function LoginPage() {
  const { login } = useAuth();
  const { clinic } = useClinicSettings();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => { document.title = `${clinic.clinicName} · Clinic Management System`; }, [clinic.clinicName]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && !isSubmitting && setLoginOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isSubmitting]);

  async function submit(values: Form) {
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch {
      toast.error('Invalid email or password.');
    }
  }

  return <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
    <img src={heroImage} alt="Medical professional using a digital clinic system" className="absolute inset-0 h-full w-full object-cover"/>
    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-brand-950/35"/>
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/35"/>

    <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {clinic.logoUrl ? <img src={clinic.logoUrl} className="h-11 w-11 rounded-xl bg-white object-contain p-1" alt={`${clinic.shortName} logo`}/> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-emerald-300 backdrop-blur"><Activity/></span>}
          <div><strong className="block text-lg leading-tight">{clinic.clinicName}</strong><span className="text-xs text-white/65">Clinic Management System</span></div>
        </div>
        <button onClick={() => setLoginOpen(true)} className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white hover:text-slate-950">Staff login</button>
      </header>

      <section className="my-auto max-w-3xl py-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100 backdrop-blur"><ShieldCheck size={17}/>Secure and connected patient care</div>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.08] sm:text-5xl lg:text-7xl">Manage your clinic with clarity and confidence.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">One trusted workspace for patients, consultations, treatments, medicine stock, billing, payments and clinic performance.</p>
        <button onClick={() => setLoginOpen(true)} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 font-bold text-slate-950 shadow-xl shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-300">Open staff portal <ArrowRight size={18}/></button>
      </section>

      <footer className="grid gap-3 border-t border-white/15 py-5 text-sm text-white/65 sm:grid-cols-3">
        <span>Patient records</span><span>Medicine and stock control</span><span>Billing and financial reporting</span>
      </footer>
    </div>

    {loginOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !isSubmitting) setLoginOpen(false); }}>
      <form onSubmit={handleSubmit(submit)} className="relative w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <button type="button" aria-label="Close login" disabled={isSubmitting} onClick={() => setLoginOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"><X size={20}/></button>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><LockKeyhole/></div>
        <div><p className="font-semibold text-brand-700">{clinic.shortName} staff portal</p><h2 className="mt-1 text-3xl font-bold">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Use the account provided by your clinic administrator.</p></div>
        <label className="block text-sm font-medium">Email<input className="input mt-1" type="email" autoComplete="email" autoFocus {...register('email')}/><span className="text-xs text-red-600">{errors.email?.message}</span></label>
        <label className="block text-sm font-medium">Password<div className="relative mt-1"><input className="input pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...register('password')}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-brand-700">{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div><span className="text-xs text-red-600">{errors.password?.message}</span></label>
        <button className="btn-primary w-full py-3" disabled={isSubmitting}>{isSubmitting ? 'Signing in securely…' : 'Sign in'}</button>
      </form>
    </div>}
  </main>;
}
