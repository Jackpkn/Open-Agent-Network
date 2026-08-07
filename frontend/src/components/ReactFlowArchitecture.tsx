'use client';

import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Shield, Cpu, Lock, Server, Zap, ExternalLink } from 'lucide-react';

const initialNodes: Node[] = [
  {
    id: 'hirer',
    position: { x: 50, y: 120 },
    data: { label: 'Hirer Web Portal\n(Port 3005)' },
    style: {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#60A5FA',
      border: '1px solid rgba(59, 130, 246, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      fontWeight: '600',
      fontSize: '13px',
      boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
    },
  },
  {
    id: 'hub',
    position: { x: 320, y: 120 },
    data: { label: 'Fastify Protocol Hub\n(Port 3001)' },
    style: {
      background: 'rgba(168, 85, 247, 0.15)',
      color: '#C084FC',
      border: '1px solid rgba(168, 85, 247, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      fontWeight: '600',
      fontSize: '13px',
      boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
    },
  },
  {
    id: 'escrow',
    position: { x: 320, y: 320 },
    data: { label: 'ACPEscrow.sol\n(Base L2 Sepolia)' },
    style: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#34D399',
      border: '1px solid rgba(16, 185, 129, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      fontWeight: '600',
      fontSize: '13px',
      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
    },
  },
  {
    id: 'auditor',
    position: { x: 600, y: 50 },
    data: { label: 'Code Auditor Agent\n(Port 8001)' },
    style: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#FBBF24',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      fontWeight: '600',
      fontSize: '13px',
      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)',
    },
  },
  {
    id: 'security',
    position: { x: 600, y: 220 },
    data: { label: 'SecurityScanner Agent\n(Port 8003)' },
    style: {
      background: 'rgba(244, 63, 94, 0.15)',
      color: '#FB7185',
      border: '1px solid rgba(244, 63, 94, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      fontWeight: '600',
      fontSize: '13px',
      boxShadow: '0 8px 32px rgba(244, 63, 94, 0.15)',
    },
  },
  {
    id: 'docwriter',
    position: { x: 600, y: 390 },
    data: { label: 'DocWriter Agent\n(Port 8004)' },
    style: {
      background: 'rgba(14, 165, 233, 0.15)',
      color: '#38BDF8',
      border: '1px solid rgba(14, 165, 233, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      fontWeight: '600',
      fontSize: '13px',
      boxShadow: '0 8px 32px rgba(14, 165, 233, 0.15)',
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'hirer', target: 'hub', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 }, label: 'SSE Stream & Tasks' },
  { id: 'e2', source: 'hub', target: 'escrow', animated: true, style: { stroke: '#10B981', strokeWidth: 2.5 }, label: 'Multi-Token Lock' },
  { id: 'e3', source: 'hub', target: 'auditor', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 }, label: 'A2A JSON-RPC' },
  { id: 'e4', source: 'auditor', target: 'security', animated: true, style: { stroke: '#F43F5E', strokeWidth: 2 }, label: 'Subcontracting DAG' },
  { id: 'e5', source: 'auditor', target: 'docwriter', animated: true, style: { stroke: '#0EA5E9', strokeWidth: 2 }, label: 'Subcontracting DAG' },
];

export function ReactFlowArchitecture() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
            Powered by <code className="text-emerald-400">@xyflow/react</code>. Drag, zoom, connect, and inspect live agent nodes and animated data beams.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>React Flow Active</span>
          </span>
        </div>
      </div>

      {/* React Flow Container */}
      <div className="h-[550px] w-full rounded-2xl border border-[#2C2C2E] bg-[#121214] overflow-hidden relative shadow-2xl">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-[#121214]"
        >
          <Controls className="bg-[#1C1C1E] border border-[#2C2C2E] text-white rounded-lg p-1" />
          <MiniMap
            nodeColor="#3B82F6"
            maskColor="rgba(18, 18, 20, 0.8)"
            className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg"
          />
          <Background color="#2C2C2E" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>
    </div>
  );
}
