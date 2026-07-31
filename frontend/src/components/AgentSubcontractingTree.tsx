'use client';

import React, { useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, User, Code2, Terminal, ShieldCheck, DollarSign, Layers } from 'lucide-react';

export interface ActiveJob {
  id: string;
  workerName: string;
  workerDid: string;
  skillId: string;
  description: string;
  amountUsdc: string;
  status: 'ACTIVE_ESCROW' | 'SUBMITTED' | 'COMPLETED';
  outputCid?: string;
  txHash: string;
  createdAt: string;
}

interface AgentSubcontractingTreeProps {
  jobs?: ActiveJob[];
}

// Custom Node for Hirer (Human / Enterprise)
function HirerNode({ data }: NodeProps) {
  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl border-2 border-blue-500/80 p-4 rounded-2xl shadow-xl shadow-blue-500/20 text-slate-100 min-w-[260px]">
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{String(data.label || 'Hirer (Your Wallet)')}</h4>
          <p className="text-[10px] text-blue-400 font-mono font-semibold">{String(data.subtext || 'Locked Escrow')}</p>
        </div>
      </div>
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300">
        {String(data.task || 'Target Task')}
      </div>
    </div>
  );
}

// Custom Node for Orchestrator Agent Y
function OrchestratorNode({ data }: NodeProps) {
  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl border-2 border-purple-500/80 p-4 rounded-2xl shadow-xl shadow-purple-500/20 text-slate-100 min-w-[280px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{String(data.label || 'Agent Y')}</h4>
          <p className="text-[10px] text-purple-400 font-mono font-semibold">{String(data.subtext || 'Orchestrating Sub-Tasks')}</p>
        </div>
      </div>
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
        {String(data.did || 'did:web:agent.org')}
      </div>
    </div>
  );
}

// Custom Node for Worker Subagent Z
function WorkerSubagentNode({ data }: NodeProps) {
  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl border-2 border-emerald-500/80 p-4 rounded-2xl shadow-xl shadow-emerald-500/20 text-slate-100 min-w-[250px]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
          <Code2 className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{String(data.label || 'Subagent Z')}</h4>
          <p className="text-[10px] text-emerald-400 font-mono font-bold">{String(data.subtext || 'USDC')} Escrow</p>
        </div>
      </div>
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
        <p className="text-[10px] text-slate-400">{String(data.task || 'Subtask')}</p>
        <p className="text-[9px] font-mono text-purple-400 truncate">{String(data.cid || 'ipfs://QmOutput')}</p>
      </div>
    </div>
  );
}

const nodeTypes = {
  hirerNode: HirerNode,
  orchestratorNode: OrchestratorNode,
  workerSubagentNode: WorkerSubagentNode,
};

export function AgentSubcontractingTree({ jobs }: AgentSubcontractingTreeProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[520px] rounded-2xl bg-[#030712] border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading Dynamic Tree Engine...
      </div>
    );
  }

  const activeJobsList = jobs && jobs.length > 0 ? jobs : [
    {
      id: 'job-9821',
      workerName: 'Claude Code Auditor',
      workerDid: 'did:web:claude-reviewer.ai',
      skillId: 'code-review',
      description: 'Audit smart contract deposit function for reentrancy and SQL injection',
      amountUsdc: '25.00',
      status: 'SUBMITTED' as const,
      outputCid: 'ipfs://QmAudit_Gemini_Flash_Result_9821',
      txHash: '0x8f192b49c71a39b2e04f98120d04b82109283719402910485918239014859102',
      createdAt: '10 mins ago',
    }
  ];

  const currentJob = activeJobsList[selectedJobIndex] || activeJobsList[0];
  const numAmount = parseFloat(currentJob.amountUsdc) || 25.0;
  const sub1Amount = (numAmount * 0.5).toFixed(2);
  const sub2Amount = (numAmount * 0.4).toFixed(2);
  const retainAmount = (numAmount * 0.1).toFixed(2);

  // Dynamic Tree Nodes based on current selected active job
  const dynamicNodes: Node[] = [
    {
      id: 'hirer-node',
      type: 'hirerNode',
      position: { x: 280, y: 20 },
      data: {
        label: 'Person X (Your Wallet)',
        subtext: `Locked $${currentJob.amountUsdc} USDC in ACPEscrow.sol`,
        task: `Task: ${currentJob.description.slice(0, 45)}...`,
      },
    },
    {
      id: 'orchestrator-node',
      type: 'orchestratorNode',
      position: { x: 270, y: 180 },
      data: {
        label: `${currentJob.workerName}`,
        subtext: `Retains $${retainAmount} | Subcontracts $${(numAmount * 0.9).toFixed(2)}`,
        did: currentJob.workerDid,
      },
    },
    {
      id: 'subagent-z1',
      type: 'workerSubagentNode',
      position: { x: 60, y: 360 },
      data: {
        label: `Agent Z1 (${currentJob.skillId} Specialist)`,
        subtext: `$${sub1Amount} USDC`,
        task: `Payload: ${currentJob.description.slice(0, 32)}`,
        cid: currentJob.outputCid || 'ipfs://QmTaskPayload_Z1',
      },
    },
    {
      id: 'subagent-z2',
      type: 'workerSubagentNode',
      position: { x: 460, y: 360 },
      data: {
        label: `Agent Z2 (Verification Sentinel)`,
        subtext: `$${sub2Amount} USDC`,
        task: `IPFS & Execution Proof Verification`,
        cid: `ipfs://QmVerifyProof_${currentJob.id}`,
      },
    },
  ];

  const dynamicEdges: Edge[] = [
    {
      id: 'e-hirer-orchestrator',
      source: 'hirer-node',
      target: 'orchestrator-node',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 3 },
      label: `$${currentJob.amountUsdc} USDC Escrow`,
      labelStyle: { fill: '#60a5fa', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#0f172a', rx: 6 },
    },
    {
      id: 'e-orchestrator-z1',
      source: 'orchestrator-node',
      target: 'subagent-z1',
      animated: true,
      style: { stroke: '#a855f7', strokeWidth: 2.5 },
      label: `$${sub1Amount} A2A Task`,
      labelStyle: { fill: '#c084fc', fontWeight: 700, fontSize: 10 },
      labelBgStyle: { fill: '#0f172a', rx: 6 },
    },
    {
      id: 'e-orchestrator-z2',
      source: 'orchestrator-node',
      target: 'subagent-z2',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2.5 },
      label: `$${sub2Amount} A2A Task`,
      labelStyle: { fill: '#34d399', fontWeight: 700, fontSize: 10 },
      labelBgStyle: { fill: '#0f172a', rx: 6 },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Job Selector Switcher */}
      <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Select Active Job Tree Flow:</span>
        </div>
        <div className="flex items-center space-x-2">
          {activeJobsList.map((job, idx) => (
            <button
              key={job.id}
              onClick={() => setSelectedJobIndex(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedJobIndex === idx
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {job.id} (${job.amountUsdc})
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic React Flow Canvas */}
      <div className="w-full h-[520px] rounded-2xl bg-[#030712] border border-slate-800 overflow-hidden relative shadow-2xl">
        <ReactFlow
          nodes={dynamicNodes}
          edges={dynamicEdges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          className="bg-[#030712]"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !text-white rounded-xl shadow-lg" />
        </ReactFlow>
      </div>
    </div>
  );
}
