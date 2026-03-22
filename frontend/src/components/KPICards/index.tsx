'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Zap, Activity, TrendingUp } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  accent?: string;
}

function KPICard({ label, value, sub, icon, accent = 'text-accent' }: KPICardProps) {
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-border-bright transition-colors duration-200">
      <div className="flex items-start justify-between">
        <p className="section-label">{label}</p>
        <span className={`${accent} opacity-60`}>{icon}</span>
      </div>
      <div>
        <p className={`text-3xl font-bold font-display ${accent}`}>{value}</p>
        <p className="text-xs text-text-2 mt-1">{sub}</p>
      </div>
    </div>
  );
}

export default function KPICards() {
  const [activeAlerts, setActiveAlerts] = useState(12);
  const [highRisk, setHighRisk] = useState(47);
  const [txPerMin, setTxPerMin] = useState(3241);
  const [avgScore, setAvgScore] = useState(0.71);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveAlerts((v) => Math.max(8, v + Math.round((Math.random() - 0.4) * 2)));
      setHighRisk((v) => Math.max(40, v + Math.round((Math.random() - 0.5) * 3)));
      setTxPerMin((v) => Math.max(2800, v + Math.round((Math.random() - 0.5) * 120)));
      setAvgScore((v) => Math.max(0.55, Math.min(0.95, v + (Math.random() - 0.5) * 0.015)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Active Alerts"
        value={activeAlerts}
        sub={`↑ ${Math.floor(Math.random() * 5) + 1} in last hour`}
        icon={<Bell size={18} />}
        accent="text-danger"
      />
      <KPICard
        label="High-Risk Accounts"
        value={highRisk}
        sub="Score > 0.70 today"
        icon={<AlertTriangle size={18} />}
        accent="text-warning"
      />
      <KPICard
        label="Transactions / Min"
        value={txPerMin.toLocaleString()}
        sub="+8% vs yesterday"
        icon={<Zap size={18} />}
        accent="text-cyan"
      />
      <KPICard
        label="Avg AnomaScore"
        value={avgScore.toFixed(2)}
        sub="Threshold 0.65"
        icon={<Activity size={18} />}
        accent={avgScore >= 0.7 ? 'text-danger' : avgScore >= 0.5 ? 'text-warning' : 'text-success'}
      />
    </div>
  );
}
