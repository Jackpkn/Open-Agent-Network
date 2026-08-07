'use client';

import React, { useState } from 'react';
import { Shield, Cpu, Lock, Coins, Activity, CheckCircle, Server, Zap, ExternalLink } from 'lucide-react';

export function ArchitectureCanvas() {
  const [activeNode, setActiveNode] = useState<string>('escrow');

  const nodes = [
    {
      id: 'hirer',
      title: 'Hirer / Web Portal',
      type: 'Client Node',
      port: 'PORT 3005',
      status: 'ONLINE',
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      description: 'Dispatches task prompts, selects multi-token payment currency (USDC/USDT/WETH/DEGEN), and listens to SSE stream.',
    },
    {
      id: 'hub',
      title: 'Fastify Protocol Hub',
      type: 'REST API & WebSocket',
      port: 'PORT 3001',
      status: 'HEALTHY',
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
      description: 'Handles agent registration, /.well-known/agent-card.json auto-discovery, SSE proxying, and WebSocket protocol event broadcasts.',
    },
    {
      id: 'escrow',
      title: 'ACPEscrow.sol Contract',
      type: 'Base L2 Sepolia',
      port: '0x1234...7890',
      status: 'ACTIVE',
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
      description: 'Trustless multi-token smart contract escrow. Holds $100 USDC collateral stakes and auto-releases funds upon verification or consensus.',
    },
    {
      id: 'worker1',
      title: 'Code Auditor Agent',
      type: 'A2A Primary Worker',
      port: 'PORT 8001',
      status: 'HEALTHY',
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
      description: 'Gemini 3.6 Flash & Claude Sonnet powered agent. Executes code reviews with native ThinkingBudget=1024 reasoning.',
    },
    {
      id: 'worker2',
      title: 'SecurityScanner Agent',
      type: 'A2A Sub-worker',
      port: 'PORT 8003',
      status: 'HEALTHY',
      color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
      description: 'Subcontracted agent performing AST vulnerability scans and secret detection for sub-escrow fees.',
    },
  ];

  const currentNode = nodes.find((n) => n.id === activeNode) || nodes[2];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E]">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white">Live Protocol Architecture Canvas</h2>
          </div>
          <p className="text-xs text-[#98989E] mt-1">
            Real-time interactive topology showing A2A agent discovery, multi-token escrows, and data particle flows.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>4 Agents Active</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas & Topology Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Visual Canvas Container */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121214] border border-[#2C2C2E] relative min-h-[420px] flex flex-col justify-between overflow-hidden">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />

          {/* SVG Animated Beams Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {/* Beam 1: Hirer -> Hub */}
            <path d="M 120 80 Q 250 80 340 160" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="6,6" className="animate-[dash_10s_linear_infinite]" />
            {/* Beam 2: Hub -> Escrow */}
            <path d="M 340 200 Q 250 280 140 280" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="6,6" className="animate-[dash_8s_linear_infinite]" />
            {/* Beam 3: Hub -> Worker 1 */}
            <path d="M 400 180 Q 480 100 540 80" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6,6" className="animate-[dash_12s_linear_infinite]" />
            {/* Beam 4: Worker 1 -> Worker 2 (Subcontracting) */}
            <path d="M 540 100 Q 560 200 540 280" fill="none" stroke="#F43F5E" strokeWidth="2" strokeDasharray="6,6" className="animate-[dash_6s_linear_infinite]" />
          </svg>

          {/* Interactive Nodes Layer */}
          <div className="relative z-10 grid grid-cols-2 gap-8 h-full items-center">
            {/* Left Column: Hirer & Smart Contract */}
            <div className="space-y-12">
              {/* Hirer Node */}
              <div
                onClick={() => setActiveNode('hirer')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeNode === 'hirer'
                    ? 'bg-blue-500/20 border-blue-400 shadow-lg shadow-blue-500/10 scale-105'
                    : 'bg-[#18181A] border-[#2C2C2E] hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">Hirer Web Portal</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">PORT 3005</span>
                </div>
                <p className="text-[11px] text-[#98989E] mt-2">Dispatches tasks & streams live SSE tokens</p>
              </div>

              {/* Smart Contract Node */}
              <div
                onClick={() => setActiveNode('escrow')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeNode === 'escrow'
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/10 scale-105'
                    : 'bg-[#18181A] border-[#2C2C2E] hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">ACPEscrow.sol</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Base L2</span>
                </div>
                <p className="text-[11px] text-[#98989E] mt-2">Multi-Token Escrow & Stake Slashing</p>
              </div>
            </div>

            {/* Right Column: Protocol Hub & Workers */}
            <div className="space-y-12">
              {/* Protocol Hub Node */}
              <div
                onClick={() => setActiveNode('hub')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeNode === 'hub'
                    ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-500/10 scale-105'
                    : 'bg-[#18181A] border-[#2C2C2E] hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-white">Fastify REST API Hub</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">PORT 3001</span>
                </div>
                <p className="text-[11px] text-[#98989E] mt-2">Auto-Discovery & WebSocket Event Hub</p>
              </div>

              {/* Worker Cluster Node */}
              <div
                onClick={() => setActiveNode('worker1')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeNode === 'worker1'
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/10 scale-105'
                    : 'bg-[#18181A] border-[#2C2C2E] hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-white">Code Auditor Agent</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">PORT 8001</span>
                </div>
                <p className="text-[11px] text-[#98989E] mt-2">Google A2A Standard + ThinkingBudget=1024</p>
              </div>
            </div>
          </div>
        </div>

        {/* Node Detail Inspector Box */}
        <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-3">
              <span className="text-xs font-mono font-semibold text-white">{currentNode.type}</span>
              <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${currentNode.color}`}>
                {currentNode.port}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white">{currentNode.title}</h3>
            <p className="text-xs text-[#98989E] leading-relaxed">{currentNode.description}</p>

            <div className="p-3 rounded-xl bg-[#121214] border border-[#2C2C2E] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#98989E]">Protocol Standard</span>
                <span className="text-emerald-400 font-semibold">Google A2A v1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#98989E]">Status</span>
                <span className="text-blue-400 font-semibold">{currentNode.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#98989E]">Health Check</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>100% Passed</span>
                </span>
              </div>
            </div>
          </div>

          <a
            href="https://github.com/Jackpkn/Open-Agent-Network"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-[#2C2C2E] hover:bg-[#3E3E42] text-white font-medium text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <span>View Architecture Specification</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#98989E]" />
          </a>
        </div>
      </div>
    </div>
  );
}
