'use client';

import { useState } from 'react';
import { Play, RotateCcw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { FraudScenario, RecentTrigger } from '@/types';

const SCENARIOS: {
  type: FraudScenario;
  title: string;
  description: string;
  accent: string;
  detail: string;
}[] = [
  {
    type: 'CIRCULAR',
    title: 'Circular',
    description: 'A→B→C→A fund cycle · 3–7 hops',
    accent: 'danger',
    detail: '3-hop financial cycle completing in under 4 hours',
  },
  {
    type: 'LAYERING',
    title: 'Layering',
    description: 'Fan-out to 7+ accounts in 1 hour',
    accent: 'warning',
    detail: '₹50L fans out across 7 accounts within 90 min',
  },
  {
    type: 'STRUCTURING',
    title: 'Structuring',
    description: '3+ deposits just below ₹10L CTR',
    accent: 'accent',
    detail: '₹9.6L + ₹9.4L + ₹9.8L in 40 min = ₹28.8L aggregate',
  },
  {
    type: 'DORMANT',
    title: 'Dormant',
    description: '14-month dormant account · ₹1.8Cr',
    accent: 'cyan',
    detail: 'Dormant 14 months, receives ₹1.8Cr, wires out in 6h',
  },
  {
    type: 'PROFILE_MISMATCH',
    title: 'Profile Mismatch',
    description: '₹40K income vs ₹2.1Cr transactions',
    accent: 'success',
    detail: 'Kirana shop owner processes ₹2.1Cr in one month',
  },
];

const ACCENT_CLASSES: Record<string, { bg: string; text: string; border: string; btn: string }> = {
  danger:  { bg: 'bg-danger/8',  text: 'text-danger',  border: 'border-danger/20',  btn: 'bg-danger/15 hover:bg-danger/25 text-danger border-danger/30' },
  warning: { bg: 'bg-warning/8', text: 'text-warning', border: 'border-warning/20', btn: 'bg-warning/15 hover:bg-warning/25 text-warning border-warning/30' },
  accent:  { bg: 'bg-accent/8',  text: 'text-accent',  border: 'border-accent/20',  btn: 'bg-accent/15 hover:bg-accent/25 text-accent border-accent/30' },
  cyan:    { bg: 'bg-cyan/8',    text: 'text-cyan',    border: 'border-cyan/20',    btn: 'bg-cyan/15 hover:bg-cyan/25 text-cyan border-cyan/30' },
  success: { bg: 'bg-success/8', text: 'text-success', border: 'border-success/20', btn: 'bg-success/15 hover:bg-success/25 text-success border-success/30' },
};

interface ScenarioPanelProps {
  onFire?: (type: FraudScenario) => Promise<void>;
}

export default function ScenarioPanel({ onFire }: ScenarioPanelProps) {
  const [firing, setFiring] = useState<FraudScenario | null>(null);
  const [recentTriggers, setRecentTriggers] = useState<RecentTrigger[]>([]);

  async function handleFire(type: FraudScenario) {
    setFiring(type);
    try {
      if (onFire) {
        await onFire(type);
      }
      // Optimistically add to recent triggers
      const newTrigger: RecentTrigger = {
        scenario_id: `SCEN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        type,
        triggered_at: new Date().toISOString(),
        alert_id: `ALT-${Math.floor(Math.random() * 9000000 + 1000000)}`,
      };
      setRecentTriggers((prev) => [newTrigger, ...prev].slice(0, 10));
    } finally {
      setFiring(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Scenario cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {SCENARIOS.map((s) => {
          const ac = ACCENT_CLASSES[s.accent];
          const isFiring = firing === s.type;
          return (
            <div key={s.type} className={`card p-5 flex flex-col gap-4 hover:border-border-bright transition-all duration-200 ${ac.bg}`}>
              <div>
                <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider mb-2 ${ac.text} border ${ac.border}`}>
                  {s.type}
                </div>
                <h3 className={`text-base font-bold font-display ${ac.text}`}>{s.title}</h3>
                <p className="text-xs text-text-2 mt-1 leading-relaxed">{s.description}</p>
              </div>
              <p className="text-[10px] text-text-3 leading-relaxed flex-1">{s.detail}</p>
              <button
                onClick={() => handleFire(s.type)}
                disabled={!!firing}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${ac.btn}`}
              >
                {isFiring ? (
                  <>
                    <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Firing…
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    Fire Scenario ↗
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent triggers */}
      {recentTriggers.length > 0 && (
        <div className="card">
          <div className="px-4 py-3 border-b border-border">
            <p className="section-label">Recent Triggers</p>
          </div>
          <div className="divide-y divide-border">
            {recentTriggers.map((t) => {
              const ac = ACCENT_CLASSES[
                SCENARIOS.find((s) => s.type === t.type)?.accent ?? 'accent'
              ];
              return (
                <div key={t.scenario_id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${ac.text} ${ac.border} bg-transparent`}>
                    {t.type}
                  </span>
                  <span className="text-xs text-text-2 font-mono flex-1">{t.scenario_id}</span>
                  <Link
                    href={`/alerts/${t.alert_id}`}
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    → Alert {t.alert_id} <ExternalLink size={10} />
                  </Link>
                  <span className="text-[10px] text-text-3 font-mono">
                    {formatDistanceToNow(new Date(t.triggered_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
