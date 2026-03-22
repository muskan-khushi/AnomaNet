'use client';

import { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ScoreBreakdown, AlertExplanation } from '@/types';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown;
  explanation?: AlertExplanation;
}

const AXES = [
  { key: 'circular',        label: 'Circular',    color: '#ff3d5a' },
  { key: 'layering',        label: 'Layering',    color: '#f59e0b' },
  { key: 'profile_mismatch',label: 'Profile',     color: '#00d4aa' },
  { key: 'structuring',     label: 'Structure',   color: '#526cff' },
  { key: 'dormant',         label: 'Dormant',     color: '#8892b8' },
] as const;

function scoreBar(score: number) {
  const c = score >= 0.7 ? '#ff3d5a' : score >= 0.4 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 100}%`, background: c }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: c }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

export default function ScoreBreakdownPanel({ breakdown, explanation }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>('circular');

  const radarData = AXES.map(({ key, label }) => ({
    label,
    value: Math.round(breakdown[key] * 100),
  }));

  return (
    <div className="space-y-4">
      {/* Radar chart */}
      <div className="card p-4">
        <p className="section-label mb-3">Score Breakdown</p>
        <div className="flex gap-4 items-start">
          <div style={{ width: 180, height: 180, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <PolarGrid stroke="rgba(82,108,255,0.15)" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: '#8892b8', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="#526cff"
                  fill="#526cff"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar list */}
          <div className="flex-1 space-y-2.5">
            {AXES.map(({ key, label, color }) => (
              <div key={key}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-2">{label}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${breakdown[key] * 100}%`, background: color }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold w-8 text-right" style={{ color }}>
                    {breakdown[key].toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable explanation cards */}
      <div className="space-y-2">
        {AXES.map(({ key, label, color }) => {
          const score = breakdown[key];
          const isOpen = expanded === key;
          const explText = explanation?.explanation ?? null;

          return (
            <div
              key={key}
              className="card overflow-hidden border transition-colors duration-150"
              style={{ borderColor: isOpen ? `${color}33` : undefined }}
            >
              <button
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-2 transition-colors"
                onClick={() => setExpanded(isOpen ? null : key)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold" style={{ color }}>
                    {score.toFixed(2)}
                  </span>
                  <span className="text-sm text-text">{label}</span>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-text-3" /> : <ChevronDown size={14} className="text-text-3" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-border animate-fade-in">
                  {scoreBar(score)}
                  {key === 'circular' && explText && (
                    <p className="text-xs text-text-2 mt-3 leading-relaxed">{explText}</p>
                  )}
                  {key !== 'circular' && (
                    <p className="text-xs text-text-3 mt-3 italic">
                      {score >= 0.7
                        ? `High ${label.toLowerCase()} signal detected. Pattern confidence: ${(score * 100).toFixed(0)}%.`
                        : score >= 0.4
                        ? `Moderate ${label.toLowerCase()} indicators present.`
                        : `No significant ${label.toLowerCase()} pattern detected.`}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
