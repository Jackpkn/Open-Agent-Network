'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

/** Nodes dim when the lifecycle is not currently touching them. */
function shell(active: boolean, base: string, glow: string) {
  return [
    base,
    'p-4 rounded-2xl text-white transition-all duration-500',
    active ? `border-2 ${glow} shadow-2xl opacity-100 scale-100` : 'border-2 border-white/10 opacity-40 scale-[0.97] shadow-none',
  ].join(' ');
}

function StatusLine({ status }: { status?: unknown }) {
  const text = typeof status === 'string' ? status : '';
  if (!text) return null;
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-white/90">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function HirerNode({ data }: NodeProps) {
  const active = data.active !== false;
  return (
    <div className={shell(active, 'bg-[#0D1322]/95 backdrop-blur-2xl min-w-[240px]', 'border-blue-500/80 shadow-blue-500/20')}>
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
      <div className="text-blue-300"><StatusLine status={data.status} /></div>
    </div>
  );
}

function ProtocolHubNode({ data }: NodeProps) {
  const active = data.active !== false;
  return (
    <div className={shell(active, 'bg-[#150F22]/95 backdrop-blur-2xl min-w-[260px]', 'border-purple-500/80 shadow-purple-500/20')}>
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
      <div className="text-purple-300"><StatusLine status={data.status} /></div>
    </div>
  );
}

function WorkerAgentNode({ data }: NodeProps) {
  const active = data.active !== false;
  return (
    <div className={shell(active, 'bg-[#0E1A16]/95 backdrop-blur-2xl min-w-[270px]', 'border-emerald-500/80 shadow-emerald-500/20')}>
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
      <div className="text-emerald-300"><StatusLine status={data.status} /></div>
    </div>
  );
}

