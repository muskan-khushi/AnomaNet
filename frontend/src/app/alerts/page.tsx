'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/Layout/AppShell';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import type { Alert, AlertType, AlertStatus } from '@/types';

// Seed data matching blueprint exactly
const MOCK_ALERTS: Alert[] = [
  { id: 'a1', transaction_id: 't1', account_id: 'ACC-8821904',
    alert_type: 'CIRCULAR', anoma_score: 0.91,
    score_breakdown: { circular: 0.91, layering: 0.82, structuring: 0.45, dormant: 0.12, profile_mismatch: 0.78 },
    status: 'UNDER_REVIEW', assigned_to: 'S. Rathore', evidence_package_id: null,
    created_at: new Date(Date.now() - 120000).toISOString(),
    pattern_label: 'A→B→C→A · 3.8h · Mumbai/Delhi' },
  { id: 'a2', transaction_id: 't2', account_id: 'ACC-2291847',
    alert_type: 'STRUCTURING', anoma_score: 0.83,
    score_breakdown: { circular: 0.1, layering: 0.3, structuring: 0.83, dormant: 0.05, profile_mismatch: 0.2 },
    status: 'NEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 2880000).toISOString(),
    pattern_label: '₹9.6L + ₹9.4L + ₹9.8L · 40 min' },
  { id: 'a3', transaction_id: 't3', account_id: 'ACC-5503912',
    alert_type: 'LAYERING', anoma_score: 0.74,
    score_breakdown: { circular: 0.2, layering: 0.74, structuring: 0.3, dormant: 0.1, profile_mismatch: 0.4 },
    status: 'NEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    pattern_label: 'Fan-out degree 7 · 12 min window' },
  { id: 'a4', transaction_id: 't4', account_id: 'ACC-9012283',
    alert_type: 'DORMANT', anoma_score: 0.68,
    score_breakdown: { circular: 0.05, layering: 0.2, structuring: 0.1, dormant: 0.68, profile_mismatch: 0.3 },
    status: 'ESCALATED', assigned_to: 'S. Rathore', evidence_package_id: null,
    created_at: new Date(Date.now() - 18000000).toISOString(),
    pattern_label: 'Dormant 14mo · ₹1.8Cr activation' },
  { id: 'a5', transaction_id: 't5', account_id: 'ACC-3381029',
    alert_type: 'PROFILE_MISMATCH', anoma_score: 0.71,
    score_breakdown: { circular: 0.1, layering: 0.3, structuring: 0.15, dormant: 0.08, profile_mismatch: 0.71 },
    status: 'NEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 32400000).toISOString(),
    pattern_label: '₹40K income vs ₹2.1Cr transactions' },
];

const TYPE_FILTERS: (AlertType | 'ALL')[] = ['ALL', 'CIRCULAR', 'LAYERING', 'STRUCTURING', 'DORMANT', 'PROFILE_MISMATCH'];

function scoreClass(s: number) {
  if (s >= 0.7) return 'score-high';
  if (s >= 0.4) return 'score-mid';
  return 'score-low';
}

function statusClass(s: AlertStatus) {
  switch (s) {
    case 'NEW': return 'pill-new';
    case 'UNDER_REVIEW': return 'pill-review';
    case 'ESCALATED': return 'pill-escalated';
    case 'REPORTED_FIU': return 'pill-reported';
    default: return 'pill-closed';
  }
}

function typeClass(t: AlertType) {
  switch (t) {
    case 'CIRCULAR': return 'type-circular';
    case 'LAYERING': return 'type-layering';
    case 'STRUCTURING': return 'type-structuring';
    case 'DORMANT': return 'type-dormant';
    default: return 'type-profile';
  }
}

export default function AlertsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL');
  const [minScore, setMinScore] = useState(0.65);

  const filtered = MOCK_ALERTS.filter((a) => {
    if (typeFilter !== 'ALL' && a.alert_type !== typeFilter) return false;
    if (a.anoma_score < minScore) return false;
    if (search && !a.account_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell title="Alerts Queue">
      <div className="space-y-4 animate-fade-in">
        {/* Filters bar */}
        <div className="card p-3 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account ID…"
              className="input pl-9 py-2 text-xs"
            />
          </div>

          {/* Type filter tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all',
                  typeFilter === t
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-text-3 hover:text-text-2 border border-transparent'
                )}
              >
                {t === 'ALL' ? 'All types' : t}
              </button>
            ))}
          </div>

          {/* Score filter */}
          <div className="flex items-center gap-2 text-xs text-text-2">
            <span className="font-mono text-text-3">Score ≥</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="w-20 accent-accent"
            />
            <span className="font-mono w-8">{minScore.toFixed(2)}</span>
          </div>

          <div className="ml-auto text-xs text-text-3 font-mono">
            {filtered.length} active
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[56px_1fr_140px_100px_110px_120px_100px] gap-3 px-4 py-3 border-b border-border bg-bg-2">
            {['Score', 'Account / Pattern', 'Type', 'Amount', 'Status', 'Time', 'Action'].map((h) => (
              <div key={h} className="section-label flex items-center gap-1">
                {h}
                {h === 'Score' && <ArrowUpDown size={9} className="text-text-3" />}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((alert) => (
              <div
                key={alert.id}
                className="grid grid-cols-[56px_1fr_140px_100px_110px_120px_100px] gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors items-center"
              >
                <div className={scoreClass(alert.anoma_score)}>{alert.anoma_score.toFixed(2)}</div>

                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium text-text truncate">{alert.account_id}</p>
                  <p className="text-[11px] text-text-2 truncate mt-0.5">{alert.pattern_label}</p>
                </div>

                <div>
                  <span className={typeClass(alert.alert_type)}>{alert.alert_type}</span>
                </div>

                <div className="text-xs font-mono text-text-2">
                  {alert.score_breakdown.circular > 0.5 ? '₹48.2L' : '₹28.8L'}
                </div>

                <div>
                  <span className={statusClass(alert.status)}>{alert.status.replace('_', ' ')}</span>
                </div>

                <div className="text-[11px] text-text-3 font-mono">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </div>

                <div>
                  <Link
                    href={`/alerts/${alert.id}`}
                    className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors"
                  >
                    Investigate →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
