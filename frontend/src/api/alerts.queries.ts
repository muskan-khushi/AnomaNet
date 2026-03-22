import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './axios';
import { queryClient } from './queryClient';
import type {
  Alert,
  AlertFilters,
  AlertExplanation,
  AlertStatus,
  Page,
} from '@/types';

export const alertKeys = {
  all: ['alerts'] as const,
  list: (filters: AlertFilters) => ['alerts', 'list', filters] as const,
  detail: (id: string) => ['alerts', id] as const,
  explanation: (id: string) => ['alerts', id, 'explanation'] as const,
};

export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: alertKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Page<Alert>>('/alerts', { params: filters });
      return data;
    },
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: alertKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Alert>(`/alerts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAlertExplanation(id: string) {
  return useQuery({
    queryKey: alertKeys.explanation(id),
    queryFn: async () => {
      const { data } = await api.get<AlertExplanation>(`/alerts/${id}/explanation`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateAlertStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) =>
      api.put(`/alerts/${id}/status`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

export function useAssignAlert() {
  return useMutation({
    mutationFn: ({ id, investigatorId }: { id: string; investigatorId: string }) =>
      api.put(`/alerts/${id}/assign`, { investigatorId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.detail(id) });
    },
  });
}
