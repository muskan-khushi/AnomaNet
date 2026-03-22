'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/Layout/AppShell';
import { ArrowLeft, FileDown, Loader2, CheckCircle2, Lock } from 'lucide-react';

const CASE_REF = 'CASE-2024-0142';
const ALERT_REF = 'ALT-8821904';
const ACCOUNT_ID = 'ACC-8821904';

const TX_TRAIL = [
  { ref: 'TXN-20240115XYZ123', amount: '₹48.2L', from: 'ACC-8821904', to: 'ACC-9876543', channel: 'NEFT', time: '14:32:01' },
  { ref: 'TXN-20240115XYZ124', amount: '₹47.9L', from: 'ACC-9876543', to: 'ACC-1112131', channel: 'RTGS', time: '16:08:44' },
  { ref: 'TXN-20240115XYZ125', amount: '₹47.6L', from: 'ACC-1112131', to: 'ACC-8821904', channel: 'IMPS', time: '18:17:22' },
];

const ML_SCORES = [
  { pattern: 'Circular',          score: 0.91, signal: '3-hop cycle · 3.8h' },
  { pattern: 'Layering',          score: 0.82, signal: 'Fan-out 7 · 12 min' },
  { pattern: 'Profile Mismatch',  score: 0.78, signal: '₹2.1Cr vs ₹40K income' },
  { pattern: 'Structuring',       score: 0.45, signal: '3 txns below ₹10L' },
  { pattern: 'Dormancy',          score: 0.12, signal: 'Account active 3yr' },
];

export default function EvidenceBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [narrative, setNarrative] = useState(
    'Account 8821904, a SAVINGS account declared with ₹40,000/mo income (Kirana shop owner), initiated a ₹48.2L NEFT transfer forming a 3-hop financial cycle completed in 3.8 hours across branches in Mumbai and Delhi. Two of the three counterparty relationships were first-time transactions.'
  );
  const [findings, setFindings] = useState('');
  const [supportingRefs, setSupportingRefs] = useState('TXN-20240115XYZ123, TXN-20240115XYZ124, TXN-20240115XYZ125');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2200));
    setGenerating(false);
    setGenerated(true);
  }

  return (
    <AppShell title={`Evidence Builder — ${CASE_REF}`}>
      <div className="space-y-5 animate-fade-in max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href={`/cases/${id}`} className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text transition-colors">
            <ArrowLeft size={13} /> Back to Case
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-mono text-text-3">
            <Lock size={10} />
            Auto-populated from case data · goAML submission ready
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left col — editable fields */}
          <div className="lg:col-span-3 space-y-5">

            {/* Case reference (read-only) */}
            <div className="card p-5">
              <p className="section-label mb-3">Case Reference <span className="text-text-3 normal-case font-sans">(read-only)</span></p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Case ID',    value: CASE_REF },
                  { label: 'Alert ID',   value: ALERT_REF },
                  { label: 'Account',    value: ACCOUNT_ID },
                  { label: 'Pattern',    value: 'Circular Transaction' },
                  { label: 'Amount',     value: '₹48.2L' },
                  { label: 'Channels',   value: 'NEFT / RTGS / IMPS' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="section-label">{label}</p>
                    <p className="font-mono text-text mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Case narrative */}
            <div className="card p-5">
              <label className="section-label block mb-2">
                Case Narrative <span className="text-text-3 normal-case font-sans">(investigator completes)</span>
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={5}
                className="input text-xs resize-none leading-relaxed"
              />
            </div>

            {/* Investigator findings */}
            <div className="card p-5">
              <label className="section-label block mb-2">Investigator Findings</label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Enter your investigative conclusions here…"
                rows={4}
                className="input text-xs resize-none leading-relaxed"
              />
            </div>

            {/* Supporting references */}
            <div className="card p-5">
              <label className="section-label block mb-2">Supporting Reference IDs</label>
              <input
                type="text"
                value={supportingRefs}
                onChange={(e) => setSupportingRefs(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>

            {/* Generate button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={generating || generated}
                className="btn-primary gap-2"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating PDF…</>
                ) : generated ? (
                  <><CheckCircle2 size={14} className="text-green-400" /> Report Ready — Download</>
                ) : (
                  <><FileDown size={14} /> Generate FIU Report PDF</>
                )}
              </button>
              {generated && (
                <a
                  href="#"
                  className="text-xs text-cyan hover:text-cyan/80 font-mono transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  ↓ FIU_CASE-2024-0142_REPORT.pdf
                </a>
              )}
            </div>

            {generated && (
              <div className="card p-4 border-success/30 bg-success/5 text-xs text-success flex items-center gap-2">
                <CheckCircle2 size={14} />
                7-page PDF generated via report-service · iText 7 · goAML submission ready
              </div>
            )}
          </div>

          {/* Right col — read-only prefill */}
          <div className="lg:col-span-2 space-y-5">

            {/* ML Score table */}
            <div className="card p-4">
              <p className="section-label mb-3">ML Score Breakdown <span className="text-text-3 normal-case font-sans">(read-only)</span></p>
              <div className="space-y-2.5">
                {ML_SCORES.map(({ pattern, score, signal }) => {
                  const c = score >= 0.7 ? '#ff3d5a' : score >= 0.4 ? '#f59e0b' : '#8892b8';
                  return (
                    <div key={pattern}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-2">{pattern}</span>
                        <span className="text-xs font-mono font-bold" style={{ color: c }}>{score.toFixed(2)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: c }} />
                      </div>
                      <p className="text-[10px] text-text-3 mt-0.5 font-mono">{signal}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transaction trail */}
            <div className="card p-4">
              <p className="section-label mb-3">Transaction Trail <span className="text-text-3 normal-case font-sans">(read-only)</span></p>
              <div className="space-y-2">
                {TX_TRAIL.map((tx) => (
                  <div key={tx.ref} className="text-[11px] bg-bg-2 rounded-lg px-3 py-2.5 font-mono">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-accent font-semibold">{tx.amount}</span>
                      <span className="text-text-3">{tx.time}</span>
                    </div>
                    <div className="text-text-2">{tx.from} → {tx.to}</div>
                    <div className="text-text-3 mt-0.5">{tx.ref} · {tx.channel}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-text-3 mt-2 font-mono">
                3 transactions · ₹48.2L + ₹47.9L + ₹47.6L · Cycle complete · NEFT/RTGS/IMPS channels
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
