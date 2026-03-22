import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { Report } from '@/types';

export function useGenerateReport() {
  return useMutation({
    mutationFn: (caseId: string) =>
      api.post<Report>('/reports/generate', { caseId, format: 'PDF' }),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: async () => {
      const { data } = await api.get<Report>(`/reports/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
