import { create } from 'zustand';
import type { GraphNode } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  selectedNode: GraphNode | null;
  activeAlertId: string | null;
  activeCaseId: string | null;
  setSidebarCollapsed: (v: boolean) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setActiveAlertId: (id: string | null) => void;
  setActiveCaseId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  selectedNode: null,
  activeAlertId: null,
  activeCaseId: null,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setActiveAlertId: (id) => set({ activeAlertId: id }),
  setActiveCaseId: (id) => set({ activeCaseId: id }),
}));
