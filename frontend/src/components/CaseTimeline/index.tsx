'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { Flag, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Transaction } from '@/types';

interface CaseTimelineProps {
  transactions: Transaction[];
  alertTransactionId?: string;
}

const CHANNEL_ICONS: Record<string, string> = {
  NEFT: 'N', RTGS: 'R', IMPS: 'I', UPI: 'U', SWIFT: 'S', CASH: 'C', BRANCH: 'B',
};

function formatINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${(n / 1000).toFixed(0)}K`;
}

// Mock transactions if none provided
const MOCK_TXS: Transaction[] = [
  { id: 'tx1', reference_number: 'HDFC0001234', source_account_id: 'ACC-8821904', dest_account_id: 'ACC-9876543',
    amount: 4820000, channel: 'NEFT', initiated_at: new Date(Date.now() - 13680000).toISOString(),
    settled_at: null, branch_id: 'HDFC0001234', status: 'SETTLED', metadata: {} },
  { id: 'tx2', reference_number: 'HDFC0009988', source_account_id: 'ACC-9876543', dest_account_id: 'ACC-1112131',
    amount: 4790000, channel: 'RTGS', initiated_at: new Date(Date.now() - 13680000 + 14000000).toISOString(),
    settled_at: null, branch_id: 'HDFC0009988', status: 'SETTLED', metadata: {} },
  { id: 'tx3', reference_number: 'HDFC0002211', source_account_id: 'ACC-1112131', dest_account_id: 'ACC-8821904',
    amount: 4760000, channel: 'IMPS', initiated_at: new Date(Date.now() - 13680000 + 27200000).toISOString(),
    settled_at: null, branch_id: 'HDFC0002211', status: 'SETTLED', metadata: {} },
];

export default function CaseTimeline({ transactions, alertTransactionId }: CaseTimelineProps) {
  const txs = transactions.length > 0 ? transactions : MOCK_TXS;
  const maxAmount = Math.max(...txs.map((t) => t.amount));

  const chartData = txs.map((t, i) => ({
    name: `TX${i + 1}`,
    amount: t.amount / 1e5, // in lakhs
    isAlert: t.id === alertTransactionId,
  }));

  return (
    <div className="space-y-4">
      {/* Bar chart with CTR threshold line */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Transaction Amounts vs CTR Threshold</p>
          <span className="text-[10px] font-mono text-text-3">₹10L = mandatory CTR filing</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#4a5378', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#121829', border: '1px solid rgba(82,108,255,0.2)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`₹${v.toFixed(1)}L`, 'Amount']}
            />
            <ReferenceLine y={10} stroke="#ff3d5a" strokeDasharray="6 3" strokeWidth={1.5}
              label={{ value: '₹10L CTR', position: 'right', fill: '#ff3d5a', fontSize: 9 }} />
            <Bar dataKey="amount" fill="#526cff" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline list */}
      <div className="space-y-2">
        {txs.map((tx, i) => {
          const isAlert = tx.id === alertTransactionId;
          const barW = (tx.amount / maxAmount) * 100;
          return (
            <div
              key={tx.id}
              className={`card px-4 py-3 ${isAlert ? 'border-danger/40 bg-danger/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Channel badge */}
                <span className="w-6 h-6 rounded-md bg-accent/15 border border-accent/25 flex items-center justify-center text-[10px] font-mono font-bold text-accent flex-shrink-0">
                  {CHANNEL_ICONS[tx.channel] ?? '?'}
                </span>

                {/* From → To */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs font-mono text-text-2">
                    <span className="truncate max-w-[80px]">{tx.source_account_id}</span>
                    <ArrowRight size={10} className="text-text-3 flex-shrink-0" />
                    <span className="truncate max-w-[80px]">{tx.dest_account_id}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 rounded-full bg-surface-3 overflow-hidden" style={{ width: 80 }}>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${barW}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-text">
                      {formatINR(tx.amount)}
                    </span>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {isAlert && <Flag size={10} className="text-danger" />}
                    <span className="text-[10px] font-mono text-text-3">
                      {format(new Date(tx.initiated_at), 'HH:mm:ss')}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-3">{tx.reference_number.slice(0, 12)}</span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    tx.status === 'SETTLED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>{tx.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
