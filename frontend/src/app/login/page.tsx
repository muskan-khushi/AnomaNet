// 'use client';

// import { useState } from 'react';
// import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react';
// import { useAuth } from '@/hooks/useAuth';

// type Role = 'Investigator' | 'Admin';

// export default function LoginPage() {
//   const { login } = useAuth();
//   const [employeeId, setEmployeeId] = useState('INV-2024-0042');
//   const [password, setPassword] = useState('');
//   const [role, setRole] = useState<Role>('Investigator');
//   const [showPw, setShowPw] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
//     try {
//       await login(employeeId, password);
//     } catch {
//       setError('Invalid credentials. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-bg grid-bg flex items-center justify-center p-4 relative overflow-hidden">
//       {/* Ambient glows */}
//       <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
//       <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan/5 rounded-full blur-3xl pointer-events-none" />

//       <div className="w-full max-w-sm animate-fade-in">
//         {/* Card */}
//         <div className="card p-8 shadow-2xl shadow-black/50">
//           {/* Header */}
//           <div className="flex items-center gap-3 mb-8">
//             <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
//               <Shield size={18} className="text-accent" />
//             </div>
//             <div>
//               <h1 className="text-lg font-bold font-display text-text tracking-wide">AnomaNet</h1>
//               <p className="text-[10px] font-mono text-text-3 uppercase tracking-widest">FIU Intelligence Platform</p>
//             </div>
//           </div>

//           <p className="text-xs text-text-2 mb-6 pb-5 border-b border-border">
//             Secure investigator access — FIU-IND compliant session
//           </p>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Employee ID */}
//             <div>
//               <label className="section-label block mb-1.5">Employee ID</label>
//               <div className="relative">
//                 <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
//                 <input
//                   type="text"
//                   value={employeeId}
//                   onChange={(e) => setEmployeeId(e.target.value)}
//                   placeholder="INV-2024-0042"
//                   className="input pl-9 font-mono text-sm"
//                   required
//                 />
//               </div>
//             </div>

//             {/* Password */}
//             <div>
//               <label className="section-label block mb-1.5">Password</label>
//               <div className="relative">
//                 <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
//                 <input
//                   type={showPw ? 'text' : 'password'}
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="••••••••••••"
//                   className="input pl-9 pr-10"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPw(!showPw)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2"
//                 >
//                   {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
//                 </button>
//               </div>
//             </div>

//             {/* Role toggle */}
//             <div>
//               <label className="section-label block mb-1.5">Role</label>
//               <div className="flex gap-2">
//                 {(['Investigator', 'Admin'] as Role[]).map((r) => (
//                   <button
//                     key={r}
//                     type="button"
//                     onClick={() => setRole(r)}
//                     className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${
//                       role === r
//                         ? 'bg-accent/15 text-accent border-accent/40'
//                         : 'bg-transparent text-text-2 border-border hover:border-border-bright'
//                     }`}
//                   >
//                     {r}
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {error && (
//               <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
//                 {error}
//               </p>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="btn-primary w-full justify-center mt-2 h-11"
//             >
//               {loading ? (
//                 <span className="flex items-center gap-2">
//                   <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                   Authenticating...
//                 </span>
//               ) : (
//                 'Sign In → Secure Session'
//               )}
//             </button>
//           </form>

//           {/* Footer note */}
//           <p className="text-[10px] text-text-3 font-mono text-center mt-5 flex items-center justify-center gap-1.5">
//             <Lock size={9} />
//             256-bit JWT · Session expires in 8 hours · Audit logged
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Lock, User, FlaskConical } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type Role = 'Investigator' | 'Admin';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [employeeId, setEmployeeId] = useState('INV-2024-0042');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Investigator');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── MOCK LOGIN — bypasses backend, works without API ──────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // fake loading feel
    setUser({
      id:         'mock-user-001',
      name:       'S. Rathore',
      role:       role === 'Admin' ? 'ADMIN' : 'INVESTIGATOR',
      employeeId: employeeId,
    });
    router.push('/dashboard');
  }

  // One-click demo bypass
  function handleDemoLogin() {
    setUser({ id: 'mock-user-001', name: 'S. Rathore', role: 'INVESTIGATOR', employeeId: 'INV-2024-0042' });
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'rgba(82,108,255,0.05)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'rgba(0,212,170,0.04)', filter: 'blur(80px)' }} />

      <div className="w-full max-w-sm animate-fade-in">
        {/* Dev mode banner */}
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--warning)' }}>
          <FlaskConical size={12} />
          Dev mode — backend not required
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(82,108,255,0.15)', border: '1px solid rgba(82,108,255,0.3)' }}>
              <Shield size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-text tracking-wide">AnomaNet</h1>
              <p className="text-[10px] font-mono text-text-3 uppercase tracking-widest">FIU Intelligence Platform</p>
            </div>
          </div>

          <p className="text-xs text-text-2 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
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
                  placeholder="any password works in dev mode"
                  className="input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3"
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
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-150"
                    style={{
                      background: role === r ? 'rgba(82,108,255,0.15)' : 'transparent',
                      color:      role === r ? 'var(--accent)' : 'var(--text-2)',
                      borderColor: role === r ? 'rgba(82,108,255,0.4)' : 'var(--border)',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 h-11"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In → Secure Session'
              )}
            </button>
          </form>

          {/* Quick demo bypass */}
          <button
            onClick={handleDemoLogin}
            className="w-full mt-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={{ background: 'rgba(0,212,170,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,212,170,0.2)' }}
          >
            ⚡ Quick Demo Login (skip form)
          </button>

          <p className="text-[10px] text-text-3 font-mono text-center mt-5 flex items-center justify-center gap-1.5">
            <Lock size={9} />
            Mock session · No backend required · All pages accessible
          </p>
        </div>
      </div>
    </div>
  );
}