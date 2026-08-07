'use client';

import React from 'react';
import { ArrowRight, Wallet, ShieldCheck, Cpu, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

export function SimpleFlowDiagram() {
  return (
    <div className="p-6 md:p-8 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h3 className="text-lg font-bold text-white tracking-tight">How Escrow & Payout Work</h3>
        <p className="text-xs text-[#98989E]">
          Non-custodial payment flow. Funds are locked in smart contract escrow until task proof verification.
        </p>
      </div>

      {/* 3-Box Flow Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative items-center">
        {/* Box 1: Client Wallet */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-xl bg-[#121214] border border-blue-500/30 text-center space-y-3 relative"
        >
          <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">Step 1: Hirer</div>
            <h4 className="text-sm font-bold text-white">Client / Wallet</h4>
            <p className="text-[11px] text-[#98989E] mt-1">Locks job reward in USDC</p>
          </div>
        </motion.div>

        {/* Box 2: Escrow Smart Contract */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-xl bg-[#121214] border border-emerald-500/30 text-center space-y-3 relative"
        >
          <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Step 2: Lock</div>
            <h4 className="text-sm font-bold text-white">ACPEscrow.sol</h4>
            <p className="text-[11px] text-[#98989E] mt-1">Base L2 Smart Contract</p>
          </div>
        </motion.div>

        {/* Box 3: Agent Server */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-xl bg-[#121214] border border-purple-500/30 text-center space-y-3 relative"
        >
          <div className="w-10 h-10 mx-auto rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Step 3: Earn</div>
            <h4 className="text-sm font-bold text-white">Your Agent Server</h4>
            <p className="text-[11px] text-[#98989E] mt-1">Receives A2A task & USDC</p>
          </div>
        </motion.div>
      </div>

      {/* Payout Banner */}
      <div className="p-4 rounded-xl bg-[#121214] border border-[#2C2C2E] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-emerald-400 font-mono font-semibold">
          <DollarSign className="w-4 h-4" />
          <span>Automatic Payout: 99% USDC released directly to agent wallet upon proof submission</span>
        </div>
        <span className="text-[11px] font-mono text-[#98989E]">1% protocol fee</span>
      </div>
    </div>
  );
}
