'use client';

import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bot,
  ShieldCheck,
  Zap,
  Code2,
  DollarSign,
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

// ─── Custom Node Components ─────────────────────────────────────────

function HirerNode({ data }: NodeProps) {
  return (
    <div className="bg-[#0D1322]/95 backdrop-blur-2xl border-2 border-blue-500/80 p-4 rounded-2xl shadow-2xl shadow-blue-500/20 text-white min-w-[240px] hover:border-blue-400 transition-colors">
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3.5 !h-3.5" />
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-md">
          <User className="w-4.5 h-4.5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">STEP 01 • HIRER</span>
          <h4 className="text-xs font-bold text-white truncate">{String(data.label || 'Client Wallet')}</h4>
        </div>
      </div>
      <div className="bg-black/60 p-2.5 rounded-xl border border-blue-500/20 text-[11px] text-[#98989E] space-y-1 font-mono">
        <div className="text-white font-semibold flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-emerald-400" />
          <span>{String(data.amount || '$25.00 USDC')}</span>
        </div>
        <p className="text-[10px] text-blue-300/80">{String(data.subtext || 'Locks in ACPEscrow.sol')}</p>
      </div>
    </div>
  );
}

function ProtocolHubNode({ data }: NodeProps) {
  return (
    <div className="bg-[#150F22]/95 backdrop-blur-2xl border-2 border-purple-500/80 p-4 rounded-2xl shadow-2xl shadow-purple-500/20 text-white min-w-[260px] hover:border-purple-400 transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3.5 !h-3.5" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3.5 !h-3.5" />
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-md">
          <Zap className="w-4.5 h-4.5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">STEP 02 • DISCOVERY</span>
          <h4 className="text-xs font-bold text-white truncate">{String(data.label || 'Protocol Hub API')}</h4>
        </div>
      </div>
      <div className="bg-black/60 p-2.5 rounded-xl border border-purple-500/20 text-[11px] text-[#98989E] space-y-1 font-mono">
        <div className="text-purple-300 font-semibold">{String(data.endpoint || 'GET /agent-card.json')}</div>
        <p className="text-[10px] text-[#98989E]">{String(data.subtext || 'Google A2A Standard')}</p>
      </div>
    </div>
  );
}

function WorkerAgentNode({ data }: NodeProps) {
  return (
    <div className="bg-[#0E1A16]/95 backdrop-blur-2xl border-2 border-emerald-500/80 p-4 rounded-2xl shadow-2xl shadow-emerald-500/20 text-white min-w-[270px] hover:border-emerald-400 transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3.5 !h-3.5" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-3.5 !h-3.5" />
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md">
          <Bot className="w-4.5 h-4.5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">STEP 03 • WORKER</span>
          <h4 className="text-xs font-bold text-white truncate">{String(data.label || 'Claude Code Auditor')}</h4>
        </div>
      </div>
      <div className="bg-black/60 p-2.5 rounded-xl border border-emerald-500/20 text-[11px] text-[#98989E] space-y-1 font-mono">
        <div className="text-emerald-300 font-semibold">{String(data.task || 'Gemini 3.6 Audit')}</div>
        <div className="text-[10px] text-emerald-400 font-bold">{String(data.payout || 'Payout: $24.75 USDC (99%)')}</div>
      </div>
    </div>
  );
}

function SubWorkerNode({ data }: NodeProps) {
  return (
    <div className="bg-[#1C140D]/95 backdrop-blur-2xl border-2 border-amber-500/80 p-4 rounded-2xl shadow-2xl shadow-amber-500/20 text-white min-w-[250px] hover:border-amber-400 transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-3.5 !h-3.5" />
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md">
          <Code2 className="w-4.5 h-4.5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">STEP 04 • SUB-AGENT</span>
          <h4 className="text-xs font-bold text-white truncate">{String(data.label || 'SecurityScanner (8003)')}</h4>
        </div>
      </div>
      <div className="bg-black/60 p-2.5 rounded-xl border border-amber-500/20 text-[11px] text-[#98989E] space-y-1 font-mono">
        <div className="text-amber-300 font-semibold">{String(data.subtask || 'Sub-Job #job-f02a')}</div>
        <p className="text-[10px] text-[#98989E]">{String(data.subtext || 'Sub-Escrow: $10.00 USDC')}</p>
      </div>
    </div>
  );
}

const nodeTypes = {
  hirerNode: HirerNode,
  protocolHubNode: ProtocolHubNode,
  workerAgentNode: WorkerAgentNode,
  subWorkerNode: SubWorkerNode,
};

// ─── Initial Node & Edge Configurations ─────────────────────────────

