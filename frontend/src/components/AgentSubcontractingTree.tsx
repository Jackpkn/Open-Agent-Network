'use client';

import React from 'react';
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
import { Bot, User, Code2, Terminal, ShieldCheck, DollarSign } from 'lucide-react';

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
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{String(data.label || 'Hirer (Person X)')}</h4>
          <p className="text-[10px] text-blue-400 font-mono font-semibold">{String(data.subtext || 'Locked $50.00 USDC Escrow')}</p>
        </div>
      </div>
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300">
        {String(data.task || 'Target: Monolith Code & Infra Audit')}
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
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{String(data.label || 'Agent Y (Orchestrator)')}</h4>
          <p className="text-[10px] text-purple-400 font-mono font-semibold">{String(data.subtext || 'Retains $5.00 | Subcontracts $45.00')}</p>
        </div>
      </div>
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
        {String(data.did || 'did:web:orchestrator-y.org')}
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
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{String(data.label || 'Agent Z')}</h4>
          <p className="text-[10px] text-emerald-400 font-mono font-bold">{String(data.subtext || '$25.00 USDC')} Escrow</p>
        </div>
      </div>
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
        <p className="text-[10px] text-slate-400">{String(data.task || 'Task Payload')}</p>
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

const initialNodes: Node[] = [
  {
    id: 'hirer-1',
    type: 'hirerNode',
    position: { x: 280, y: 20 },
    data: {
      label: 'Person X (Hirer)',
      subtext: 'Locked $50.00 USDC in ACPEscrow.sol',
      task: 'Task: Audit Code Repository & Infrastructure',
    },
  },
  {
    id: 'orchestrator-1',
    type: 'orchestratorNode',
    position: { x: 270, y: 180 },
    data: {
      label: 'Agent Y (Main Orchestrator)',
      subtext: 'Retains $5.00 USDC | Subcontracts $45.00 USDC',
      did: 'did:web:orchestrator-y.org',
    },
  },
  {
    id: 'worker-z1',
    type: 'workerSubagentNode',
    position: { x: 60, y: 360 },
    data: {
      label: 'Agent Z1 (Code Auditor)',
      subtext: '$25.00 USDC',
      task: 'Security audit of backend Python code',
      cid: 'ipfs://QmAudit_Python_Vulnerabilities_Z1',
    },
  },
  {
    id: 'worker-z2',
    type: 'workerSubagentNode',
    position: { x: 460, y: 360 },
    data: {
      label: 'Agent Z2 (DevOps Sentinel)',
      subtext: '$20.00 USDC',
      task: 'Audit Terraform & Kubernetes manifests',
      cid: 'ipfs://QmAudit_Terraform_K8s_Spec_Z2',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-hirer-orchestrator',
    source: 'hirer-1',
    target: 'orchestrator-1',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 3 },
    label: '$50.00 USDC Escrow',
    labelStyle: { fill: '#60a5fa', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#0f172a', rx: 6 },
  },
  {
    id: 'e-orchestrator-z1',
    source: 'orchestrator-1',
    target: 'worker-z1',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2.5 },
    label: '$25.00 A2A Task',
    labelStyle: { fill: '#c084fc', fontWeight: 700, fontSize: 10 },
    labelBgStyle: { fill: '#0f172a', rx: 6 },
  },
  {
    id: 'e-orchestrator-z2',
    source: 'orchestrator-1',
    target: 'worker-z2',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    label: '$20.00 A2A Task',
    labelStyle: { fill: '#34d399', fontWeight: 700, fontSize: 10 },
    labelBgStyle: { fill: '#0f172a', rx: 6 },
  },
];

export function AgentSubcontractingTree() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[520px] rounded-2xl bg-[#030712] border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading Graph Engine...
      </div>
    );
  }

  return (
    <div className="w-full h-[520px] rounded-2xl bg-[#030712] border border-slate-800 overflow-hidden relative shadow-2xl">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        className="bg-[#030712]"
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-white rounded-xl shadow-lg" />
      </ReactFlow>
    </div>
  );
}
