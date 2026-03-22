'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { X, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import type { GraphData, GraphNode, GraphEdge } from '@/types';
import { clsx } from 'clsx';

// ── Colour helpers ────────────────────────────────────────────────────────────
function nodeColor(n: GraphNode): string {
  if (n.is_dormant) return '#4a5378';
  if (n.anoma_score >= 0.7) return '#ff3d5a';
  if (n.anoma_score >= 0.4) return '#f59e0b';
  return '#526cff';
}

function nodeRadius(degree: number): number {
  return Math.max(8, Math.min(22, 8 + Math.log1p(degree) * 4));
}

function isCycleEdge(edge: GraphEdge, cycles: string[][]): boolean {
  const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
  const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
  return cycles.some((cycle) => {
    for (let i = 0; i < cycle.length - 1; i++) {
      if (cycle[i] === src && cycle[i + 1] === tgt) return true;
    }
    return false;
  });
}

function formatINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${(n / 1000).toFixed(0)}K`;
}

// ── Mock data for standalone use ──────────────────────────────────────────────
function buildMockGraph(): GraphData {
  const accounts = [
    { id: 'ACC-8821904', score: 0.91, type: 'SAVINGS', dormant: false, kyc: 'HIGH' },
    { id: 'ACC-9876543', score: 0.74, type: 'CURRENT', dormant: false, kyc: 'HIGH' },
    { id: 'ACC-1112131', score: 0.88, type: 'SAVINGS', dormant: false, kyc: 'MEDIUM' },
    { id: 'ACC-4432100', score: 0.35, type: 'SAVINGS', dormant: false, kyc: 'LOW' },
    { id: 'ACC-7756900', score: 0.22, type: 'CURRENT', dormant: false, kyc: 'LOW' },
    { id: 'ACC-9012283', score: 0.68, type: 'SAVINGS', dormant: true, kyc: 'HIGH' },
    { id: 'ACC-3301122', score: 0.55, type: 'OD', dormant: false, kyc: 'MEDIUM' },
    { id: 'ACC-5503912', score: 0.74, type: 'CURRENT', dormant: false, kyc: 'HIGH' },
  ] as const;

  const nodes: GraphNode[] = accounts.map((a) => ({
    id: a.id,
    label: a.id,
    anoma_score: a.score,
    account_type: a.type as GraphNode['account_type'],
    is_dormant: a.dormant,
    kyc_risk_tier: a.kyc as GraphNode['kyc_risk_tier'],
    branch_id: 'HDFC0001234',
  }));

  const edges: GraphEdge[] = [
    { source: 'ACC-8821904', target: 'ACC-9876543', amount: 4820000, timestamp: '', channel: 'NEFT', tx_id: 'tx1' },
    { source: 'ACC-9876543', target: 'ACC-1112131', amount: 4790000, timestamp: '', channel: 'RTGS', tx_id: 'tx2' },
    { source: 'ACC-1112131', target: 'ACC-8821904', amount: 4760000, timestamp: '', channel: 'IMPS', tx_id: 'tx3' },
    { source: 'ACC-8821904', target: 'ACC-4432100', amount: 950000, timestamp: '', channel: 'NEFT', tx_id: 'tx4' },
    { source: 'ACC-5503912', target: 'ACC-8821904', amount: 5000000, timestamp: '', channel: 'RTGS', tx_id: 'tx5' },
    { source: 'ACC-5503912', target: 'ACC-7756900', amount: 2100000, timestamp: '', channel: 'NEFT', tx_id: 'tx6' },
    { source: 'ACC-5503912', target: 'ACC-3301122', amount: 1800000, timestamp: '', channel: 'IMPS', tx_id: 'tx7' },
    { source: 'ACC-9012283', target: 'ACC-8821904', amount: 18000000, timestamp: '', channel: 'NEFT', tx_id: 'tx8' },
  ];

  return {
    nodes,
    edges,
    metadata: {
      total_nodes: nodes.length,
      total_edges: edges.length,
      detected_cycles: [['ACC-8821904', 'ACC-9876543', 'ACC-1112131', 'ACC-8821904']],
    },
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface FundFlowGraphProps {
  data?: GraphData;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FundFlowGraph({ data, height = 520, onNodeClick }: FundFlowGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [edgePos, setEdgePos] = useState({ x: 0, y: 0 });

  const graphData = data ?? buildMockGraph();

  const handleExportPNG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fund-flow-graph.svg'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth || 800;
    const h = height;
    const cycles = graphData.metadata.detected_cycles;

    const svg = d3.select(svgRef.current)
      .attr('width', w).attr('height', h);
    svg.selectAll('*').remove();

    // Defs: arrowheads
    const defs = svg.append('defs');
    const mkArrow = (id: string, color: string) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -4 10 8')
        .attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', color);
    };
    mkArrow('arrow-cycle', '#ff3d5a');
    mkArrow('arrow-normal', 'rgba(82,108,255,0.6)');

    // Radial gradient for nodes
    const grad = defs.append('radialGradient').attr('id', 'nodeGlow').attr('cx', '30%').attr('cy', '30%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255,255,255,0.3)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0)');

    // Zoom layer
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Deep-clone nodes/edges so D3 can mutate them
    const nodes: GraphNode[] = graphData.nodes.map((n) => ({ ...n }));
    const edgeMap = new Map(nodes.map((n) => [n.id, n]));

    const edges: GraphEdge[] = graphData.edges.map((e) => ({
      ...e,
      source: edgeMap.get(e.source as string) ?? e.source,
      target: edgeMap.get(e.target as string) ?? e.target,
    }));

    // Degree map for node radius
    const degreeMap = new Map<string, number>();
    edges.forEach((e) => {
      const s = (e.source as GraphNode).id;
      const t = (e.target as GraphNode).id;
      degreeMap.set(s, (degreeMap.get(s) ?? 0) + 1);
      degreeMap.set(t, (degreeMap.get(t) ?? 0) + 1);
    });

    // Force simulation
    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id((d) => d.id).distance(110).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide<GraphNode>((d) => nodeRadius(degreeMap.get(d.id) ?? 1) + 12));
    simRef.current = sim;

    // Edges
    const link = g.append('g').attr('class', 'links').selectAll('line')
      .data(edges).enter().append('line')
      .attr('stroke', (e) => isCycleEdge(e, cycles) ? '#ff3d5a' : 'rgba(82,108,255,0.35)')
      .attr('stroke-width', (e) => Math.max(1, Math.log1p(e.amount / 1e5) * 0.8))
      .attr('stroke-dasharray', (e) => isCycleEdge(e, cycles) ? '8 4' : null)
      .attr('marker-end', (e) => isCycleEdge(e, cycles) ? 'url(#arrow-cycle)' : 'url(#arrow-normal)')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke-opacity', 1).attr('stroke-width', 3);
        setHoveredEdge(d);
        setEdgePos({ x: event.offsetX, y: event.offsetY });
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('stroke-opacity', 0.7)
          .attr('stroke-width', Math.max(1, Math.log1p(d.amount / 1e5) * 0.8));
        setHoveredEdge(null);
      });

    // Cycle pulse animation via CSS
    g.selectAll<SVGLineElement, GraphEdge>('line')
      .filter((e) => isCycleEdge(e, cycles))
      .each(function () { this.classList.add('cycle-edge'); });

    // Node groups
    const node = g.append('g').attr('class', 'nodes').selectAll('g')
      .data(nodes).enter().append('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (_, d) => { setSelectedNode(d); onNodeClick?.(d); });

    // Node glow ring for high-risk
    node.filter((d) => d.anoma_score >= 0.7)
      .append('circle')
      .attr('r', (d) => nodeRadius(degreeMap.get(d.id) ?? 1) + 5)
      .attr('fill', 'none')
      .attr('stroke', '#ff3d5a')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3);

    // Main circle
    node.append('circle')
      .attr('r', (d) => nodeRadius(degreeMap.get(d.id) ?? 1))
      .attr('fill', (d) => nodeColor(d))
      .attr('stroke', (d) => d.is_dormant ? '#4a5378' : nodeColor(d))
      .attr('stroke-width', 2)
      .attr('fill-opacity', 0.85);

    // Gloss overlay
    node.append('circle')
      .attr('r', (d) => nodeRadius(degreeMap.get(d.id) ?? 1))
      .attr('fill', 'url(#nodeGlow)')
      .attr('pointer-events', 'none');

    // Label
    node.append('text')
      .attr('dy', (d) => nodeRadius(degreeMap.get(d.id) ?? 1) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#8892b8')
      .text((d) => d.id.replace('ACC-', ''));

    // Tick
    sim.on('tick', () => {
      link
        .attr('x1', (e) => (e.source as GraphNode).x ?? 0)
        .attr('y1', (e) => (e.source as GraphNode).y ?? 0)
        .attr('x2', (e) => (e.target as GraphNode).x ?? 0)
        .attr('y2', (e) => (e.target as GraphNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [graphData, height, onNodeClick]);

  return (
    <div ref={containerRef} className="relative w-full bg-bg-2 rounded-xl border border-border overflow-hidden" style={{ height }}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 flex-wrap">
        {[
          { color: '#ff3d5a', label: 'High Risk (>0.70)' },
          { color: '#f59e0b', label: 'Medium (0.40–0.70)' },
          { color: '#526cff', label: 'Clean' },
          { color: '#4a5378', label: 'Dormant' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-text-3 font-mono">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-px border-t-2 border-dashed border-danger/70" />
          <span className="text-[10px] text-text-3 font-mono">Detected cycle</span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button onClick={handleExportPNG} className="btn-secondary !px-2 !py-1.5 text-xs gap-1">
          <Download size={12} /> Export
        </button>
      </div>

      <svg ref={svgRef} className="w-full h-full" />

      {/* Edge tooltip */}
      {hoveredEdge && (
        <div
          className="absolute z-20 card px-3 py-2 text-xs pointer-events-none shadow-xl"
          style={{ left: edgePos.x + 12, top: edgePos.y - 10 }}
        >
          <p className="font-mono font-semibold text-text">{formatINR(hoveredEdge.amount)}</p>
          <p className="text-text-3 mt-0.5">{hoveredEdge.channel} · {hoveredEdge.tx_id?.slice(0, 8)}</p>
        </div>
      )}

      {/* Node detail panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-bg-1 border-l border-border p-4 overflow-y-auto animate-slide-in z-20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono font-bold text-text">{selectedNode.id}</p>
            <button onClick={() => setSelectedNode(null)} className="text-text-3 hover:text-text">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <Row label="Type" value={selectedNode.account_type} />
            <Row label="KYC Tier" value={selectedNode.kyc_risk_tier} />
            <Row label="Dormant" value={selectedNode.is_dormant ? 'Yes' : 'No'} />
            <Row label="Branch" value={selectedNode.branch_id} />
            <div>
              <p className="section-label mb-1">AnomaScore</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedNode.anoma_score * 100}%`,
                      background: nodeColor(selectedNode),
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: nodeColor(selectedNode) }}>
                  {selectedNode.anoma_score.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <p className="text-xs text-text mt-0.5 font-mono">{value}</p>
    </div>
  );
}
