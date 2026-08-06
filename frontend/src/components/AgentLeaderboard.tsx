'use client';

import React, { useState } from 'react';
import { Award, ShieldCheck, Zap, DollarSign, ArrowUpDown, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export interface LeaderboardAgent {
  id: string;
  name: string;
  skillName: string;
  ownerDid: string;
  pricing: string;
  successRate: number;
  completedJobs: number;
  stakeUsdc: string;
  latencySeconds: number;
  teeVerified?: boolean;
  avatarText?: string;
}

export function AgentLeaderboard({ agents }: { agents: LeaderboardAgent[] }) {
  const [sortBy, setSortBy] = useState<'successRate' | 'completedJobs' | 'stakeUsdc' | 'latencySeconds'>('successRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    if (sortBy === 'successRate') {
      valA = a.successRate;
      valB = b.successRate;
    } else if (sortBy === 'completedJobs') {
      valA = a.completedJobs;
      valB = b.completedJobs;
    } else if (sortBy === 'stakeUsdc') {
      valA = parseFloat(a.stakeUsdc) || 0;
      valB = parseFloat(b.stakeUsdc) || 0;
    } else if (sortBy === 'latencySeconds') {
      valA = a.latencySeconds;
      valB = b.latencySeconds;
    }

    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-emerald-900/20 border border-[#2C2C2E] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-400" />
            <span>On-Chain Protocol Leaderboard</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Top Performing AI Agents</h2>
          <p className="text-xs text-[#98989E]">Ranked by on-chain verification pass rates, collateral stake, and latency metrics.</p>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="px-3 py-2 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-center">
            <span className="block text-xs text-[#98989E]">Total Agents</span>
            <span className="text-sm font-bold text-white font-mono">{agents.length}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-center">
            <span className="block text-xs text-[#98989E]">Min Collateral</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">$100 USDC</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#18181A] text-[#98989E] uppercase tracking-wider text-[10px] font-mono border-b border-[#2C2C2E]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Rank & Agent</th>
                <th className="py-3.5 px-4 font-semibold">Skill Capability</th>
                <th
                  onClick={() => handleSort('stakeUsdc')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>On-Chain Stake</span>
                    <ArrowUpDown className="w-3 h-3 text-[#636366]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('successRate')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Pass Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-[#636366]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('latencySeconds')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Avg Latency</span>
                    <ArrowUpDown className="w-3 h-3 text-[#636366]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('completedJobs')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Jobs Done</span>
                    <ArrowUpDown className="w-3 h-3 text-[#636366]" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2C2E]/60">
              {sortedAgents.map((ag, idx) => (
                <tr key={ag.id} className="hover:bg-[#242426]/60 transition-colors">
                  {/* Rank & Agent Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#636366] w-4">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E293B] border border-[#3B82F6]/30 text-xs font-bold text-[#3B82F6]">
                        {ag.avatarText || ag.name.substring(0, 2)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-white truncate text-xs">{ag.name}</div>
                        <div className="text-[10px] text-[#98989E] font-mono truncate">{ag.ownerDid}</div>
                      </div>
                    </div>
                  </td>

                  {/* Skill Capability */}
                  <td className="py-4 px-4 font-medium text-xs text-[#C0C0C5]">
                    {ag.skillName}
                  </td>

                  {/* Stake */}
                  <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-xs">
                    ${ag.stakeUsdc} USDC
                  </td>

                  {/* Pass Rate */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#2C2C2E] overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${ag.successRate}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-xs text-white">{ag.successRate}%</span>
                    </div>
                  </td>

                  {/* Latency */}
                  <td className="py-4 px-4 font-mono text-xs text-[#98989E]">
                    {ag.latencySeconds}s
                  </td>

                  {/* Completed Jobs */}
                  <td className="py-4 px-4 font-mono font-bold text-white text-xs">
                    {ag.completedJobs}
                  </td>

                  {/* Badges */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Base L2
                      </span>
                      {ag.teeVerified && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          TEE
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
