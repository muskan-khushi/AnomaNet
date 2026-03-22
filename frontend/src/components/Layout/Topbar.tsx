'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function Topbar({ title }: { title: string }) {
  const [avgScore, setAvgScore] = useState(0.71);
  const [txPerMin, setTxPerMin] = useState(3241);
  const [tick, setTick] = useState(0);

  // Simulate live-updating metrics
  useEffect(() => {
    const id = setInterval(() => {
      setAvgScore((s) => Math.max(0.5, Math.min(0.99, s + (Math.random() - 0.5) * 0.02)));
      setTxPerMin((t) => Math.max(2800, Math.min(4000, t + Math.round((Math.random() - 0.5) * 80))));
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-bg-1/80 backdrop-blur-sm border-b border-border sticky top-0 z-30">
      <h1 className="text-sm font-semibold font-display text-text tracking-wide">{title}</h1>

      <div className="flex items-center gap-5">
        {/* Live ticker */}
        <div className="flex items-center gap-2 text-xs text-text-2">
          <span className="live-dot" />
          <span className="font-mono">{txPerMin.toLocaleString()} tx/min</span>
        </div>

        {/* Avg AnomaScore */}
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-text-3" />
          <span className="text-xs text-text-2 font-mono">
            Avg AnomaScore{' '}
            <span
              className="font-bold"
              style={{ color: avgScore >= 0.7 ? '#ff3d5a' : avgScore >= 0.5 ? '#f59e0b' : '#10b981' }}
            >
              {avgScore.toFixed(2)}
            </span>
          </span>
        </div>

        {/* Session info */}
        <div className="text-[10px] font-mono text-text-3 border border-border px-2 py-1 rounded">
          FIU-IND · Secure Session
        </div>
      </div>
    </header>
  );
}
