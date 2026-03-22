'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/api/axios';
import type { User } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, setUser, clearAuth } = useAuthStore();
  const router = useRouter();

  async function login(employeeId: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>(
      '/auth/login',
      { username: employeeId, password }
    );
    setUser(data.user);
    router.push('/dashboard');
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/login');
  }

  return { user, isAuthenticated, login, logout };
}
