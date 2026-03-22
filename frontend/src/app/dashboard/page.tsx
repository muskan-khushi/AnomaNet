'use client';

import AppShell from '@/components/Layout/AppShell';
import KPICards from '@/components/KPICards';
import AlertFeed from '@/components/AlertFeed';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useMemo, useState, useEffect } from 'react';

function generateVolumeData() {
  const now = Date.now();
  return Array.from({ length: 48 }, (_, i) => ({
    time: new Date(now - (47 - i) * 30 * 60 * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    volume: Math.floor(Math.random() * 2000 + 800),
    alerts: Math.floor(Math.random() * 8),
  }));
}

export default function DashboardPage() {
  const [volumeData, setVolumeData] = useState(() => generateVolumeData());

  useEffect(() => {
    const id = setInterval(() => {
      setVolumeData((prev) => {
        const now = Date.now();
        const newPoint = {
          time: new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          volume: Math.floor(Math.random() * 2000 + 800),
          alerts: Math.floor(Math.random() * 8),
        };
        return [...prev.slice(1), newPoint];
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <AppShell title="Command Center">
      <div className="space-y-6 animate-fade-in">
        {/* KPI row */}
        <KPICards />

        {/* Chart + Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Transaction Volume Chart */}
          <div className="lg:col-span-3 card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-text">Transaction Volume</p>
                <p className="text-xs text-text-2 mt-0.5">24h · Live polling every 30s</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-success font-mono">
                <span className="live-dot" /> Live
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={volumeData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#526cff" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#526cff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff3d5a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ff3d5a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(82,108,255,0.06)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#4a5378', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false}
                  interval={7}
                />
                <YAxis tick={{ fill: '#4a5378', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#121829', border: '1px solid rgba(82,108,255,0.2)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#8892b8' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#526cff" strokeWidth={2} fill="url(#volGrad)" dot={false} />
                <Area type="monotone" dataKey="alerts" stroke="#ff3d5a" strokeWidth={1.5} fill="url(#alertGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Feed */}
          <div className="lg:col-span-2">
            <AlertFeed limit={8} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
