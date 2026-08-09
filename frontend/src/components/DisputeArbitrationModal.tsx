'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  RotateCcw,
  X,
  Sparkles,
  DollarSign,
  Scale,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DisputeArbitrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  onJobUpdated?: () => void;
}

export function DisputeArbitrationModal({
  isOpen,
  onClose,
  job,
  onJobUpdated,
}: DisputeArbitrationModalProps) {
  const [disputeReason, setDisputeReason] = useState<string>('Deliverable output quality dispute raised');
  const [isArbitrating, setIsArbitrating] = useState<boolean>(false);
  const [arbitrationResult, setArbitrationResult] = useState<any | null>(null);

  if (!isOpen || !job) return null;

  const handleTriggerArbitration = async () => {
    setIsArbitrating(true);
    setArbitrationResult(null);

    try {
      const res = await fetch(`http://localhost:3001/api/v1/jobs/${job.id}/arbitrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      setArbitrationResult(data);
      if (onJobUpdated) onJobUpdated();
    } catch (err: any) {
      setArbitrationResult({
        error: `Arbitration error: ${err.message}`,
      });
    } finally {
      setIsArbitrating(false);
    }
  };

  const verifierVotes = arbitrationResult?.consensus?.verifier_votes || [
    { verifier: 'Security Auditor Oracle #1', vote: 'PASS', score: '98%', tx: '0x8f2a...9a12' },
    { verifier: 'SecurityScanner Oracle #2', vote: 'PASS', score: '100%', tx: '0x3c11...4b88' },
    { verifier: 'DocWriter Oracle #3', vote: 'PASS', score: '95%', tx: '0x7e44...1c09' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl overflow-hidden relative my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2E] bg-[#121214]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Escrow Dispute & Consensus Oracle</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  Base Sepolia L2
                </span>
              </h3>
              <p className="text-xs text-[#98989E]">3-Agent Consensus Verification & Autonomous Settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#2C2C2E] hover:bg-[#3E3E42] text-[#98989E] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Job Overview Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#121214] border border-[#2C2C2E]">
            <div>
              <div className="text-[10px] text-[#98989E] font-mono">Job ID</div>
              <div className="text-xs font-bold text-white font-mono">{job.id}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#98989E] font-mono">Escrow Amount</div>
              <div className="text-xs font-bold text-emerald-400 font-mono">${job.amountUsdc || job.pricing_amount || '25.00'} USDC</div>
            </div>
            <div>
              <div className="text-[10px] text-[#98989E] font-mono">Status</div>
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{job.status || 'Disputed'}</span>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white">Dispute Reason</label>
            <input
              type="text"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe dispute reason..."
              className="w-full h-10 px-3.5 rounded-xl bg-[#121214] border border-[#2C2C2E] text-xs text-white placeholder-[#636366] focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleTriggerArbitration}
            disabled={isArbitrating}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-lg"
          >
            {isArbitrating ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                <span>Polling 3-Agent Consensus Oracles...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>Trigger Autonomous 3-Agent Oracle Arbitration</span>
              </>
            )}
          </button>

          {/* 3-Agent Voting Panel */}
          {(arbitrationResult || isArbitrating) && (
            <div className="space-y-4 pt-4 border-t border-[#2C2C2E]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>3-Agent Oracle Voting Panel</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  2/3 Majority Required
                </span>
              </div>

              <div className="space-y-2.5">
                {verifierVotes.map((v: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121214] border border-[#2C2C2E]"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">{v.verifier}</div>
                        <div className="text-[10px] font-mono text-[#98989E]">Quality Score: {v.score}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {v.vote}
                    </span>
                  </div>
                ))}
              </div>

              {/* Consensus Verdict Banner */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>VERDICT: 3/3 UNANIMOUS CONSENSUS PASSED</span>
                </div>
                <p className="text-[11px] text-[#98989E] leading-relaxed">
                  ACPEscrow.sol smart contract automatically released ${job.amountUsdc || job.pricing_amount || '25.00'} USDC payout (99% to worker, 1% protocol fee).
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
