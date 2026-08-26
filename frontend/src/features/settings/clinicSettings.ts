import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/services/api';

export interface ClinicSettings {
  id: string;
  clinicName: string;
  shortName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  primaryContact: string | null;
  receiptFooter: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fallbackClinicSettings: ClinicSettings = {
  id: '', clinicName: 'Medical Clinic', shortName: 'Clinic', logoUrl: null, phone: null,
  email: null, address: null, currency: 'UGX', timezone: 'Africa/Kampala', primaryContact: null,
  receiptFooter: null, createdAt: '', updatedAt: '',
};

export function useClinicSettings() {
  const query = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => (await api.get<ClinicSettings>('/settings/clinic')).data,
    staleTime: 10 * 60_000,
    retry: 2,
  });
  const clinic = query.data ?? fallbackClinicSettings;
  useEffect(() => { document.documentElement.dataset.currency = clinic.currency; }, [clinic.currency]);
  return { ...query, clinic };
}

export const formatClinicMoney = (amount: number = 0) => `${document.documentElement.dataset.currency || 'UGX'} ${Number(amount || 0).toLocaleString()}`;

export function useClinicMoney() {
  const { clinic } = useClinicSettings();
  return useCallback((amount: number = 0) => `${clinic.currency} ${Number(amount || 0).toLocaleString()}`, [clinic.currency]);
}
