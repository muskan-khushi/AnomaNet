'use client';

import AppShell from '@/components/Layout/AppShell';
import ScenarioPanel from '@/components/ScenarioPanel';
import { FlaskConical } from 'lucide-react';
import type { FraudScenario } from '@/types';

export default function SimulatorPage() {
  async function handleFire(type: FraudScenario) {
    // In production: await api.post(`/simulate/scenario?type=${type}`)
    await new Promise((r) => setTimeout(r, 1200));
  }

  return (
    <AppShell title="Fraud Scenario Simulator">
      <div className="space-y-6 animate-fade-in">
        {/* Header card */}
        <div className="card p-5 border-accent/20 bg-accent/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0">
              <FlaskConical size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-display text-text mb-1">
                Fraud Scenario Simulator
              </h2>
              <p className="text-xs text-text-2 leading-relaxed max-w-2xl">
                Fire synthetic fraud scenarios into the live data pipeline. Each trigger calls{' '}
                <span className="font-mono text-accent">Muskan's data_simulator</span> via{' '}
                <span className="font-mono text-accent">simulator-bridge</span>, generates realistic
                transaction events, and produces a real alert within seconds. Use this during the demo
                to show all 5 fraud typologies.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-text-3">
            <span className="live-dot" />
            Fires Muskan&apos;s data_simulator via Ratnesh&apos;s simulator-bridge ·
            POST /api/simulate/scenario?type=X
          </div>
        </div>

        {/* Scenario cards + recent triggers */}
        <ScenarioPanel onFire={handleFire} />
      </div>
    </AppShell>
  );
}
