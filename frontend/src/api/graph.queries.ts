import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { GraphData } from '@/types';

export const graphKeys = {
  subgraph: (accountId: string, depth: number, hours: number) =>
    ['graph', 'subgraph', accountId, depth, hours] as const,
  stats: (id: string) => ['graph', 'stats', id] as const,
};

export function useGraph(accountId: string, depth = 2, hours = 168) {
  return useQuery({
    queryKey: graphKeys.subgraph(accountId, depth, hours),
    queryFn: async () => {
      const { data } = await api.post<GraphData>('/graph/subgraph', {
        accountId,
        depth,
        hours,
      });
      return data;
    },
    enabled: !!accountId,
  });
}

export function useAccountStats(id: string) {
  return useQuery({
    queryKey: graphKeys.stats(id),
    queryFn: async () => {
      const { data } = await api.get(`/graph/account/${id}/stats`);
      return data;
    },
    enabled: !!id,
  });
}
