'use client';

import { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Role = 'Investigator' | 'Admin';

export default function LoginPage() {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState('INV-2024-0042');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Investigator');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(employeeId, password);
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-in">
        {/* Card */}
        <div className="card p-8 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Shield size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-text tracking-wide">AnomaNet</h1>
              <p className="text-[10px] font-mono text-text-3 uppercase tracking-widest">FIU Intelligence Platform</p>
            </div>
          </div>

          <p className="text-xs text-text-2 mb-6 pb-5 border-b border-border">
            Secure investigator access — FIU-IND compliant session
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID */}
            <div>
              <label className="section-label block mb-1.5">Employee ID</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="INV-2024-0042"
                  className="input pl-9 font-mono text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2"
                >
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Role toggle */}
            <div>
              <label className="section-label block mb-1.5">Role</label>
              <div className="flex gap-2">
                {(['Investigator', 'Admin'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      role === r
                        ? 'bg-accent/15 text-accent border-accent/40'
                        : 'bg-transparent text-text-2 border-border hover:border-border-bright'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 h-11"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In → Secure Session'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-[10px] text-text-3 font-mono text-center mt-5 flex items-center justify-center gap-1.5">
            <Lock size={9} />
            256-bit JWT · Session expires in 8 hours · Audit logged
          </p>
        </div>
      </div>
    </div>
  );
}
