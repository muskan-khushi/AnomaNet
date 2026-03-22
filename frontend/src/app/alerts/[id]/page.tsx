'use client';

import { use } from 'react';
import Link from 'next/link';
import AppShell from '@/components/Layout/AppShell';
import FundFlowGraph from '@/components/FundFlowGraph';
import ScoreBreakdownPanel from '@/components/ScoreBreakdown';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Alert, AlertExplanation } from '@/types';

const MOCK_ALERT: Alert = {
  id: 'a1',
  transaction_id: 't1',
  account_id: 'ACC-8821904',
  alert_type: 'CIRCULAR',
  anoma_score: 0.91,
  score_breakdown: { circular: 0.91, layering: 0.82, structuring: 0.45, dormant: 0.12, profile_mismatch: 0.78 },
  status: 'UNDER_REVIEW',
  assigned_to: 'S. Rathore',
  evidence_package_id: null,
  created_at: new Date(Date.now() - 120000).toISOString(),
  pattern_label: 'A→B→C→A · 3.8h · Mumbai/Delhi',
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

const MOCK_EXPLANATION: AlertExplanation = {
  explanation:
    'Account 8821904 transferred ₹48.2L to account 9876543, which transferred ₹47.9L to account 1112131, which transferred ₹47.6L back to account 8821904 — completing a financial cycle in 3.8 hours across branches in Mumbai and Delhi. Two of the three counterparty relationships were first-time transactions.',
  evidence_points: [
    'Directed cycle detected: ACC-8821904 → ACC-9876543 → ACC-1112131 → ACC-8821904',
    'Cycle completed in 3.8 hours (threshold: 72 hours)',
    'Amount variance: 1.3% (threshold: ±15%)',
    '2 of 3 counterparty relationships are first-time transactions',
  ],
};

export default function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AppShell title={`Alert — ACC-8821904`}>
      <div className="space-y-5 animate-fade-in">
        {/* Back + header */}
        <div className="flex items-center justify-between">
          <Link href="/alerts" className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text transition-colors">
            <ArrowLeft size={13} /> Back to Alerts
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-3">Alert ID: {id}</span>
            <Link href={`/cases/${id}`} className="btn-primary text-xs !py-2">
              Open Case <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Alert summary banner */}
        <div className="card p-4 border-danger/30 bg-danger/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-12 rounded-xl bg-danger/15 border border-danger/30 flex items-center justify-center">
                <span className="text-xl font-bold font-mono text-danger">0.91</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="type-circular">CIRCULAR TRANSACTION</span>
                </div>
                <p className="text-sm font-mono font-semibold text-text">{MOCK_ALERT.account_id}</p>
                <p className="text-xs text-text-2 mt-0.5">{MOCK_ALERT.pattern_label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs flex-shrink-0">
              <span className="pill-review">Under Review</span>
              <span className="text-text-3 font-mono">Assigned: {MOCK_ALERT.assigned_to}</span>
            </div>
          </div>
        </div>

        {/* Graph + Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Graph - takes 2 cols */}
          <div className="xl:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-text">Fund Flow Graph</p>
              <span className="text-[10px] text-text-3 font-mono">Neo4j → D3.js force · depth=3</span>
            </div>
            <FundFlowGraph height={480} />
          </div>

          {/* Score breakdown */}
          <div>
            <p className="text-xs font-semibold text-text mb-2">Score Breakdown</p>
            <ScoreBreakdownPanel
              breakdown={MOCK_ALERT.score_breakdown}
              explanation={MOCK_EXPLANATION}
            />
          </div>
        </div>

        {/* AI Explanation */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan" />
            <p className="text-xs font-semibold text-text">AI Explanation — Explainability Engine</p>
          </div>
          <p className="text-sm text-text-2 leading-relaxed">{MOCK_EXPLANATION.explanation}</p>
          <div className="mt-4 space-y-1.5">
            {MOCK_EXPLANATION.evidence_points.map((pt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text-2">
                <span className="text-cyan mt-0.5 flex-shrink-0">·</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href={`/cases/${id}`} className="btn-primary">
            Open Case →
          </Link>
          <button className="btn-secondary">Assign to Me</button>
          <button className="btn-danger">Mark False Positive</button>
        </div>
      </div>
    </AppShell>
  );
}
