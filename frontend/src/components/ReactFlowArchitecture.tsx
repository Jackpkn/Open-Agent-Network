'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Node,
  Edge,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Shield, Cpu, Lock, Server, Zap, ExternalLink, CheckCircle } from 'lucide-react';

// ─── Custom Edge Component with Pixel-Perfect Pill Overlay ────────────
function CustomPillEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-3.5 py-1 rounded-full bg-[#18181A] border border-[#3E3E42] text-[11px] font-mono font-semibold text-white shadow-xl flex items-center justify-center whitespace-nowrap z-10"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ─── Custom Node 1: Hirer Node ──────────────────────────────────────
function HirerNodeCustom({ data }: any) {
  return (
    <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-400 shadow-xl min-w-[200px]">
      <Handle type="source" position={Position.Right} id="right" className="!bg-blue-400 !w-3 !h-3" />
      <div className="flex items-center space-x-2 border-b border-blue-500/20 pb-2 mb-2">
        <Cpu className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-xs text-white">Hirer Web Portal</span>
      </div>
      <p className="text-[11px] text-blue-300 font-mono">http://localhost:3005</p>
      <p className="text-[10px] text-[#98989E] mt-1">Dispatches tasks & streams SSE tokens</p>
    </div>
  );
}

// ─── Custom Node 2: Protocol Hub Node ───────────────────────────────
function HubNodeCustom({ data }: any) {
  return (
    <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-400 shadow-xl min-w-[220px]">
      <Handle type="target" position={Position.Left} id="left" className="!bg-purple-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-purple-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-purple-400 !w-3 !h-3" />
      <div className="flex items-center space-x-2 border-b border-purple-500/20 pb-2 mb-2">
        <Server className="w-4 h-4 text-purple-400" />
        <span className="font-semibold text-xs text-white">Fastify Protocol Hub</span>
      </div>
      <p className="text-[11px] text-purple-300 font-mono">http://localhost:3001</p>
      <p className="text-[10px] text-[#98989E] mt-1">Auto-Discovery & Event Broadcasts</p>
    </div>
  );
}

// ─── Custom Node 3: Escrow Smart Contract Node ──────────────────────
function EscrowNodeCustom({ data }: any) {
  return (
    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 shadow-xl min-w-[220px]">
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-400 !w-3 !h-3" />
      <div className="flex items-center space-x-2 border-b border-emerald-500/20 pb-2 mb-2">
        <Lock className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold text-xs text-white">ACPEscrow.sol</span>
      </div>
      <p className="text-[11px] text-emerald-300 font-mono">Base Sepolia L2</p>
      <p className="text-[10px] text-[#98989E] mt-1">USDC / USDT / WETH / DEGEN Escrow</p>
    </div>
  );
}

// ─── Custom Node 4: Agent Worker Node ────────────────────────────────
function AgentNodeCustom({ data }: any) {
  return (
    <div className={`p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-400 shadow-xl min-w-[220px]`}>
      <Handle type="target" position={Position.Left} id="left" className="!bg-amber-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-amber-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-amber-400 !w-3 !h-3" />
      <div className="flex items-center space-x-2 border-b border-amber-500/20 pb-2 mb-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="font-semibold text-xs text-white">{data.name}</span>
      </div>
      <p className="text-[11px] text-amber-300 font-mono">PORT {data.port}</p>
      <p className="text-[10px] text-[#98989E] mt-1">{data.role}</p>
    </div>
  );
}

const initialNodes: Node[] = [
  { id: 'hirer', type: 'hirer', position: { x: 20, y: 140 }, data: {} },
  { id: 'hub', type: 'hub', position: { x: 420, y: 140 }, data: {} },
  { id: 'escrow', type: 'escrow', position: { x: 420, y: 380 }, data: {} },
  { id: 'auditor', type: 'agent', position: { x: 820, y: 20 }, data: { name: 'Code Auditor Agent', port: '8001', role: 'Primary A2A Worker' } },
  { id: 'security', type: 'agent', position: { x: 820, y: 200 }, data: { name: 'SecurityScanner Agent', port: '8003', role: 'Subcontracting DAG Sub-worker' } },
  { id: 'docwriter', type: 'agent', position: { x: 820, y: 380 }, data: { name: 'DocWriter Agent', port: '8004', role: 'Subcontracting DAG Sub-worker' } },
];

const initialEdges: Edge[] = [
  {
    id: 'e1',
    type: 'customPill',
    source: 'hirer',
    sourceHandle: 'right',
    target: 'hub',
    targetHandle: 'left',
    animated: true,
    style: { stroke: '#3B82F6', strokeWidth: 2.5 },
    label: 'SSE Stream & Tasks',
  },
  {
    id: 'e2',
    type: 'customPill',
    source: 'hub',
    sourceHandle: 'bottom',
    target: 'escrow',
    targetHandle: 'top',
    animated: true,
    style: { stroke: '#10B981', strokeWidth: 2.5 },
    label: 'Multi-Token Lock',
  },
  {
    id: 'e3',
    type: 'customPill',
    source: 'hub',
    sourceHandle: 'right',
    target: 'auditor',
    targetHandle: 'left',
    animated: true,
    style: { stroke: '#F59E0B', strokeWidth: 2.5 },
    label: 'A2A JSON-RPC',
  },
  {
    id: 'e4',
    type: 'customPill',
    source: 'auditor',
    sourceHandle: 'bottom',
    target: 'security',
    targetHandle: 'top',
    animated: true,
    style: { stroke: '#F43F5E', strokeWidth: 2.5 },
    label: 'Subcontracting DAG',
  },
  {
    id: 'e5',
    type: 'customPill',
    source: 'security',
    sourceHandle: 'bottom',
    target: 'docwriter',
    targetHandle: 'top',
    animated: true,
    style: { stroke: '#0EA5E9', strokeWidth: 2.5 },
    label: 'Subcontracting DAG',
  },
];

export function ReactFlowArchitecture({ pointerEventsNone = true }: { pointerEventsNone?: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(
    () => ({
      hirer: HirerNodeCustom,
      hub: HubNodeCustom,
      escrow: EscrowNodeCustom,
      agent: AgentNodeCustom,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      customPill: CustomPillEdge,
    }),
    []
  );

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E]">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white">React Flow 12 Interactive Canvas</h2>
          </div>
          <p className="text-xs text-[#98989E] mt-1">
            Powered by <code className="text-emerald-400">@xyflow/react</code> with EdgeLabelRenderer & Live Data Beams.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>React Flow Active</span>
          </span>
        </div>
      </div>

      {/* React Flow Frameless Canvas */}
      <div className={`h-[600px] w-full rounded-2xl bg-[#121212] overflow-hidden relative ${pointerEventsNone ? 'pointer-events-none' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          zoomOnScroll={false}
          panOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnDrag={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          className="bg-[#121212]"
        />
      </div>
    </div>
  );
}
