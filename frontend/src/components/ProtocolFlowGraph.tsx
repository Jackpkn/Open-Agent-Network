'use client';

import React, { useState, useEffect } from 'react';
import { Search, Lock, Zap, Layers, CheckCircle2, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

interface StepNode {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: any;
  accentColor: string;
  borderColor: string;
  bgColor: string;
  details: {
    summary: string;
    protocolAction: string;
    payloadSnippet: string;
    contractMethod?: string;
  };
}

export function ProtocolFlowGraph() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [animatedPulseStep, setAnimatedPulseStep] = useState<number>(1);

  // Auto-cycle active steps every 3.5 seconds to show flowing protocol animation
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedPulseStep((prev) => (prev % 5) + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const steps: StepNode[] = [
    {
      id: 1,
      title: 'A2A Discovery',
      subtitle: 'Card Inspection',
      badge: 'STEP 01',
      icon: Search,
      accentColor: '#3B82F6',
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-500/10',
      details: {
        summary: 'Marketplace queries standard /.well-known/agent-card.json endpoints to discover capabilities, pricing, and input schemas.',
        protocolAction: 'HTTP GET /.well-known/agent-card.json',
        payloadSnippet: `{\n  "name": "CodeReviewAgent",\n  "skills": [{"id": "code-review", "name": "Security Audit"}],\n  "pricing": {"amount": "25.00", "currency": "USDC"}\n}`,
      },
    },
    {
      id: 2,
      title: 'USDC Escrow',
      subtitle: 'Base Sepolia L2',
      badge: 'STEP 02',
      icon: Lock,
      accentColor: '#16A34A',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      details: {
        summary: 'Client approves and locks $25.00 USDC in ACPEscrow.sol. Funds remain locked safely until verification passes.',
        protocolAction: 'ACPEscrow.createContract(contractId, worker, arbitrator, ...)',
        payloadSnippet: `// ACPEscrow.sol\nfunction createContract(\n    bytes32 contractId,\n    address worker,\n    uint256 amount\n) external nonReentrant`,
        contractMethod: 'ACPEscrow.sol → createContract()',
      },
    },
    {
      id: 3,
      title: 'SSE Streaming',
      subtitle: 'Token-by-Token LLM',
      badge: 'STEP 03',
      icon: Zap,
      accentColor: '#EAB308',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/10',
      details: {
        summary: 'Agent receives A2A task over JSON-RPC 2.0 and streams live thinking steps & token output directly to the browser console.',
        protocolAction: 'A2A SSE Proxy GET /a2a/v1/stream?prompt=...',
        payloadSnippet: `data: {"message": "🧠 Scanning AST nodes..."}\n\ndata: {"thought": "Verifying reentrancy guard..."}\n\ndata: {"token": "def login()..."}\n\n`,
      },
    },
    {
      id: 4,
      title: 'Subcontracting',
      subtitle: 'Cascading DAG',
      badge: 'STEP 04',
      icon: Layers,
      accentColor: '#A855F7',
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-500/10',
      details: {
        summary: 'Primary agent autonomously sub-hires downstream specialized worker agents and issues sub-escrow payments.',
        protocolAction: 'Agent A → client.create_job() → Agent B',
        payloadSnippet: `// Subcontracting DAG Node\nParent: CodeReviewAgent ($25.00)\n └── Sub-worker: SecurityScanner ($10.00)\n └── Sub-worker: DocWriter ($5.00)`,
      },
    },
    {
      id: 5,
      title: 'Proof & Payout',
      subtitle: 'Automated Release',
      badge: 'STEP 05',
      icon: CheckCircle2,
      accentColor: '#10B981',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      details: {
        summary: 'CI test pass or TEE attestation proof is verified. Escrow releases 99% payout to agent and 1% fee to treasury.',
        protocolAction: 'ACPEscrow.releaseMilestone(contractId, 2)',
        payloadSnippet: `// Escrow Settlement\nWorker Payout: $24.75 USDC\nProtocol Fee : $0.25 USDC\nStatus       : SETTLED (Tx 0x882a...99)`,
        contractMethod: 'ACPEscrow.sol → releaseMilestone()',
      },
    },
  ];

  const currentStep = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <div className="space-y-8">
      {/* Node Flow Diagram */}
      <div className="relative p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden">
        {/* Ambient Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 pointer-events-none" />

        {/* Step Nodes Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((step, idx) => {
            const IconComp = step.icon;
            const isSelected = activeStep === step.id;
            const isPulsing = animatedPulseStep === step.id;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Node Card */}
                <button
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full p-4 rounded-xl border transition-all duration-300 text-left relative group ${
                    isSelected
                      ? `bg-[#242426] border-white ring-1 ring-white/50 shadow-lg scale-102`
                      : `bg-[#121212] border-[#2C2C2E] hover:border-[#3E3E42]`
                  }`}
                >
                  {/* Glowing Animated Pulse Dot */}
                  {isPulsing && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] text-[#98989E] font-medium tracking-wider">
                      {step.badge}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg ${step.bgColor} border ${step.borderColor} flex items-center justify-center`}
                      style={{ color: step.accentColor }}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-xs text-[#98989E] mt-0.5">{step.subtitle}</p>
                </button>

                {/* Flow Connection Line for Desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-20 pointer-events-none">
                    <ArrowRight className="w-4 h-4 text-[#636366]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic Glowing Flow Line */}
        <div className="mt-6 h-1 w-full bg-[#2C2C2E] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${(activeStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Interactive Selected Step Inspector Card */}
      <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${currentStep.bgColor} border ${currentStep.borderColor} flex items-center justify-center`}
              style={{ color: currentStep.accentColor }}
            >
              {React.createElement(currentStep.icon, { className: 'w-5 h-5' })}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#98989E]">{currentStep.badge}</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-[#242426] text-white border border-[#2C2C2E]">
                  {currentStep.subtitle}
                </span>
              </div>
              <h3 className="text-base font-medium text-white pt-0.5">{currentStep.title} Protocol Phase</h3>
            </div>
          </div>

          {currentStep.details.contractMethod && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
              {currentStep.details.contractMethod}
            </div>
          )}
        </div>

        <p className="text-sm text-[#98989E] leading-relaxed">{currentStep.details.summary}</p>

        {/* Action Header & Code Payload */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#98989E]">
            <span>Protocol Action: <strong className="text-white">{currentStep.details.protocolAction}</strong></span>
            <span>JSON / Solidity Payload</span>
          </div>
          <pre className="p-4 rounded-xl bg-[#121212] border border-[#2C2C2E] text-emerald-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {currentStep.details.payloadSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
