'use client';

import { useState } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { Save, UserPlus, ShieldAlert, Users, CheckCircle2 } from 'lucide-react';
import type { InvestigatorUser } from '@/types';

interface Weights {
  circular: number;
  layering: number;
  structuring: number;
  profile_mismatch: number;
  dormant: number;
}

const INITIAL_WEIGHTS: Weights = {
  circular:         0.30,
  layering:         0.25,
  structuring:      0.20,
  profile_mismatch: 0.15,
  dormant:          0.10,
};

const SEED_USERS: InvestigatorUser[] = [
  { id: 'u1', name: 'S. Rathore', employee_id: 'INV-2024-0042', role: 'INVESTIGATOR', status: 'ACTIVE' },
  { id: 'u2', name: 'M. Mehta',   employee_id: 'ADM-2024-0001', role: 'ADMIN',        status: 'ACTIVE' },
  { id: 'u3', name: 'P. Verma',   employee_id: 'INV-2024-0031', role: 'INVESTIGATOR', status: 'INACTIVE' },
];

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  circular:         'Circular',
  layering:         'Layering',
  structuring:      'Structuring',
  profile_mismatch: 'Profile Mismatch',
  dormant:          'Dormancy',
};

const WEIGHT_COLORS: Record<keyof Weights, string> = {
  circular:         '#ff3d5a',
  layering:         '#f59e0b',
  structuring:      '#526cff',
  profile_mismatch: '#00d4aa',
  dormant:          '#8892b8',
};

export default function AdminSettingsPage() {
  const [threshold,    setThreshold]    = useState(0.65);
  const [pepThreshold, setPepThreshold] = useState(0.45);
  const [weights,      setWeights]      = useState<Weights>(INITIAL_WEIGHTS);
  const [users,        setUsers]        = useState(SEED_USERS);
  const [newEmpId,     setNewEmpId]     = useState('');
  const [saved,        setSaved]        = useState(false);

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const valid = Math.abs(weightSum - 1.0) < 0.001;

  function updateWeight(key: keyof Weights, val: number) {
    setWeights((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function handleSave() {
    if (!valid) return;
    // In production: await api.put('/admin/config', { threshold, pepThreshold, weights })
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function addUser() {
    if (!newEmpId.trim()) return;
    const u: InvestigatorUser = {
      id: Math.random().toString(36).slice(2),
      name: newEmpId,
      employee_id: newEmpId,
      role: 'INVESTIGATOR',
      status: 'ACTIVE',
    };
    setUsers((p) => [...p, u]);
    setNewEmpId('');
  }

  return (
    <AppShell title="Admin Settings">
      <div className="space-y-6 animate-fade-in max-w-4xl">

        {/* Role warning */}
        <div className="card p-3 border-warning/30 bg-warning/5 flex items-center gap-2 text-xs text-warning">
          <ShieldAlert size={14} />
          Admin role required · All changes are audit-logged and applied immediately
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Alert Thresholds ── */}
          <div className="card p-5 space-y-5">
            <p className="text-sm font-semibold text-text flex items-center gap-2">
              <ShieldAlert size={15} className="text-accent" />
              Alert Thresholds
            </p>

            {/* Standard threshold */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-text-2">Standard Accounts</label>
                <span className="text-sm font-mono font-bold text-text">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.50} max={0.90} step={0.01}
                value={threshold}
                onChange={(e) => { setThreshold(parseFloat(e.target.value)); setSaved(false); }}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-text-3 font-mono mt-1">
                <span>0.50</span><span>Sensitive</span><span>0.90</span>
              </div>
            </div>

            {/* PEP threshold */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-text-2">PEP Accounts</label>
                <span className="text-sm font-mono font-bold text-warning">{pepThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.30} max={0.70} step={0.01}
                value={pepThreshold}
                onChange={(e) => { setPepThreshold(parseFloat(e.target.value)); setSaved(false); }}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-text-3 font-mono mt-1">
                <span>0.30</span><span>Enhanced DD</span><span>0.70</span>
              </div>
            </div>

            {/* Pattern weights */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Pattern Weights</p>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  valid ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                }`}>
                  Sum = {weightSum.toFixed(2)} {valid ? '✓' : '✗ must = 1.00'}
                </span>
              </div>

              <div className="space-y-3">
                {(Object.keys(weights) as (keyof Weights)[]).map((key) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-text-2">{WEIGHT_LABELS[key]}</label>
                      <span className="text-xs font-mono font-bold" style={{ color: WEIGHT_COLORS[key] }}>
                        {weights[key].toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range" min={0.00} max={0.60} step={0.01}
                      value={weights[key]}
                      onChange={(e) => updateWeight(key, parseFloat(e.target.value))}
                      className="w-full"
                      style={{ accentColor: WEIGHT_COLORS[key] }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!valid}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                saved
                  ? 'bg-success/15 text-success border border-success/30'
                  : valid
                  ? 'btn-primary'
                  : 'opacity-40 cursor-not-allowed bg-surface-2 text-text-3 border border-border'
              }`}
            >
              {saved ? <><CheckCircle2 size={13} /> Saved</> : <><Save size={13} /> Save Config</>}
            </button>
          </div>

          {/* ── User Management ── */}
          <div className="card p-5 space-y-5">
            <p className="text-sm font-semibold text-text flex items-center gap-2">
              <Users size={15} className="text-accent" />
              User Management
            </p>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Role', 'Status'].map((h) => (
                    <th key={h} className="section-label text-left pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-text">{u.name}</p>
                      <p className="text-text-3 font-mono text-[10px]">{u.employee_id}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`pill text-[10px] ${
                        u.role === 'ADMIN' ? 'bg-warning/10 text-warning' : 'pill-new'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`pill text-[10px] ${
                        u.status === 'ACTIVE'
                          ? 'bg-success/10 text-success'
                          : 'bg-surface-3 text-text-3'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add investigator */}
            <div>
              <p className="section-label mb-2">Add Investigator</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addUser()}
                  placeholder="Employee ID"
                  className="input flex-1 font-mono text-xs py-2"
                />
                <button onClick={addUser} className="btn-primary !px-3 !py-2 text-xs">
                  <UserPlus size={13} />
                  Add
                </button>
              </div>
            </div>

            {/* Formula display */}
            <div className="bg-bg-2 rounded-lg p-4 border border-border">
              <p className="section-label mb-2">AnomaScore Formula</p>
              <p className="text-[11px] font-mono text-text-2 leading-relaxed">
                AnomaScore ={' '}
                {(Object.keys(weights) as (keyof Weights)[]).map((k, i) => (
                  <span key={k}>
                    <span style={{ color: WEIGHT_COLORS[k] }}>{weights[k].toFixed(2)}</span>
                    <span className="text-text-3">×{k.replace('_', '_')}</span>
                    {i < 4 && <span className="text-text-3"> + </span>}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
