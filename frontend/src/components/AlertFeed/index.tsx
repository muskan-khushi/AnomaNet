'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import type { Alert, AlertType } from '@/types';

// Mock seed data that looks exactly like blueprint
const SEED_ALERTS: Alert[] = [
  { id: 'a1', transaction_id: 't1', account_id: 'ACC-8821904', alert_type: 'CIRCULAR',
    anoma_score: 0.91, score_breakdown: { circular: 0.91, layering: 0.82, structuring: 0.45, dormant: 0.12, profile_mismatch: 0.78 },
    status: 'UNDER_REVIEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 120000).toISOString(), pattern_label: 'CIRCULAR · 3-hop cycle' },
  { id: 'a2', transaction_id: 't2', account_id: 'ACC-2291847', alert_type: 'STRUCTURING',
    anoma_score: 0.83, score_breakdown: { circular: 0.1, layering: 0.3, structuring: 0.83, dormant: 0.05, profile_mismatch: 0.2 },
    status: 'NEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 2880000).toISOString(), pattern_label: 'STRUCTURING · ₹9.6L×3' },
  { id: 'a3', transaction_id: 't3', account_id: 'ACC-5503912', alert_type: 'LAYERING',
    anoma_score: 0.74, score_breakdown: { circular: 0.2, layering: 0.74, structuring: 0.3, dormant: 0.1, profile_mismatch: 0.4 },
    status: 'NEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 7200000).toISOString(), pattern_label: 'LAYERING · fan-out 7' },
  { id: 'a4', transaction_id: 't4', account_id: 'ACC-9012283', alert_type: 'DORMANT',
    anoma_score: 0.68, score_breakdown: { circular: 0.05, layering: 0.2, structuring: 0.1, dormant: 0.68, profile_mismatch: 0.3 },
    status: 'ESCALATED', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 18000000).toISOString(), pattern_label: 'DORMANT · ₹1.8Cr activation' },
  { id: 'a5', transaction_id: 't5', account_id: 'ACC-3381029', alert_type: 'PROFILE_MISMATCH',
    anoma_score: 0.71, score_breakdown: { circular: 0.1, layering: 0.3, structuring: 0.15, dormant: 0.08, profile_mismatch: 0.71 },
    status: 'NEW', assigned_to: null, evidence_package_id: null,
    created_at: new Date(Date.now() - 32400000).toISOString(), pattern_label: 'PROFILE MISMATCH' },
];

function scoreColor(s: number) {
  if (s >= 0.7) return { bg: 'bg-danger/15', text: 'text-danger', border: 'border-danger/25' };
  if (s >= 0.4) return { bg: 'bg-warning/15', text: 'text-warning', border: 'border-warning/25' };
  return { bg: 'bg-success/15', text: 'text-success', border: 'border-success/25' };
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

export default function AlertFeed({ limit = 8 }: { limit?: number }) {
  const [alerts, setAlerts] = useState<Alert[]>(SEED_ALERTS);

  // Simulate new alert arriving live
  useEffect(() => {
    const types: AlertType[] = ['CIRCULAR', 'LAYERING', 'STRUCTURING', 'DORMANT', 'PROFILE_MISMATCH'];
    const id = setInterval(() => {
      const t = types[Math.floor(Math.random() * types.length)];
      const score = parseFloat((Math.random() * 0.3 + 0.65).toFixed(2));
      const newAlert: Alert = {
        id: Math.random().toString(36).slice(2),
        transaction_id: Math.random().toString(36).slice(2),
        account_id: `ACC-${Math.floor(Math.random() * 9000000 + 1000000)}`,
        alert_type: t,
        anoma_score: score,
        score_breakdown: { circular: 0.1, layering: 0.1, structuring: 0.1, dormant: 0.1, profile_mismatch: 0.1 },
        status: 'NEW',
        assigned_to: null,
        evidence_package_id: null,
        created_at: new Date().toISOString(),
        pattern_label: t,
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 20));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-text">Alert Feed</p>
        <div className="flex items-center gap-1.5 text-xs text-success">
          <span className="live-dot" />
          <span className="font-mono">WS Live</span>
        </div>
      </div>

      <div className="divide-y divide-border overflow-y-auto" style={{ maxHeight: 420 }}>
        {alerts.slice(0, limit).map((alert, i) => {
          const sc = scoreColor(alert.anoma_score);
          return (
            <Link
              key={alert.id}
              href={`/alerts/${alert.id}`}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors duration-150 group',
                i === 0 && 'animate-slide-in'
              )}
            >
              {/* Score badge */}
              <div className={clsx('w-12 h-7 rounded flex items-center justify-center text-xs font-mono font-bold border flex-shrink-0', sc.bg, sc.text, sc.border)}>
                {alert.anoma_score.toFixed(2)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-mono font-medium text-text group-hover:text-accent transition-colors">
                    {alert.account_id}
                  </span>
                  <span className={typeClass(alert.alert_type)}>
                    {alert.alert_type}
                  </span>
                </div>
                <p className="text-xs text-text-2 truncate">{alert.pattern_label}</p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-text-3 font-mono flex-shrink-0">
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: false })} ago
              </span>
            </Link>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border">
        <Link href="/alerts" className="text-xs text-accent hover:text-accent-hover transition-colors">
          View all alerts →
        </Link>
      </div>
    </div>
  );
}
