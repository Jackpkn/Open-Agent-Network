'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Zap,
  Code2,
  Copy,
  Check,
  X,
  Sparkles,
  Server,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
}

export function AgentInspectorModal({ isOpen, onClose, initialUrl = 'http://localhost:8001' }: AgentInspectorModalProps) {
  const [targetUrl, setTargetUrl] = useState<string>(initialUrl);
  const [isInspectLoading, setIsInspectLoading] = useState<boolean>(false);
  const [inspectionResult, setInspectionResult] = useState<any | null>(null);
  const [testPrompt, setTestPrompt] = useState<string>('Review Python API code for security vulnerabilities');
  const [rpcResult, setRpcResult] = useState<any | null>(null);
  const [isRpcLoading, setIsRpcLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsInspectLoading(true);
    setInspectionResult(null);
    setRpcResult(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/agents/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_url: targetUrl || 'http://localhost:8001' }),
      });
      const data = await res.json();
      setInspectionResult(data);
    } catch (err: any) {
      setInspectionResult({
        status: 'error',
        error: `Connection error: ${err.message}`,
        errors: [`Could not reach http://localhost:3001 protocol hub`],
      });
    } finally {
      setIsInspectLoading(false);
    }
  };

  const handleTestRpc = async () => {
    setIsRpcLoading(true);
    setRpcResult(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/jobs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_did: inspectionResult?.agent_card?.url || targetUrl,
          skill_id: inspectionResult?.agent_card?.skills?.[0]?.id || 'code-review',
          task_input: { prompt: testPrompt },
          amount_usdc: inspectionResult?.agent_card?.skills?.[0]?.pricing?.amount || '25.00',
        }),
      });

      const data = await res.json();
      setRpcResult(data);
    } catch (err: any) {
      setRpcResult({ error: `RPC execution error: ${err.message}` });
    } finally {
      setIsRpcLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (inspectionResult?.agent_card) {
      navigator.clipboard.writeText(JSON.stringify(inspectionResult.agent_card, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl overflow-hidden relative my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2E] bg-[#121214]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Agent URL Inspector & Live Debugger</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  Google A2A v1.0
                </span>
              </h3>
              <p className="text-xs text-[#98989E]">Validate agent card discovery & test live A2A JSON-RPC payloads</p>
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
          {/* Form Input */}
          <form onSubmit={handleInspect} className="flex gap-3">
            <div className="relative flex-1">
              <Server className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98989E]" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="http://localhost:8001"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#121214] border border-[#2C2C2E] text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isInspectLoading}
              className="h-11 px-5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-md shrink-0"
            >
              {isInspectLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Discovering...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Inspect Agent</span>
                </>
              )}
            </button>
          </form>

          {/* Inspection Results Breakdown */}
          {inspectionResult && (
            <div className="space-y-5">
              {/* Health & Ping Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#121214] border border-[#2C2C2E]">
                <div className="flex items-center space-x-3">
                  {inspectionResult.status === 'valid' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : inspectionResult.status === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">
                      {inspectionResult.status === 'valid'
                        ? 'Valid Google A2A Agent Card'
                        : inspectionResult.status === 'warning'
                        ? 'Discovered with Warnings'
                        : 'Discovery Failed'}
                    </div>
                    <div className="text-[11px] font-mono text-[#98989E]">{targetUrl}/.well-known/agent-card.json</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="text-[#98989E]">Latency:</span>
                  <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {inspectionResult.ping_ms}ms
                  </span>
                </div>
              </div>

              {/* Validation Checklist */}
              {inspectionResult.checks && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#121214] border border-[#2C2C2E] space-y-1">
                    <div className="text-[10px] text-[#98989E]">Agent Card</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      {inspectionResult.checks.cardDiscovered ? (
                        <span className="text-emerald-400">✓ Found</span>
                      ) : (
                        <span className="text-rose-400">✗ Missing</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#121214] border border-[#2C2C2E] space-y-1">
                    <div className="text-[10px] text-[#98989E]">Name Field</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      {inspectionResult.checks.hasValidName ? (
                        <span className="text-emerald-400">✓ Valid</span>
                      ) : (
                        <span className="text-rose-400">✗ Missing</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#121214] border border-[#2C2C2E] space-y-1">
                    <div className="text-[10px] text-[#98989E]">Skills Array</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      {inspectionResult.checks.hasSkills ? (
                        <span className="text-emerald-400">✓ Configured</span>
                      ) : (
                        <span className="text-rose-400">✗ Empty</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#121214] border border-[#2C2C2E] space-y-1">
                    <div className="text-[10px] text-[#98989E]">Pricing Spec</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      {inspectionResult.checks.hasValidPricing ? (
                        <span className="text-emerald-400">✓ USDC Spec</span>
                      ) : (
                        <span className="text-amber-400">⚠ Default</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Card JSON Payload */}
              {inspectionResult.agent_card && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Discovered agent-card.json</span>
                    <button
                      onClick={handleCopyJson}
                      className="text-[11px] font-mono text-[#98989E] hover:text-white flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#121214] border border-[#2C2C2E] text-[11px] font-mono text-blue-300 max-h-48 overflow-y-auto leading-relaxed">
                    {JSON.stringify(inspectionResult.agent_card, null, 2)}
                  </pre>
                </div>
              )}

              {/* Interactive Live A2A Task Test Playground */}
              {inspectionResult.agent_card && (
                <div className="p-5 rounded-2xl bg-[#121214] border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-white">
                      <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span>Test A2A JSON-RPC Payload Invocation</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#98989E]">Escrow Trigger Ready</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="Type test task prompt..."
                      className="flex-1 h-9 px-3 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-xs font-medium text-white placeholder-[#636366] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleTestRpc}
                      disabled={isRpcLoading}
                      className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shrink-0"
                    >
                      {isRpcLoading ? (
                        <>
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Execute RPC</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* RPC Result Output */}
                  {rpcResult && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                        ✅ RPC Response Payload ({rpcResult.job?.status || 'SUBMITTED'})
                      </div>
                      <pre className="p-3 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-[11px] font-mono text-emerald-300 max-h-40 overflow-y-auto leading-relaxed">
                        {JSON.stringify(rpcResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
