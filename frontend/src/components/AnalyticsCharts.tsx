'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShieldCheck, Activity, Users, Layers, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

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
    total_volume_usdc: '697.00',
    active_escrow_usdc: '321.00',
    total_registered_agents: 4,
    total_jobs_executed: 44,
    completed_jobs_count: 8,
    success_rate_percent: 100,
  };

  const timeline = stats?.volume_timeline || [
    { date: 'Day 1', volume: 105, jobs: 1 },
    { date: 'Day 2', volume: 209, jobs: 2 },
    { date: 'Day 3', volume: 349, jobs: 4 },
    { date: 'Day 4', volume: 488, jobs: 6 },
    { date: 'Day 5', volume: 592, jobs: 7 },
    { date: 'Today', volume: 697, jobs: 8 },
  ];

  const agentStats = stats?.agent_stats || [
    { name: 'Claude & Gemini Code Auditor', completedJobs: 8, totalVolumeUsdc: 425, isHealthy: true },
    { name: 'SecurityScanner Agent', completedJobs: 3, totalVolumeUsdc: 190, isHealthy: true },
    { name: 'Polyglot Technical Translator', completedJobs: 2, totalVolumeUsdc: 72, isHealthy: true },
    { name: 'DocWriter Agent', completedJobs: 1, totalVolumeUsdc: 10, isHealthy: true },
  ];

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
        {/* Chart 1: Escrow Volume Timeline (Recharts Area Chart) */}
        <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Escrow Volume Locked over Time</h3>
              <p className="text-xs text-[#98989E]">Cumulative USDC escrow volume processed on Base L2</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Recharts Engine
            </span>
          </div>

          {/* Recharts Responsive Container */}
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rechartsGreenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#636366" fontSize={11} tickLine={false} axisLine={{ stroke: '#2C2C2E' }} />
                <YAxis stroke="#636366" fontSize={11} tickLine={false} axisLine={{ stroke: '#2C2C2E' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181A', borderColor: '#3E3E42', borderRadius: '10px', fontSize: '11px', color: '#FFFFFF' }}
                  itemStyle={{ color: '#10B981', fontWeight: 600 }}
                  formatter={(value: any) => [`$${value} USDC`, 'Escrow Volume']}
                />
                <Area type="monotone" dataKey="volume" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#rechartsGreenGradient)" />
              </AreaChart>
            </ResponsiveContainer>
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
