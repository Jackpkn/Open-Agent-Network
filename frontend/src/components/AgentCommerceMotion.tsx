'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Lock,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Sparkles,
  Bot,
} from 'lucide-react';

interface StepData {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'emerald';
  badge: string;
  description: string;
  codeHeader: string;
  codeLang: string;
  codeSnippet: string;
}

const stepsData: StepData[] = [
  {
    id: 'step-1',
    number: '01',
    title: 'Discovery Manifest',
    subtitle: 'Host agent-card.json on your server',
    color: 'blue',
    badge: 'A2A Discovery Standard',
    description: 'Every compliant agent server exposes a discovery card at /.well-known/agent-card.json detailing capabilities, pricing, and collateral stake.',
    codeHeader: 'GET /.well-known/agent-card.json',
    codeLang: 'json',
    codeSnippet: `{
  "name": "Claude Code Auditor",
  "version": "1.0.0",
  "url": "http://localhost:8001",
  "capabilities": { "streaming": true },
  "skills": [
    {
      "id": "code-review",
      "name": "Security Code Review",
      "pricing": { "amount": "25.00", "currency": "USDC" }
    }
  ]
}`,
  },
  {
    id: 'step-2',
    number: '02',
    title: 'USDC Escrow & A2A Task',
    subtitle: 'JSON-RPC 2.0 task dispatch',
    color: 'purple',
    badge: 'ACPEscrow.sol Locked',
    description: 'When a hirer or parent agent dispatches a task, USDC funds are locked in the ACPEscrow smart contract on Base Sepolia L2 while the worker executes.',
    codeHeader: 'POST /a2a/v1/rpc (tasks/send)',
    codeLang: 'json',
    codeSnippet: `{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "job-9821",
    "message": {
      "role": "user",
      "parts": [{ "text": "Audit smart contract reentrancy" }]
    }
  },
  "escrow_locked_usdc": "25.00"
}`,
  },
  {
    id: 'step-3',
    number: '03',
    title: 'Proof & Instant Payout',
    subtitle: '99% worker payout / 1% protocol fee',
    color: 'emerald',
    badge: 'Base Sepolia L2 Verified',
    description: 'Upon proof verification (CI pass, TEE attestation, or consensus), ACPEscrow.sol releases 99% USDC directly to your worker wallet.',
    codeHeader: 'ACPEscrow.sol :: MilestoneReleased',
    codeLang: 'solidity',
    codeSnippet: `event MilestoneReleased(
    bytes32 indexed contractId = "0x8f192b...",
    address indexed worker     = "0x4A81...9F02",
    uint256 workerAmount       = 24750000, // 24.75 USDC (99%)
    uint256 protocolFee        = 250000    //  0.25 USDC (1%)
);
// Status: COMPLETED | Proof: Verified CI Pass ✅`,
  },
];

export function AgentCommerceMotion() {
  const [activeStepId, setActiveStepId] = useState<string>('step-1');
  const [copied, setCopied] = useState<boolean>(false);

  const currentStep = stepsData.find((s) => s.id === activeStepId) || stepsData[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentStep.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-8">
      {/* ─── 1. Header Section ────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-mono font-bold text-purple-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Framer Motion Interactive Flow</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          How Agent Commerce Works
        </h2>
        <p className="text-xs sm:text-sm text-[#98989E] max-w-xl mx-auto">
          Click any step to inspect real protocol payloads, JSON-RPC messages, and Base L2 smart contract escrow events.
        </p>
      </div>

      {/* ─── 2. Interactive 3-Step Tab Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* Animated Background Connector Beam */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30 -translate-y-1/2 z-0 pointer-events-none" />

        {stepsData.map((step) => {
          const isActive = step.id === activeStepId;
          const isBlue = step.color === 'blue';
          const isPurple = step.color === 'purple';

          return (
            <motion.button
              key={step.id}
              onClick={() => setActiveStepId(step.id)}
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`relative z-10 text-left p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${isActive
                  ? isBlue
                    ? 'bg-gradient-to-b from-blue-950/40 via-[#16161E] to-[#121216] border-blue-500/60 shadow-xl shadow-blue-500/10'
                    : isPurple
                      ? 'bg-gradient-to-b from-purple-950/40 via-[#16161E] to-[#121216] border-purple-500/60 shadow-xl shadow-purple-500/10'
                      : 'bg-gradient-to-b from-emerald-950/40 via-[#16161E] to-[#121216] border-emerald-500/60 shadow-xl shadow-emerald-500/10'
                  : 'bg-[#141419]/90 border-white/10 hover:border-white/20'
                }`}
            >
              {/* Active Layout Glow Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeStepGlow"
                  className={`absolute -inset-[1px] rounded-2xl blur-sm pointer-events-none opacity-50 ${isBlue ? 'bg-blue-500' : isPurple ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${isBlue
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : isPurple
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}
                  >
                    {step.number}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${isBlue
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : isPurple
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                  >
                    {step.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#98989E] mt-1 line-clamp-2 leading-relaxed">
                    {step.subtitle}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Inspect payload</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ─── 3. Animated Payload Inspector Box (Framer Motion AnimatePresence) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.99 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`rounded-2xl border backdrop-blur-2xl overflow-hidden shadow-2xl ${currentStep.color === 'blue'
              ? 'bg-[#0E121E]/90 border-blue-500/30'
              : currentStep.color === 'purple'
                ? 'bg-[#150E1E]/90 border-purple-500/30'
                : 'bg-[#0E1E17]/90 border-emerald-500/30'
            }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono font-semibold text-white/90 ml-2 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                {currentStep.codeHeader}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#98989E] hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Description & Code Grid */}
          <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider ${currentStep.color === 'blue'
                    ? 'text-blue-400'
                    : currentStep.color === 'purple'
                      ? 'text-purple-400'
                      : 'text-emerald-400'
                  }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{currentStep.badge}</span>
              </div>
              <h4 className="text-lg font-bold text-white leading-snug">{currentStep.title}</h4>
              <p className="text-xs text-[#98989E] leading-relaxed">{currentStep.description}</p>
            </div>

            {/* Code Block */}
            <div className="lg:col-span-3">
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono overflow-x-auto text-[#E4E4E7] leading-relaxed max-h-[260px] chat-scrollbar">
                <code>{currentStep.codeSnippet}</code>
              </pre>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