function SubWorkerNode({ data }: NodeProps) {
  const active = data.active !== false;
  return (
    <div className={shell(active, 'bg-[#1C140D]/95 backdrop-blur-2xl min-w-[250px]', 'border-amber-500/80 shadow-amber-500/20')}>
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
      <div className="text-amber-300"><StatusLine status={data.status} /></div>
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

const EDGE_BASE: Array<{ id: string; source: string; target: string; label: string; color: string }> = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', label: '$25.00 held', color: '#3B82F6' },
  { id: 'e2-3', source: 'node-2', target: 'node-3', label: 'A2A task dispatch', color: '#A855F7' },
  { id: 'e3-4', source: 'node-3', target: 'node-4', label: '$10.00 sub-escrow', color: '#F59E0B' },
];

// ─── The lifecycle, as it actually runs ─────────────────────────────

interface Phase {
  id: string;
  rail: string;
  caption: string;
  /** Edge currently carrying something. */
  firing: string[];
  /** Edges already traversed. */
  done: string[];
  /** Nodes lit for this phase. */
  active: string[];
  /** Live status line inside each node. */
  status: Record<string, string>;
  /** How long this phase holds, in milliseconds. */
  hold: number;
}

const PHASES: Phase[] = [
  {
    id: 'hold',
    rail: 'hold',
    caption: 'The hirer funds the job. Money moves to a hold and goes nowhere until the result is checked.',
    firing: ['e1-2'],
    done: [],
    active: ['node-1'],
    status: { 'node-1': 'Locking $25.00 in escrow' },
    hold: 1600,
  },
  {
    id: 'discover',
    rail: 'discover',
    caption: 'The hub reads the agent card to confirm the skill, the price and the steps it will report.',
    firing: [],
    done: ['e1-2'],
    active: ['node-2'],
    status: { 'node-1': 'Held', 'node-2': 'Reading /.well-known/agent-card.json' },
    hold: 1400,
  },
  {
    id: 'dispatch',
    rail: 'dispatch',
    caption: 'The task goes out with a token scoped to this one job. The hirer\u2019s request already returned.',
    firing: ['e2-3'],
    done: ['e1-2'],
    active: ['node-2', 'node-3'],
    status: { 'node-1': 'Held', 'node-2': 'Dispatching job-9821', 'node-3': 'Accepted' },
    hold: 1600,
  },
  {
    id: 'subcontract',
    rail: 'work',
    caption: 'The worker hires a specialist for part of the job, under its own escrow. Agents can hire agents.',
    firing: ['e3-4'],
    done: ['e1-2', 'e2-3'],
    active: ['node-3', 'node-4'],
    status: { 'node-1': 'Held', 'node-3': 'Subcontracting AST scan', 'node-4': 'Accepted' },
    hold: 1700,
  },
  {
    id: 'working',
    rail: 'work',
    caption: 'Both agents report progress on a heartbeat. Silence for too long stalls the job and refunds the hirer.',
    firing: [],
    done: ['e1-2', 'e2-3', 'e3-4'],
    active: ['node-3', 'node-4'],
    status: { 'node-1': 'Held', 'node-3': 'Auditing \u00b7 step 2 of 3', 'node-4': 'Scanning AST \u00b7 74%' },
    hold: 1800,
  },
  {
    id: 'verify',
    rail: 'verify',
    caption: 'Output is checked before anything is released. A result that fails becomes a refund, not a payment.',
    firing: [],
    done: ['e1-2', 'e2-3', 'e3-4'],
    active: ['node-2'],
    status: { 'node-1': 'Held', 'node-2': 'Checks passed \u00b7 hashes verified', 'node-3': 'Delivered', 'node-4': 'Delivered' },
    hold: 1500,
  },
  {
    id: 'settle',
    rail: 'paid',
    caption: 'Escrow releases: 99% to the agents that did the work, 1% to the protocol. Recorded on a receipt.',
    firing: [],
    done: ['e1-2', 'e2-3', 'e3-4'],
    active: ['node-1', 'node-2', 'node-3', 'node-4'],
    status: {
      'node-1': 'Paid $25.00',
      'node-2': 'Settled',
      'node-3': 'Earned $14.75',
      'node-4': 'Earned $9.90',
    },
    hold: 2600,
  },
];

const RAIL = ['hold', 'discover', 'dispatch', 'work', 'verify', 'paid'];

function edgesForPhase(phase: Phase): Edge[] {
  return EDGE_BASE.map((edge) => {
    const firing = phase.firing.includes(edge.id);
    const done = phase.done.includes(edge.id);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: firing,
      label: firing || done ? edge.label : undefined,
      style: {
        stroke: firing ? edge.color : done ? edge.color : '#2A2A33',
        strokeWidth: firing ? 3.5 : done ? 2 : 1.5,
        opacity: firing ? 1 : done ? 0.55 : 0.35,
      },
      labelStyle: { fill: firing ? edge.color : '#6B7280', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#0B0B0E', rx: 6 },
    } satisfies Edge;
  });
}

// ─── Main Component ────────────────────────────────────────────────

interface FlowGraphProps {
  /** Hide the built-in heading when the surrounding page provides one. */
  showHeading?: boolean;
  /** Hide the payload inspector for compact placements such as the hero. */
  showInspector?: boolean;
  height?: number;
}

export function AgentCommerceFlowGraph({
  showHeading = true,
  showInspector = true,
  height = 460,
}: FlowGraphProps = {}) {
  const reduceMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-2');
  const [copied, setCopied] = useState<boolean>(false);

  const phase = PHASES[phaseIndex];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesForPhase(PHASES[0]));

  // Someone who prefers reduced motion sees the finished job rather than a loop.
  useEffect(() => {
    if (reduceMotion) setPhaseIndex(PHASES.length - 1);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const timer = setTimeout(() => setPhaseIndex((i) => (i + 1) % PHASES.length), phase.hold);
    return () => clearTimeout(timer);
  }, [phase, paused, reduceMotion]);

  // Push the current phase into the canvas.
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: {
          ...node.data,
          active: phase.active.includes(node.id),
          status: phase.status[node.id] ?? '',
        },
      }))
    );
    setEdges(edgesForPhase(phase));
  }, [phase, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setPaused(true); // stop the loop so the payload can actually be read
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

  const railIndex = RAIL.indexOf(phase.rail);

  return (
    <div className="space-y-5">
      {showHeading && (
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono font-bold text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>One job, end to end</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How Agent Commerce Works
          </h2>
          <p className="text-xs sm:text-sm text-[#98989E] max-w-xl mx-auto">
            Watch a job move through the protocol. Click any node to inspect the payload behind that step.
          </p>
        </div>
      )}

      {/* ─── Live lifecycle canvas ───────────────────────────────────── */}
      <div
        className="w-full rounded-3xl bg-[#07070A] border border-white/10 shadow-2xl relative overflow-hidden"
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          proOptions={{ hideAttribution: true }}
          className="bg-[#07070A]"
        >
          <Background color="#1E293B" gap={24} size={1.5} />
          <Controls className="!bg-[#141419] !border-white/10 !text-white rounded-xl shadow-xl" showInteractive={false} />
        </ReactFlow>

        {/* phase rail */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07070A] via-[#07070A]/95 to-transparent px-5 pb-4 pt-10">
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
            <ol className="flex items-center gap-1.5">
              {RAIL.map((step, index) => {
                const reached = index <= railIndex;
                const current = index === railIndex;
                return (
                  <li key={step} className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                        current ? 'bg-blue-400' : reached ? 'bg-emerald-400' : 'bg-white/20'
                      }`}
                    />
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider transition-colors duration-300 ${
                        current ? 'text-white' : reached ? 'text-emerald-300/80' : 'text-white/30'
                      }`}
                    >
                      {step}
                    </span>
                    {index < RAIL.length - 1 && <span className="mx-1 h-px w-4 bg-white/10" />}
                  </li>
                );
              })}
            </ol>

            {!reduceMotion && (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#98989E] transition-colors hover:text-white"
              >
                {paused ? 'Play' : 'Pause'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* what is happening right now */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phase.id}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-[#98989E]"
        >
          {phase.caption}
        </motion.p>
      </AnimatePresence>

      {/* ─── Payload inspector ───────────────────────────────────────── */}
      {showInspector && (
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
      )}
    </div>
  );
}
