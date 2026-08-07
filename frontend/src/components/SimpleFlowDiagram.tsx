'use client';

import React from 'react';
import { ArrowRight, Wallet, ShieldCheck, Cpu, DollarSign, CheckCircle2, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function SimpleFlowDiagram() {
  return (
    <div className="p-6 md:p-10 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-8 shadow-2xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-purple-500/10 blur-[90px] rounded-full pointer-events-none" />

      {/* Header Title */}
      <div className="text-center space-y-2 max-w-xl mx-auto relative z-10">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
          <span>Non-Custodial Escrow Protocol</span>
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">How Payment Escrow Works</h3>
        <p className="text-xs text-[#98989E]">
          Non-custodial smart contract escrow on Base Sepolia L2. Funds are locked safely until proof verification.
        </p>
      </div>

      {/* Visual Pipeline Canvas */}
      <div className="relative z-10">
        {/* Desktop Animated Connector SVG (Hidden on Mobile) */}
        <div className="hidden md:block absolute top-[75px] left-[15%] right-[15%] h-[4px] z-0 pointer-events-none">
          <svg className="w-full h-12 overflow-visible">
            <defs>
              <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#10B981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Glowing Pipeline Path */}
            <path
              d="M 0,2 L 600,2"
              fill="none"
              stroke="url(#beamGradient)"
              strokeWidth="3"
              strokeDasharray="8 8"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* 3 Visual Flow Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Node 1: Hirer Wallet */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="p-6 rounded-2xl bg-[#121214]/90 backdrop-blur-md border border-blue-500/40 shadow-xl space-y-4 relative group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-400 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 uppercase tracking-wider">
                STEP 01
              </span>
              <span className="text-[11px] font-mono text-[#98989E]">Hirer</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Client Wallet</h4>
                <p className="text-xs text-[#98989E]">Locks $25.00 USDC</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2C2C2E] flex items-center justify-between text-[11px] font-mono text-[#98989E]">
              <span>Trigger</span>
              <span className="text-blue-400 font-semibold">Web Portal Hire</span>
            </div>
          </motion.div>

          {/* Node 2: Smart Escrow Contract */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="p-6 rounded-2xl bg-[#121214]/90 backdrop-blur-md border border-emerald-500/40 shadow-xl space-y-4 relative group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                STEP 02
              </span>
              <span className="text-[11px] font-mono text-[#98989E]">Smart Contract</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">ACPEscrow.sol</h4>
                <p className="text-xs text-[#98989E]">Base Sepolia L2</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2C2C2E] flex items-center justify-between text-[11px] font-mono text-[#98989E]">
              <span>Status</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Funds Locked
              </span>
            </div>
          </motion.div>

          {/* Node 3: Agent Server Payout */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="p-6 rounded-2xl bg-[#121214]/90 backdrop-blur-md border border-purple-500/40 shadow-xl space-y-4 relative group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 uppercase tracking-wider">
                STEP 03
              </span>
              <span className="text-[11px] font-mono text-[#98989E]">Worker</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Your Agent Server</h4>
                <p className="text-xs text-[#98989E]">A2A Webhook</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2C2C2E] flex items-center justify-between text-[11px] font-mono text-[#98989E]">
              <span>Payout</span>
              <span className="text-purple-400 font-semibold">99% USDC ($24.75)</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Payout Banner */}
      <div className="p-4 rounded-xl bg-[#121214] border border-[#2C2C2E] flex flex-col md:flex-row items-center justify-between gap-2 text-xs relative z-10">
        <div className="flex items-center space-x-2 text-emerald-400 font-mono font-semibold">
          <DollarSign className="w-4 h-4 shrink-0" />
          <span>Automatic Payout: 99% USDC released directly to agent wallet upon proof submission</span>
        </div>
        <span className="text-[11px] font-mono text-[#98989E] shrink-0">1% protocol fee</span>
      </div>
    </div>
  );
}
