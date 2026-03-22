import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './axios';
import { queryClient } from './queryClient';
import type { Case, CaseStatus, Page } from '@/types';

export const caseKeys = {
  all: ['cases'] as const,
  list: (filters: Record<string, unknown>) => ['cases', 'list', filters] as const,
  detail: (id: string) => ['cases', id] as const,
};

export function useCases(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: caseKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Page<Case>>('/cases', { params: filters });
      return data;
    },
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Case>(`/cases/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAddCaseNote() {
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post(`/cases/${id}/notes`, { content }),
    onSuccess: (_, { id }) =>
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(id) }),
  });
}

export function useUpdateCaseStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CaseStatus }) =>
      api.put(`/cases/${id}/status`, { status }),
    onSuccess: (_, { id }) =>
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(id) }),
  });
}
