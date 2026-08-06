'use client';

import React, { useEffect, useState } from 'react';
import { Radio, DollarSign, Cpu, CheckCircle2 } from 'lucide-react';

export interface FeedEvent {
  id: string;
  type: 'agent_registered' | 'job_created' | 'job_status_updated' | 'job_verified' | 'connected';
  title: string;
  subtitle: string;
  timestamp: string;
  badgeColor: string;
}

export function LiveActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([
    {
      id: 'init-1',
      type: 'agent_registered',
      title: 'Agent #1 Registered',
      subtitle: 'CodeReviewAgent · $25.00 USDC',
      timestamp: 'Just now',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      id: 'init-2',
      type: 'job_created',
      title: 'USDC Escrow Locked',
      subtitle: 'Base L2 Contract · ACPEscrow.sol',
      timestamp: '1 min ago',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
  ]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        socket = new WebSocket('ws://localhost:3001/ws/events');

        socket.onopen = () => {
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

            let newEv: FeedEvent | null = null;

            if (parsed.type === 'agent_registered') {
              newEv = {
                id: eventId,
                type: 'agent_registered',
                title: `Agent #${parsed.data.id || ''} Registered`,
                subtitle: `${parsed.data.agent_card?.name || 'A2A Worker'} · $${parsed.data.pricing_amount || '25.00'} USDC`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              };
            } else if (parsed.type === 'job_created') {
              newEv = {
                id: eventId,
                type: 'job_created',
                title: `Escrow Locked ($${parsed.data.pricing_amount || '25.00'} USDC)`,
                subtitle: `Job ${parsed.data.id || ''} · Base L2 Contract`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              };
            } else if (parsed.type === 'job_verified') {
              newEv = {
                id: eventId,
                type: 'job_verified',
                title: 'CI Proof Verified — Payout Released',
                subtitle: `Escrow released to worker wallet on-chain`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              };
            }

            if (newEv) {
              setEvents((prev) => [newEv!, ...prev.slice(0, 7)]);
            }
          } catch {
            // Ignore parse errors
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          reconnectTimer = setTimeout(connectWs, 5000);
        };

        socket.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connectWs();

    return () => {
      if (socket) socket.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return (
    <div className="rounded-2xl bg-[#121214] border border-[#2C2C2E] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            Live Protocol WebSocket Stream
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {isConnected ? 'WS Connected (3001)' : 'Polling Fallback'}
        </span>
      </div>

      <div className="space-y-2">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[#18181A] border border-[#2C2C2E]/60 text-xs hover:border-[#3C3C3E] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {ev.type === 'agent_registered' ? (
                <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
              ) : ev.type === 'job_created' ? (
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-semibold text-white">{ev.title}</p>
                <p className="text-[11px] text-[#98989E] font-mono">{ev.subtitle}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#636366] shrink-0">{ev.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
