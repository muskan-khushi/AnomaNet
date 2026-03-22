'use client';

import { useState } from 'react';
import AppShell from '@/components/Layout/AppShell';
import FundFlowGraph from '@/components/FundFlowGraph';
import { Search, SlidersHorizontal } from 'lucide-react';

const SAMPLE_ACCOUNTS = ['ACC-8821904', 'ACC-9876543', 'ACC-5503912', 'ACC-2291847', 'ACC-9012283'];

export default function GraphExplorerPage() {
  const [query, setQuery] = useState('ACC-8821904');
  const [inputVal, setInputVal] = useState('ACC-8821904');
  const [depth, setDepth] = useState(3);
  const [hours, setHours] = useState(168);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = SAMPLE_ACCOUNTS.filter(
    (a) => a.toLowerCase().includes(inputVal.toLowerCase()) && a !== inputVal
  );

  function handleSearch() {
    setQuery(inputVal);
    setShowSuggestions(false);
  }

  return (
    <AppShell title="Graph Explorer">
      <div className="space-y-4 animate-fade-in">
        {/* Controls bar */}
        <div className="card p-3 flex flex-wrap items-center gap-3">
          {/* Account search */}
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter account ID…"
              className="input pl-9 py-2 font-mono text-sm"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 card py-1 z-20 shadow-xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-text-2 hover:bg-surface-2 hover:text-text transition-colors"
                    onClick={() => { setInputVal(s); setShowSuggestions(false); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Depth slider */}
          <div className="flex items-center gap-2 text-xs text-text-2">
            <SlidersHorizontal size={12} className="text-text-3" />
            <span className="text-text-3 font-mono">Depth</span>
            <input
              type="range" min={1} max={4} step={1}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value))}
              className="w-20 accent-accent"
            />
            <span className="font-mono font-bold text-text w-3">{depth}</span>
          </div>

          {/* Time window */}
          <div className="flex items-center gap-2 text-xs text-text-2">
            <span className="text-text-3 font-mono">Window</span>
            <select
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="input py-1.5 text-xs w-28"
            >
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
            </select>
          </div>

          <button onClick={handleSearch} className="btn-primary !py-2 text-xs">
            Explore Graph
          </button>

          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-3 font-mono">
            Neo4j → D3.js force simulation
          </div>
        </div>

        {/* Info strip */}
        <div className="flex items-center gap-3 text-[11px] text-text-3 font-mono">
          <span>Viewing: <span className="text-accent">{query}</span></span>
          <span>·</span>
          <span>Depth: {depth} hops</span>
          <span>·</span>
          <span>Window: {hours}h</span>
          <span>·</span>
          <span className="text-text-2">Click node for details · Drag to reposition · Scroll to zoom</span>
        </div>

        {/* Graph */}
        <FundFlowGraph height={600} />
      </div>
    </AppShell>
  );
}
