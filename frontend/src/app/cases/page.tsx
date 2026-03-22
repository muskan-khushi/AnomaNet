'use client';

import Link from 'next/link';
import AppShell from '@/components/Layout/AppShell';
import { formatDistanceToNow } from 'date-fns';
import { FolderOpen } from 'lucide-react';

const MOCK_CASES = [
  { id: 'CASE-2024-0142', alert_type: 'CIRCULAR',         anoma_score: 0.91, account_id: 'ACC-8821904', status: 'UNDER_REVIEW', assigned_to: 'S. Rathore', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'CASE-2024-0141', alert_type: 'STRUCTURING',      anoma_score: 0.83, account_id: 'ACC-2291847', status: 'OPEN',         assigned_to: null,         created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'CASE-2024-0139', alert_type: 'DORMANT',          anoma_score: 0.68, account_id: 'ACC-9012283', status: 'ESCALATED',    assigned_to: 'S. Rathore', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'CASE-2024-0137', alert_type: 'PROFILE_MISMATCH', anoma_score: 0.71, account_id: 'ACC-3381029', status: 'CLOSED_SAR',   assigned_to: 'M. Mehta',   created_at: new Date(Date.now() - 432000000).toISOString() },
];

function statusClass(s: string) {
  switch (s) {
    case 'OPEN':         return 'pill-new';
    case 'UNDER_REVIEW': return 'pill-review';
    case 'ESCALATED':    return 'pill-escalated';
    case 'CLOSED_SAR':   return 'pill-reported';
    default:             return 'pill-closed';
  }
}

export default function CasesPage() {
  return (
    <AppShell title="Cases">
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-2">{MOCK_CASES.length} cases · sorted by severity</p>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_130px_90px_110px_120px_90px] gap-3 px-4 py-3 border-b border-border bg-bg-2">
            {['Score','Case / Account','Type','Status','Assigned','Opened','Action'].map((h) => (
              <div key={h} className="section-label">{h}</div>
            ))}
          </div>

          <div className="divide-y divide-border">
            {MOCK_CASES.map((c) => {
              const sc = c.anoma_score;
              const scColor = sc >= 0.7 ? 'text-danger' : sc >= 0.4 ? 'text-warning' : 'text-success';
              const scBg    = sc >= 0.7 ? 'bg-danger/10 border-danger/25' : sc >= 0.4 ? 'bg-warning/10 border-warning/25' : 'bg-success/10 border-success/25';

              return (
                <div key={c.id} className="grid grid-cols-[48px_1fr_130px_90px_110px_120px_90px] gap-3 px-4 py-3.5 items-center hover:bg-surface-2 transition-colors">
                  <div className={`text-xs font-mono font-bold px-1.5 py-1 rounded border text-center ${scColor} ${scBg}`}>
                    {sc.toFixed(2)}
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold text-text">{c.id}</p>
                    <p className="text-[11px] text-text-2 mt-0.5">{c.account_id}</p>
                  </div>
                  <div>
                    <span className={`type-badge ${
                      c.alert_type === 'CIRCULAR'         ? 'type-circular'   :
                      c.alert_type === 'STRUCTURING'      ? 'type-structuring' :
                      c.alert_type === 'DORMANT'          ? 'type-dormant'     :
                      c.alert_type === 'LAYERING'         ? 'type-layering'    :
                      'type-profile'
                    }`}>
                      {c.alert_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className={statusClass(c.status)}>{c.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-[11px] text-text-2 font-mono">{c.assigned_to ?? '—'}</div>
                  <div className="text-[11px] text-text-3 font-mono">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </div>
                  <div>
                    <Link href={`/cases/${c.id}`} className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors">
                      Open →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
