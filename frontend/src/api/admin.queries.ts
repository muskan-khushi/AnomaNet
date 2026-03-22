import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './axios';
import { queryClient } from './queryClient';
import type { SystemConfig, InvestigatorUser, SimulatorTriggerResult, FraudScenario } from '@/types';

export function useSystemConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      const { data } = await api.get<SystemConfig>('/admin/config');
      return data;
    },
  });
}

export function useUpdateConfig() {
  return useMutation({
    mutationFn: (config: SystemConfig) => api.put('/admin/config', config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config'] }),
  });
}

export function useInvestigators() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get<InvestigatorUser[]>('/admin/users');
      return data;
    },
  });
}

export function useFireScenario() {
  return useMutation({
    mutationFn: (type: FraudScenario) =>
      api.post<SimulatorTriggerResult>(`/simulate/scenario?type=${type}`),
  });
}

export function useAccounts(q: string) {
  return useQuery({
    queryKey: ['accounts', 'search', q],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; label: string }[]>(
        '/accounts/search',
        { params: { q } }
      );
      return data;
    },
    enabled: q.length >= 3,
  });
}
