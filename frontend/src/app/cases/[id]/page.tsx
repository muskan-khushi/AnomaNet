'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/Layout/AppShell';
import FundFlowGraph from '@/components/FundFlowGraph';
import CaseTimeline from '@/components/CaseTimeline';
import ScoreBreakdownPanel from '@/components/ScoreBreakdown';
import { ArrowLeft, FileText, Activity, GitBranch, Clock, ChevronRight } from 'lucide-react';
import type { Case, Alert, Account } from '@/types';

const MOCK_CASE: Case = {
  id: 'CASE-2024-0142',
  alert_id: 'a1',
  status: 'UNDER_REVIEW',
  assigned_to: 'S. Rathore',
  created_at: new Date(Date.now() - 7200000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
  notes: [
    { id: 'n1', content: 'Initial review started. Both counterparties flagged as first-time.', author: 'S. Rathore', created_at: new Date(Date.now() - 3600000).toISOString() },
  ],
  transactions: [],
  alert: {
    id: 'a1',
    transaction_id: 't1',
    account_id: 'ACC-8821904',
    alert_type: 'CIRCULAR',
    anoma_score: 0.91,
    score_breakdown: { circular: 0.91, layering: 0.82, structuring: 0.45, dormant: 0.12, profile_mismatch: 0.78 },
    status: 'UNDER_REVIEW',
    assigned_to: 'S. Rathore',
    evidence_package_id: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    pattern_label: 'A→B→C→A · 3.8h · Mumbai/Delhi',
  },
  account: {
    id: 'ACC-8821904',
    customer_id: 'cust-001',
    account_type: 'SAVINGS',
    kyc_risk_tier: 'HIGH',
    declared_monthly_income: 40000,
    declared_occupation: 'Kirana Shop Owner',
    open_date: '2019-04-12',
    last_transaction_date: new Date().toISOString().split('T')[0],
    is_dormant: false,
    dormant_since: null,
    status: 'ACTIVE',
    customer_name: 'Rajesh Kumar',
    branch_id: 'HDFC0001234',
    city: 'Mumbai',
  },
};

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: Activity },
  { id: 'graph',     label: 'Graph',     icon: GitBranch },
  { id: 'timeline',  label: 'Timeline',  icon: Clock },
  { id: 'evidence',  label: 'Evidence',  icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

export default function CaseInvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [noteText, setNoteText] = useState('');

  const c = MOCK_CASE;
  const acc = c.account;

  return (
    <AppShell title={`Case #${c.id}`}>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/alerts" className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text transition-colors">
            <ArrowLeft size={13} /> Back to Alerts
          </Link>
          <div className="flex items-center gap-3">
            <span className="pill-review">Under Review</span>
            <span className="text-xs text-text-2 font-mono">Assigned: {c.assigned_to}</span>
            <Link href={`/cases/${id}/evidence`} className="btn-primary text-xs !py-2">
              Build Evidence <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-150 -mb-px ${
                activeTab === tid
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-2 hover:text-text'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Account details */}
            <div className="card p-5 space-y-4">
              <p className="section-label">Account Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Account ID',   value: acc?.id },
                  { label: 'Type',         value: acc?.account_type },
                  { label: 'KYC Risk',     value: acc?.kyc_risk_tier,
                    badge: true, color: acc?.kyc_risk_tier === 'HIGH' ? 'text-danger' : 'text-warning' },
                  { label: 'Monthly Income', value: acc ? `₹${acc.declared_monthly_income.toLocaleString('en-IN')}` : '—' },
                  { label: 'Occupation',   value: acc?.declared_occupation },
                  { label: 'Branch',       value: acc?.branch_id },
                  { label: 'City',         value: acc?.city },
                  { label: 'Is Dormant',   value: acc?.is_dormant ? 'Yes' : 'No' },
                ].map(({ label, value, badge, color }) => (
                  <div key={label}>
                    <p className="section-label">{label}</p>
                    <p className={`text-xs mt-0.5 font-mono ${badge ? color : 'text-text'}`}>{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert summary */}
            <div className="space-y-4">
              <div className="card p-5">
                <p className="section-label mb-3">Alert Summary</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'AnomaScore',    value: c.alert.anoma_score.toFixed(2), color: 'text-danger' },
                    { label: 'Pattern',       value: c.alert.alert_type },
                    { label: 'Cycle',         value: 'A→B→C→A · 3.8h' },
                    { label: 'Total Amount',  value: '₹48.2L' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-text-2">{label}</span>
                      <span className={`text-xs font-mono font-semibold ${color ?? 'text-text'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Counterparties */}
              <div className="card p-5">
                <p className="section-label mb-3">Counterparties in Cycle</p>
                {[
                  { id: 'ACC-9876543', score: 0.74, first: true },
                  { id: 'ACC-1112131', score: 0.88, first: true },
                ].map((cp) => (
                  <div key={cp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text">{cp.id}</span>
                      {cp.first && (
                        <span className="text-[9px] font-mono text-warning border border-warning/30 bg-warning/10 px-1.5 py-0.5 rounded">
                          First-time
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-mono font-bold ${cp.score >= 0.7 ? 'text-danger' : 'text-warning'}`}>
                      Score {cp.score}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="card p-4">
                <p className="section-label mb-3">Investigator Notes</p>
                {c.notes.map((n) => (
                  <div key={n.id} className="text-xs text-text-2 bg-bg-2 rounded-lg p-3 mb-2">
                    <p className="leading-relaxed">{n.content}</p>
                    <p className="text-text-3 mt-1.5 font-mono">{n.author}</p>
                  </div>
                ))}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add investigation note…"
                  rows={2}
                  className="input text-xs resize-none mt-2"
                />
                <button className="btn-secondary text-xs mt-2">Add Note</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-2">Fund flow graph centred on <span className="font-mono text-text">ACC-8821904</span> · depth=2</p>
            </div>
            <FundFlowGraph height={580} />
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <p className="text-xs text-text-2 mb-4">Chronological transaction trail for this case</p>
            <CaseTimeline transactions={c.transactions} alertTransactionId="tx1" />
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="card p-6">
            <p className="text-sm font-semibold text-text mb-2">Evidence Builder</p>
            <p className="text-xs text-text-2 mb-5">
              Complete the evidence package and generate the FIU report PDF.
            </p>
            <Link href={`/cases/${id}/evidence`} className="btn-primary">
              Open Evidence Builder →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
