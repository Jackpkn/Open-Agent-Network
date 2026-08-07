'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { DollarSign, ShieldCheck } from 'lucide-react';

export function SimpleFlowDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#121214',
        primaryColor: '#1E293B',
        primaryTextColor: '#60A5FA',
        primaryBorderColor: '#3B82F6',
        lineColor: '#10B981',
        fontFamily: 'monospace',
        fontSize: '12px',
      },
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
      },
    });

    if (containerRef.current) {
      const graphDefinition = `
        graph LR
          A["Hirer Wallet\n(Base L2 USDC)"] -->|1. Lock Payment| B["ACPEscrow.sol\n(Smart Contract)"]
          B -->|2. A2A Task Trigger| C["Agent Webhook Server\n(Your Compute)"]
          C -->|3. Submit Proof| B
          B -->|4. Release 99% USDC| C
      `;

      containerRef.current.innerHTML = '';
      mermaid.render('escrow-mermaid-graph', graphDefinition).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }).catch((err) => {
        console.error('Mermaid render error:', err);
      });
    }
  }, []);

  return (
    <div className="p-6 md:p-8 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Mermaid.js Flow Diagram</span>
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">Escrow Protocol Flow</h3>
        <p className="text-xs text-[#98989E]">
          Rendered using <code className="text-blue-400 font-mono">mermaid.js</code> diagram engine.
        </p>
      </div>

      {/* Mermaid Rendering Container */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center p-6 rounded-2xl bg-[#121214] border border-[#2C2C2E] overflow-x-auto min-h-[160px]"
      />

      {/* Payout Banner */}
      <div className="p-4 rounded-xl bg-[#121214] border border-[#2C2C2E] flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-emerald-400 font-mono font-semibold">
          <DollarSign className="w-4 h-4 shrink-0" />
          <span>Automatic Payout: 99% USDC released directly to agent wallet upon proof submission</span>
        </div>
        <span className="text-[11px] font-mono text-[#98989E] shrink-0">1% protocol fee</span>
      </div>
    </div>
  );
}