const initialNodes: Node[] = [
  {
    id: 'node-1',
    type: 'hirerNode',
    position: { x: 20, y: 120 },
    data: {
      label: 'Client Wallet (Hirer)',
      amount: '$25.00 USDC Escrow',
      subtext: 'Locks in ACPEscrow.sol',
    },
  },
  {
    id: 'node-2',
    type: 'protocolHubNode',
    position: { x: 320, y: 120 },
    data: {
      label: 'Open Agent Network Hub',
      endpoint: 'GET /.well-known/agent-card.json',
      subtext: 'Google A2A Standard',
    },
  },
  {
    id: 'node-3',
    type: 'workerAgentNode',
    position: { x: 650, y: 30 },
    data: {
      label: 'Claude Code Auditor (8001)',
      task: 'Gemini 3.6 Flash Audit',
      payout: 'Payout: $24.75 USDC (99%)',
    },
  },
  {
    id: 'node-4',
    type: 'subWorkerNode',
    position: { x: 990, y: 220 },
    data: {
      label: 'SecurityScanner Agent (8003)',
      subtask: 'AST Vulnerability Scan',
      subtext: 'Sub-Escrow: $10.00 USDC',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'node-1',
    target: 'node-2',
    animated: true,
    style: { stroke: '#3B82F6', strokeWidth: 3 },
    label: '$25.00 Lock',
    labelStyle: { fill: '#60A5FA', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#0B0B0E', rx: 6 },
  },
  {
    id: 'e2-3',
    source: 'node-2',
    target: 'node-3',
    animated: true,
    style: { stroke: '#A855F7', strokeWidth: 3 },
    label: 'A2A RPC Task',
    labelStyle: { fill: '#C084FC', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#0B0B0E', rx: 6 },
  },
  {
    id: 'e3-4',
    source: 'node-3',
    target: 'node-4',
    animated: true,
    style: { stroke: '#F59E0B', strokeWidth: 3 },
    label: '$10.00 Sub-Escrow',
    labelStyle: { fill: '#FBBF24', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#0B0B0E', rx: 6 },
  },
];

// ─── Main Component ────────────────────────────────────────────────

export function AgentCommerceFlowGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-2');
  const [copied, setCopied] = useState<boolean>(false);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const getPayloadForNode = (id: string) => {
    switch (id) {
      case 'node-1':
        return {
          title: 'Client Escrow Deposit',
          type: 'Solidity Transaction',
          code: `// ACPEscrow.sol :: createContract
ACPEscrow.createContract(
    contractId = "0x8f192b49c71a39b2...",
    worker     = "0x4A8109F2c2901...",
    milestone1 = 5000, // 50%
    milestone2 = 5000  // 50%
);
// Amount: $25.00 USDC locked on Base Sepolia L2`,
        };
      case 'node-2':
        return {
          title: 'Google A2A Discovery Manifest',
          type: 'JSON Manifest',
          code: `GET /.well-known/agent-card.json
{
  "name": "Claude Code Auditor",
  "url": "http://localhost:8001",
  "version": "1.0.0",
  "skills": [{
    "id": "code-review",
    "name": "Security Audit",
    "pricing": { "amount": "25.00", "currency": "USDC" }
  }]
}`,
        };
      case 'node-3':
        return {
          title: 'A2A Task Dispatch & Execution',
          type: 'JSON-RPC 2.0 Payload',
          code: `POST /a2a/v1/rpc (tasks/send)
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "job-9821",
    "message": { "parts": [{ "text": "Audit smart contract reentrancy" }] }
  }
}`,
        };
      case 'node-4':
        return {
          title: 'Autonomous A2A Subcontracting',
          type: 'Subagent JSON-RPC',
          code: `POST http://localhost:8003/a2a/v1/rpc
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "sub-job-f02a",
    "message": { "parts": [{ "text": "Scan AST for SQL injection" }] }
  },
  "sub_escrow_usdc": "10.00"
}`,
        };
      default:
        return {
          title: 'Protocol Event Payload',
          type: 'JSON',
          code: '// Select a node in the tree graph above',
        };
    }
  };

  const payload = getPayloadForNode(selectedNodeId);

  const handleCopy = () => {
    navigator.clipboard.writeText(payload.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono font-bold text-blue-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ReactFlow v12 Dynamic Tree Canvas</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          How Agent Commerce Works
        </h2>
        <p className="text-xs sm:text-sm text-[#98989E] max-w-xl mx-auto">
          Interactive A2A DAG tree graph. Click any node to inspect real-time JSON-RPC payloads, discovery cards, and escrow flows.
        </p>
      </div>

      {/* ─── 1. Interactive ReactFlow Canvas ──────────────────────────── */}
      <div className="w-full h-[460px] rounded-3xl bg-[#07070A] border border-white/10 shadow-2xl relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-right"
          className="bg-[#07070A]"
        >
          <Background color="#1E293B" gap={24} size={1.5} />
          <Controls className="!bg-[#141419] !border-white/10 !text-white rounded-xl shadow-xl" />
        </ReactFlow>
      </div>

      {/* ─── 2. Selected Node Code & Protocol Payload Inspector ──────── */}
      <motion.div
        key={selectedNodeId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-[#0F0F14] border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2 font-mono text-xs text-white">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="font-bold">{payload.title}</span>
            <span className="text-[#636366]">•</span>
            <span className="text-[#98989E]">{payload.type}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#98989E] hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Payload</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4">
          <pre className="p-4 rounded-xl bg-black/70 border border-white/5 text-xs font-mono text-[#E4E4E7] overflow-x-auto leading-relaxed max-h-[220px] chat-scrollbar">
            <code>{payload.code}</code>
          </pre>
        </div>
      </motion.div>
    </div>
  );
}
