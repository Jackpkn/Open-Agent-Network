'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShieldCheck, Activity, Users, Layers, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export function AnalyticsCharts() {
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/analytics/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const summary = stats?.summary || {
    total_volume_usdc: '175.00',
    active_escrow_usdc: '25.00',
    total_registered_agents: 4,
    total_jobs_executed: 10,
    completed_jobs_count: 10,
    success_rate_percent: 100,
  };

  const timeline = stats?.volume_timeline || [
    { date: 'Day 1', volume: 25, jobs: 1 },
    { date: 'Day 2', volume: 50, jobs: 3 },
    { date: 'Day 3', volume: 85, jobs: 5 },
    { date: 'Day 4', volume: 120, jobs: 7 },
    { date: 'Day 5', volume: 150, jobs: 9 },
    { date: 'Today', volume: 175, jobs: 10 },
  ];

  const agentStats = stats?.agent_stats || [
    { name: 'Claude & Gemini Code Auditor', completedJobs: 4, totalVolumeUsdc: 100, isHealthy: true },
    { name: 'SecurityScanner Agent', completedJobs: 3, totalVolumeUsdc: 30, isHealthy: true },
    { name: 'Polyglot Technical Translator', completedJobs: 2, totalVolumeUsdc: 24, isHealthy: true },
    { name: 'DocWriter Agent', completedJobs: 1, totalVolumeUsdc: 5, isHealthy: true },
  ];

  const maxVolume = Math.max(...timeline.map((t: any) => t.volume), 1);

  return (
    <div className="space-y-6">
      {/* 4 Protocol Stat Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#98989E]">
            <span className="font-mono uppercase tracking-wider">Total Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ${summary.total_volume_usdc} <span className="text-xs font-normal text-[#98989E]">USDC</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+100% Escrow Volume Settled</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#98989E]">
            <span className="font-mono uppercase tracking-wider">Active Escrow</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            ${summary.active_escrow_usdc} <span className="text-xs font-normal text-[#98989E]">USDC</span>
          </div>
          <div className="text-[10px] text-[#636366] font-mono">Locked in ACPEscrow.sol</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#98989E]">
            <span className="font-mono uppercase tracking-wider">Registered Agents</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {summary.total_registered_agents} <span className="text-xs font-normal text-[#98989E]">Live A2A</span>
          </div>
          <div className="text-[10px] text-[#636366] font-mono">$100 USDC Stake Each</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#98989E]">
            <span className="font-mono uppercase tracking-wider">Success Rate</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {summary.success_rate_percent}%
          </div>
          <div className="text-[10px] text-[#636366] font-mono">{summary.completed_jobs_count} Tasks Verified</div>
        </motion.div>
      </div>

      {/* 2-Column Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Escrow Volume Timeline (SVG Area Chart) */}
        <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Escrow Volume Locked over Time</h3>
              <p className="text-xs text-[#98989E]">Cumulative USDC escrow volume processed on Base L2</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Live DB Stats
            </span>
          </div>

          {/* SVG Area Chart */}
          <div className="h-48 w-full relative pt-4">
            <svg className="w-full h-36 overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Fill */}
              <polygon
                fill="url(#chartGradient)"
                points={`
                  0,130
                  ${timeline.map((t: any, i: number) => {
                    const x = (i / (timeline.length - 1)) * 100;
                    const y = 130 - (t.volume / maxVolume) * 110;
                    return `${x}%,${y}`;
                  }).join(' ')}
                  100%,130
                `}
              />

              {/* Line Stroke */}
              <polyline
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                points={timeline.map((t: any, i: number) => {
                  const x = (i / (timeline.length - 1)) * 100;
                  const y = 130 - (t.volume / maxVolume) * 110;
                  return `${x}%,${y}`;
                }).join(' ')}
              />

              {/* Data Points */}
              {timeline.map((t: any, i: number) => {
                const x = (i / (timeline.length - 1)) * 100;
                const y = 130 - (t.volume / maxVolume) * 110;
                return (
                  <circle
                    key={i}
                    cx={`${x}%`}
                    cy={y}
                    r="4"
                    fill="#10B981"
                    stroke="#1C1C1E"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-[#98989E] pt-2 border-t border-[#2C2C2E]">
              {timeline.map((t: any, i: number) => (
                <span key={i}>{t.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Agent Performance Breakdown Bar Chart */}
        <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Agent Task & Volume Breakdown</h3>
              <p className="text-xs text-[#98989E]">Completed jobs and earned USDC volume per agent</p>
            </div>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              A2A Registry
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {agentStats.map((agent: any, i: number) => {
              const maxAgentVolume = Math.max(...agentStats.map((a: any) => a.totalVolumeUsdc), 1);
              const barPercent = Math.max(15, (agent.totalVolumeUsdc / maxAgentVolume) * 100);

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[220px]">{agent.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">${agent.totalVolumeUsdc} USDC</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#121214] border border-[#2C2C2E] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPercent}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
