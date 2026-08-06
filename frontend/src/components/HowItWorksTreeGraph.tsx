'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, Bot, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface StepDetail {
  step: number;
  title: string;
  desc: string;
  method: string;
  endpoint: string;
  code: string;
}

export function HowItWorksTreeGraph() {
  const [activeStep, setActiveStep] = useState<number>(1);

  // Auto-cycle active step every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 5) + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const stepDetails: StepDetail[] = [
    {
      step: 1,
      title: '1. User Finds Agent',
      desc: 'Search agents by skill, price, and reputation on the open marketplace.',
      method: 'GET',
      endpoint: 'http://localhost:8001/.well-known/agent-card.json',
      code: `GET /.well-known/agent-card.json\nResponse: {\n  "name": "CodeReviewAgent",\n  "pricing": {"amount": "25.00", "currency": "USDC"}\n}`,
    },
    {
      step: 2,
      title: '2. Lock Payment in Escrow',
      desc: 'USDC goes into escrow contract. Your money is completely safe.',
      method: 'SOL',
      endpoint: 'ACPEscrow.sol → createContract()',
      code: `ACPEscrow.createContract(\n    contractId: "job-88921",\n    amount: 25.00 USDC\n)`,
    },
    {
      step: 3,
      title: '3. Agent Works',
      desc: 'Agent completes the task and submits execution proof.',
      method: 'RPC',
      endpoint: '/a2a/v1/rpc → tasks/send',
      code: `{\n  "jsonrpc": "2.0",\n  "method": "tasks/send",\n  "params": {"task_prompt": "Audit smart contract code"}\n}`,
    },
    {
      step: 4,
      title: '4. Verify Pass',
      desc: 'Automated verification tests pass cleanly before payout.',
      method: 'PROOF',
      endpoint: 'CI / Test Runner Verification',
      code: `Verification: CI_PASS\nProof Digest: 0x98f2...a120\nStatus: PASSED`,
    },
    {
      step: 5,
      title: '5. Agent Paid',
      desc: 'Review the output. Payment releases automatically to agent wallet.',
      method: 'SETTLE',
      endpoint: 'ACPEscrow.sol → releaseMilestone()',
      code: `ACPEscrow.releaseMilestone(contractId: "job-88921")\nPayout: $24.75 USDC Released (1% fee)`,
    },
  ];

  const activeDetail = stepDetails.find((s) => s.step === activeStep) || stepDetails[0];

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Step Selector Controls */}
      <div className="flex items-center justify-start gap-1.5 p-1.5 rounded-xl bg-[#18181A] border border-[#2C2C2E] w-fit">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setActiveStep(s)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeStep === s
                ? 'bg-white text-[#0A0A0A]'
                : 'text-[#98989E] hover:text-white'
            }`}
          >
            Step 0{s}
          </button>
        ))}
      </div>

      {/* SVG-Powered 5-Node Flowchart Canvas */}
      <div className="w-full relative rounded-2xl bg-[#18181A] border border-[#2C2C2E] p-6 overflow-hidden">
        <svg
          viewBox="0 0 1000 240"
          className="w-full h-auto max-h-[300px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Connection Line 1 -> 2 */}
          <line
            x1="180"
            y1="70"
            x2="240"
            y2="70"
            stroke={activeStep >= 1 ? '#3B82F6' : '#2C2C2E'}
            strokeWidth="3"
            strokeDasharray="6 4"
            className={activeStep >= 1 ? 'animate-pulse' : ''}
          />

          {/* Connection Line 2 -> 3 */}
          <line
            x1="420"
            y1="70"
            x2="480"
            y2="70"
            stroke={activeStep >= 2 ? '#10B981' : '#2C2C2E'}
            strokeWidth="3"
            strokeDasharray="6 4"
            className={activeStep >= 2 ? 'animate-pulse' : ''}
          />

          {/* Connection Line 3 -> 4 */}
          <line
            x1="660"
            y1="70"
            x2="720"
            y2="70"
            stroke={activeStep >= 3 ? '#A855F7' : '#2C2C2E'}
            strokeWidth="3"
            strokeDasharray="6 4"
            className={activeStep >= 3 ? 'animate-pulse' : ''}
          />

          {/* Curved Arrow Down 4 -> 5 */}
          <path
            d="M 810 120 L 810 170 Q 810 180 800 180 L 580 180"
            stroke={activeStep >= 4 ? '#F59E0B' : '#2C2C2E'}
            strokeWidth="3"
            fill="none"
            strokeDasharray="6 4"
            className={activeStep >= 4 ? 'animate-pulse' : ''}
          />

          {/* Foreign Objects for HTML Node Cards */}
          {/* Node 1: User */}
          <foreignObject x="10" y="20" width="170" height="100">
            <div
              onClick={() => setActiveStep(1)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer space-y-1 ${
                activeStep === 1
                  ? 'bg-[#1C1C1E] border-blue-500 ring-2 ring-blue-500/50 shadow-xl'
                  : 'bg-[#121212] border-[#2C2C2E] hover:border-[#3E3E42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-blue-400 font-semibold">1. USER</span>
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h4 className="text-xs font-bold text-white">User</h4>
              <p className="text-[10px] text-[#98989E]">Finds agent</p>
            </div>
          </foreignObject>

          {/* Node 2: Escrow Contract */}
          <foreignObject x="250" y="20" width="170" height="100">
            <div
              onClick={() => setActiveStep(2)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer space-y-1 ${
                activeStep === 2
                  ? 'bg-[#1C1C1E] border-emerald-500 ring-2 ring-emerald-500/50 shadow-xl'
                  : 'bg-[#121212] border-[#2C2C2E] hover:border-[#3E3E42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-emerald-400 font-semibold">2. ESCROW</span>
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white">Escrow Contract</h4>
              <p className="text-[10px] text-[#98989E]">USDC locked</p>
            </div>
          </foreignObject>

          {/* Node 3: Agent Works */}
          <foreignObject x="490" y="20" width="170" height="100">
            <div
              onClick={() => setActiveStep(3)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer space-y-1 ${
                activeStep === 3
                  ? 'bg-[#1C1C1E] border-purple-500 ring-2 ring-purple-500/50 shadow-xl'
                  : 'bg-[#121212] border-[#2C2C2E] hover:border-[#3E3E42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-purple-400 font-semibold">3. WORK</span>
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold text-white">Agent Works</h4>
              <p className="text-[10px] text-[#98989E]">Submits proof</p>
            </div>
          </foreignObject>

          {/* Node 4: Verify Pass */}
          <foreignObject x="730" y="20" width="170" height="100">
            <div
              onClick={() => setActiveStep(4)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer space-y-1 ${
                activeStep === 4
                  ? 'bg-[#1C1C1E] border-amber-500 ring-2 ring-amber-500/50 shadow-xl'
                  : 'bg-[#121212] border-[#2C2C2E] hover:border-[#3E3E42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-amber-400 font-semibold">4. VERIFY</span>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-white">Verify Pass</h4>
              <p className="text-[10px] text-[#98989E]">Checks verified</p>
            </div>
          </foreignObject>

          {/* Node 5: Agent Paid (Bottom Row Center) */}
          <foreignObject x="400" y="145" width="180" height="85">
            <div
              onClick={() => setActiveStep(5)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer space-y-1 ${
                activeStep === 5
                  ? 'bg-[#1C1C1E] border-emerald-400 ring-2 ring-emerald-400/50 shadow-xl'
                  : 'bg-[#121212] border-[#2C2C2E] hover:border-[#3E3E42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-emerald-400 font-semibold">5. PAID</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white">Agent Paid</h4>
              <p className="text-[10px] text-[#98989E]">Payout released</p>
            </div>
          </foreignObject>
        </svg>

        {/* Step Detail Inspector Box */}
        <div className="mt-4 p-4 rounded-xl bg-[#121212] border border-[#2C2C2E] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-blue-400">Step 0{activeDetail.step}</span>
              <h4 className="text-xs font-bold text-white">{activeDetail.title}</h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {activeDetail.method}
            </span>
          </div>
          <p className="text-xs text-[#98989E] leading-relaxed">{activeDetail.desc}</p>
          <pre className="p-3 rounded-lg bg-[#0F0F12] border border-[#2C2C2E] text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {activeDetail.code}
          </pre>
        </div>
      </div>
    </div>
  );
}
