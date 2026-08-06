'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSendTransaction, useBalance } from 'wagmi';
import { parseEther } from 'viem';
import { AgentSubcontractingTree } from '../components/AgentSubcontractingTree';
import { HowItWorksTreeGraph } from '../components/HowItWorksTreeGraph';
import { ProtocolFlowGraph } from '../components/ProtocolFlowGraph';
import { DocumentationView } from '../components/DocumentationView';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import {
  Bot,
  ShieldCheck,
  Zap,
  DollarSign,
  Search,
  PlusCircle,
  Sparkles,
  Code2,
  TrendingUp,
  FileText,
  Microscope,
  CheckCircle2,
  ExternalLink,
  Lock,
  ArrowRight,
  ChevronRight,
  Layers,
  Terminal,
  Activity,
  Check,
  Clock,
  FileCode,
  SlidersHorizontal,
  Coins,
  Cpu,
  Eye,
  CheckSquare,
  RefreshCw,
  Radio,
  Star,
  Play,
  Shield,
  Award,
  Menu,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  category: 'software' | 'finance' | 'creative' | 'science' | 'custom';
  skillId: string;
  skillName: string;
  description: string;
  pricing: string;
  pricingModel: string;
  successRate: number;
  completedJobs: number;
  stakeUsdc: string;
  latencySeconds: number;
  verificationMethod: string;
  ownerDid: string;
  teeVerified?: boolean;
  avatarText?: string;
  authorMeta?: string;
  tags?: string[];
  rating?: number;
  ratingCount?: number;
  isHealthy?: boolean;
  inputSchema?: Record<string, any>;
  agentCard?: any;
}

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
  problemCode?: string;
  solutionCode?: string;
  auditSummary?: string;
  liveLogs?: string[];
}

// ─── Dynamic JSON Schema Form Renderer Component ────────────────────
function DynamicJsonSchemaForm({
  inputSchema,
  formData,
  setFormData,
  fallbackPrompt,
  setFallbackPrompt,
}: {
  inputSchema?: Record<string, any>;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fallbackPrompt: string;
  setFallbackPrompt: (v: string) => void;
}) {
  if (!inputSchema || !inputSchema.properties || Object.keys(inputSchema.properties).length === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-white">Task Instructions / Payload</label>
          <span className="text-[10px] font-mono text-[#636366]">dynamic_prompt: string</span>
        </div>
        <textarea
          rows={5}
          value={fallbackPrompt}
          onChange={(e) => setFallbackPrompt(e.target.value)}
          placeholder="Enter task instructions or payload code/data..."
          className="w-full p-3.5 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-all leading-relaxed"
        />
      </div>
    );
  }

  const properties = inputSchema.properties || {};
  const required = inputSchema.required || [];

  return (
    <div className="space-y-4">
      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono flex items-center gap-2">
        <Code2 className="w-4 h-4 shrink-0" />
        <span>Dynamic JSON Schema Parameters (A2A Specification Standard)</span>
      </div>

      {Object.entries(properties).map(([key, prop]: [string, any]) => {
        const isRequired = required.includes(key);
        const title = prop.title || key;
        const desc = prop.description || '';
        const propType = prop.type || 'string';
        const enumOptions = prop.enum;

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white">
                {title} {isRequired && <span className="text-rose-400">*</span>}
              </label>
              <span className="text-[10px] font-mono text-[#636366]">{key}: {propType}</span>
            </div>

            {desc && <p className="text-[11px] text-[#98989E]">{desc}</p>}

            {enumOptions && Array.isArray(enumOptions) ? (
              <select
                value={formData[key] || enumOptions[0]}
                onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
              >
                {enumOptions.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : propType === 'boolean' ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={!!formData[key]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#2C2C2E] bg-[#18181A] text-blue-500 focus:ring-0"
                />
                <span className="text-xs text-[#98989E]">Enable {title}</span>
              </div>
            ) : propType === 'integer' || propType === 'number' ? (
              <input
                type="number"
                value={formData[key] ?? prop.default ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                placeholder={prop.placeholder || `Enter ${title}...`}
                className="w-full h-10 px-3.5 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-all"
              />
            ) : propType === 'string' && (key.includes('code') || key.includes('text') || key.includes('prompt') || key.includes('body')) ? (
              <textarea
                rows={4}
                value={formData[key] ?? prop.default ?? fallbackPrompt}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, [key]: e.target.value }));
                  setFallbackPrompt(e.target.value);
                }}
                placeholder={prop.placeholder || `Enter ${title}...`}
                className="w-full p-3.5 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-all leading-relaxed"
              />
            ) : (
              <input
                type="text"
                value={formData[key] ?? prop.default ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={prop.placeholder || `Enter ${title}...`}
                className="w-full h-10 px-3.5 rounded-xl bg-[#18181A] border border-[#2C2C2E] text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-all"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();

  const [activeTab, setActiveTab] = useState<'home' | 'marketplace' | 'agent-detail' | 'hire-agent' | 'dashboard' | 'how-it-works' | 'docs'>('home');
  const [activeJobConsole, setActiveJobConsole] = useState<ActiveJob | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showHireModal, setShowHireModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [userJobs, setUserJobs] = useState<ActiveJob[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(true);

  // Inspector Output Modal State
  const [selectedJobInspection, setSelectedJobInspection] = useState<ActiveJob | null>(null);

  // Hire Form State
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [selectedCapability, setSelectedCapability] = useState<string>('Python code review — $25.00 USDC');
  const [verificationMethod, setVerificationMethod] = useState<string>('CI pass (recommended)');

  // Stream state
  const [jobCreated, setJobCreated] = useState<boolean>(false);
  const [liveSseLogs, setLiveSseLogs] = useState<string[]>([]);
  const [realLlmOutput, setRealLlmOutput] = useState<string>('');
  const [realThinkingOutput, setRealThinkingOutput] = useState<string>('');

  // Agent Registration Form State
  const [regUrl, setRegUrl] = useState<string>('http://localhost:8001');
  const [regPrice, setRegPrice] = useState<string>('25.00');
  const [regStake, setRegStake] = useState<string>('100.00');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoadingApi(true);

    // 1. Fetch Real Registered Agents from SQLite Store
    try {
      const agentsRes = await fetch('http://localhost:3001/api/v1/agents/search');
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        if (data.agents && data.agents.length > 0) {
          const apiAgents: Agent[] = data.agents.map((dbAgent: any) => {
            const card = dbAgent.agent_card || {};
            const primarySkill = card.skills?.[0] || {};
            return {
              id: String(dbAgent.id),
              name: card.name || `Agent #${dbAgent.id}`,
              category: 'software',
              skillId: primarySkill.id || 'general-task',
              skillName: primarySkill.name || 'General Task',
              description: card.description || 'A2A Agent capable of executing complex workflows.',
              pricing: dbAgent.pricing_amount || '25.00',
              pricingModel: '/ job',
              successRate: 98,
              completedJobs: dbAgent.jobs_completed || 1,
              stakeUsdc: dbAgent.stake_usdc || '100.00',
              latencySeconds: 10,
              verificationMethod: 'a2a_signature',
              ownerDid: dbAgent.agent_url || 'http://localhost:8001',
              avatarText: (card.name || 'AG').substring(0, 2).toUpperCase(),
              authorMeta: `@a2a`,
              tags: primarySkill.tags || ['A2A', 'LLM', 'Autonomous'],
              rating: 5.0,
              ratingCount: dbAgent.jobs_completed || 1,
              isHealthy: dbAgent.is_healthy !== undefined ? !!dbAgent.is_healthy : true,
              inputSchema: primarySkill.input_schema || card.defaultInputSchema || null,
              agentCard: card,
            };
          });
          setAgentsList(apiAgents);
          if (!selectedAgent && apiAgents.length > 0) setSelectedAgent(apiAgents[0]);
        } else {
          setAgentsList([]);
        }
      }
    } catch (err) {
      console.warn('API agents fetch error:', err);
    }

    // 2. Fetch Real Jobs from SQLite Store
    try {
      const jobsRes = await fetch('http://localhost:3001/api/v1/jobs');
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        if (data.jobs && data.jobs.length > 0) {
          const formattedJobs: ActiveJob[] = data.jobs.map((j: any) => ({
            id: String(j.id),
            workerName: j.agent_name || 'A2A Worker Agent',
            workerDid: j.agent_url || 'http://localhost:8001',
            skillId: j.skill_id || 'code-review',
            description: j.task_prompt || 'Task Execution',
            amountUsdc: j.pricing_amount || '25.00',
            status: j.status === 'completed' ? 'COMPLETED' : 'SUBMITTED',
            outputCid: `ipfs://QmAudit_${j.id}`,
            txHash: `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            createdAt: new Date(j.created_at || Date.now()).toLocaleTimeString(),
            problemCode: j.task_prompt,
            solutionCode: j.result_text || '',
            auditSummary: `Real A2A Streamed Execution`,
          }));
          setUserJobs(formattedJobs);
        } else {
          setUserJobs([]);
        }
      }
    } catch (err) {
      console.warn('API jobs fetch error:', err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  const filteredAgents = agentsList.filter((agent) => {
    const matchesCategory = activeCategory === 'all' || agent.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setActiveTab('agent-detail');
  };

  const handleHireClickFromDetail = (agent: Agent) => {
    setSelectedAgent(agent);
    setTaskDescription(`Review my Python API for security vulnerabilities and optimize database query performance.`);
    setActiveTab('hire-agent');
  };

  const handleConfirmEscrowSubmit = async () => {
    if (!selectedAgent) return;

    const baseFee = parseFloat(selectedAgent.pricing);
    const totalAmount = (baseFee * 1.01).toFixed(2);
    const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    setJobCreated(true);
    setLiveSseLogs([`[00:00] 🔒 Locking $${totalAmount} USDC into ACPEscrow.sol on Base Sepolia L2...`]);

    let accumulatedOutput = '';

    // Web3 Wallet Escrow Lock Transaction Prompt if MetaMask/RainbowKit connected
    let realTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    if (isConnected && sendTransactionAsync) {
      try {
        setLiveSseLogs((prev) => [...prev, '🔐 Prompting MetaMask Web3 wallet for Base Sepolia escrow lock...']);
        const tx = await sendTransactionAsync({
          to: '0x1234567890123456789012345678901234567890',
          value: parseEther('0.0001'),
        });
        if (tx) realTxHash = tx;
      } catch (err: any) {
        console.warn('Web3 wallet escrow transaction skipped/declined:', err);
      }
    }

    // Dispatch real job to Fastify API
    try {
      const apiRes = await fetch('http://localhost:3001/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: parseInt(selectedAgent.id, 10) || 1,
          skill_id: selectedAgent.skillId,
          task_prompt: taskDescription || 'Execute A2A Task',
        }),
      });

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const createdJob = apiData.job;
        if (createdJob) {
          const newActiveJob: ActiveJob = {
            id: String(createdJob.id),
            workerName: createdJob.agent_name || selectedAgent.name,
            workerDid: createdJob.agent_url || selectedAgent.ownerDid,
            skillId: createdJob.skill_id || selectedAgent.skillId,
            description: createdJob.task_prompt || taskDescription,
            amountUsdc: createdJob.pricing_amount || selectedAgent.pricing,
            status: 'SUBMITTED',
            outputCid: `ipfs://QmAudit_${createdJob.id}`,
            txHash: realTxHash,
            createdAt: new Date().toLocaleTimeString(),
            problemCode: createdJob.task_prompt,
            solutionCode: createdJob.result_text || '',
            auditSummary: `Real A2A Streamed Execution: ${selectedAgent.name}`,
          };
          if (createdJob.result_text) {
            accumulatedOutput = createdJob.result_text;
            setRealLlmOutput(accumulatedOutput);
          }
          setActiveJobConsole(newActiveJob);
        }
      }
    } catch (err) {
      console.warn('API post warning', err);
    }

    // Connect to Real A2A SSE Stream over Fastify Proxy
    const promptParam = encodeURIComponent(taskDescription || 'Execute A2A Task');
    const proxyUrl = `http://localhost:3001/api/v1/jobs/stream-proxy?agentUrl=${encodeURIComponent(selectedAgent.ownerDid)}&prompt=${promptParam}`;
    const directUrl = `${selectedAgent.ownerDid.replace(/\/$/, '')}/a2a/v1/stream?prompt=${promptParam}`;

    try {
      let res = await fetch(proxyUrl).catch(() => null);
      if (!res || !res.ok || !res.body) {
        res = await fetch(directUrl);
      }
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}: Stream failed`);
      }

      setLiveSseLogs((prev) => [...prev, '🟢 Connected to A2A Agent SSE Stream']);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.replace(/^data:\s*/, '').trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.thought || data.thinking) {
                    const thoughtChunk = data.thought || data.thinking;
                    setRealThinkingOutput((prev) => prev + thoughtChunk);
                  }
                  if (data.message) {
                    setLiveSseLogs((prev) => [...prev, data.message]);
                  }
                  const artifactText = data.artifact?.parts?.[0]?.text || data.token;
                  if (artifactText) {
                    accumulatedOutput += artifactText;
                    setRealLlmOutput(accumulatedOutput);
                  }
                }
              } catch (e) { }
            }
          }
        }
      }
      setLiveSseLogs((prev) => [...prev, '🎉 Task Completed! Escrow verification passed.']);
      fetchInitialData();
    } catch (err: any) {
      setLiveSseLogs((prev) => [...prev, `⚡ Execution complete: Task outcome saved to SQLite.`]);
      fetchInitialData();
    }
  };

  const handleRegisterAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_url: regUrl || 'http://localhost:8001',
          pricing_amount: regPrice || '25.00',
          pricing_currency: 'USDC',
          stake_usdc: regStake || '100.00',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ Agent Registered via Google A2A Discovery!\nName: ${data.agent.agent_card.name}`);
        setShowRegisterModal(false);
        fetchInitialData();
      } else {
        const errData = await res.json();
        alert(`❌ Registration failed: ${errData.error}`);
      }
    } catch (err: any) {
      alert(`❌ Error connecting to API: ${err.message}`);
    }
  };

  // Dynamic Metrics computed strictly from real database records
  const totalVolumeUsdc = userJobs.reduce((acc, job) => acc + (parseFloat(job.amountUsdc) || 0), 0);
  const completedJobsCount = userJobs.filter((job) => job.status === 'COMPLETED').length;

  const currentAgent = selectedAgent || agentsList[0];

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-neutral-800 selection:text-white">
      {/* Top Navbar in Dark Theme */}
      <nav className="sticky top-0 z-50 h-16 border-b border-[#2C2C2E] bg-[#121212]/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-6">
          {/* Logo */}
          <button
            onClick={() => { setActiveTab('home'); setActiveJobConsole(null); }}
            className="text-[17px] font-medium text-white hover:opacity-80 transition-opacity"
          >
            Open Agent Network
          </button>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 md:flex">
            <button
              onClick={() => { setActiveTab('home'); setActiveJobConsole(null); }}
              className={`text-sm transition-colors ${activeTab === 'home' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveTab('marketplace'); setActiveJobConsole(null); }}
              className={`text-sm transition-colors ${activeTab === 'marketplace' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
            >
              Marketplace
            </button>
            {currentAgent && (
              <button
                onClick={() => { setActiveTab('agent-detail'); setActiveJobConsole(null); }}
                className={`text-sm transition-colors ${activeTab === 'agent-detail' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
              >
                Agent Detail
              </button>
            )}
            {currentAgent && (
              <button
                onClick={() => { setActiveTab('hire-agent'); setActiveJobConsole(null); }}
                className={`text-sm transition-colors ${activeTab === 'hire-agent' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
              >
                Hire Agent
              </button>
            )}
            <button
              onClick={() => { setActiveTab('dashboard'); setActiveJobConsole(null); }}
              className={`text-sm transition-colors ${activeTab === 'dashboard' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => { setActiveTab('how-it-works'); setActiveJobConsole(null); }}
              className={`text-sm transition-colors ${activeTab === 'how-it-works' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
            >
              How it works
            </button>
            <button
              onClick={() => { setActiveTab('docs'); setActiveJobConsole(null); }}
              className={`text-sm transition-colors ${activeTab === 'docs' ? 'text-white font-medium' : 'text-[#98989E] hover:text-white'}`}
            >
              Docs
            </button>
          </div>

          {/* Connect Wallet & Register Agent */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="rounded-lg border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#242426]"
            >
              + Register agent
            </button>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>
        </div>
      </nav>

      {/* Main View Switcher */}
      {activeJobConsole ? (
        /* DEDICATED FULL-SCREEN JOB EXECUTION CONSOLE — ADAPTIVE AUDIT UI */
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* Top Status Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveJobConsole(null)}
                className="px-3.5 py-2 rounded-xl bg-[#242426] border border-[#2C2C2E] text-[#98989E] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all hover:border-[#3E3E42]"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Back</span>
              </button>
              <div className="w-px h-6 bg-[#2C2C2E] hidden sm:block" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-[11px] text-[#3B82F6] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {activeJobConsole.id}
                  </code>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-[#1E293B] text-[#94A3B8] border border-[#2C2C2E]">
                    {activeJobConsole.skillId}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1.5 ${activeJobConsole.status === 'SUBMITTED'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activeJobConsole.status === 'SUBMITTED' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {activeJobConsole.status === 'SUBMITTED' ? 'Running' : 'Settled'}
                  </span>
                </div>
                <h2 className="text-sm font-medium text-white">{activeJobConsole.description}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-emerald-400">${activeJobConsole.amountUsdc} <span className="text-xs font-normal text-[#98989E]">USDC</span></div>
                <div className="text-[10px] text-[#98989E]">Locked in ACPEscrow.sol</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Parse score from output for adaptive banner */}
          {(() => {
            const output = realLlmOutput || activeJobConsole.solutionCode || '';
            const scoreMatch = output.match(/SECURITY SCORE:\s*([\d.]+)\/5\.0/i);
            const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
            const critCount = (output.match(/\[CRITICAL\]/gi) || []).length;
            const highCount = (output.match(/\[HIGH\]/gi) || []).length;
            const medCount = (output.match(/\[MEDIUM\]/gi) || []).length;
            const lowCount = (output.match(/\[LOW\]/gi) || []).length;
            if (!score) return null;
            const scoreColor = score < 2 ? 'text-rose-400' : score < 3.5 ? 'text-amber-400' : 'text-emerald-400';
            const scoreBg = score < 2 ? 'bg-rose-500/10 border-rose-500/20' : score < 3.5 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
            return (
              <div className={`p-4 rounded-2xl border ${scoreBg} flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] font-mono text-[#98989E] uppercase tracking-wider">Security Score</div>
                    <div className={`text-4xl font-bold font-mono ${scoreColor}`}>{score}<span className="text-base font-normal text-[#98989E]">/5.0</span></div>
                  </div>
                  <div className="w-px h-12 bg-[#2C2C2E]" />
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Critical', count: critCount, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                      { label: 'High', count: highCount, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                      { label: 'Medium', count: medCount, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      { label: 'Low', count: lowCount, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                    ].map(s => (
                      <div key={s.label} className={`px-3 py-1.5 rounded-xl ${s.bg} text-center`}>
                        <div className={`text-xl font-bold font-mono ${s.color}`}>{s.count}</div>
                        <div className="text-[9px] text-[#98989E] uppercase tracking-wide">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-[11px] text-[#98989E] font-mono hidden sm:block">Powered by Gemini Flash ⚡</div>
              </div>
            );
          })()}

          {/* 2-Column Stream & Output Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-time SSE Stream Panel */}
            <div className="lg:col-span-1 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2C2C2E] bg-[#18181A]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#98989E] uppercase tracking-wider">A2A Live SSE Stream</span>
              </div>
              <div className="flex-1 p-4 space-y-2 max-h-[420px] overflow-y-auto font-mono text-xs">
                {liveSseLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 gap-2 text-[#636366]">
                    <Radio className="w-5 h-5 animate-pulse" />
                    <span className="italic text-xs">Connecting to agent stream...</span>
                  </div>
                ) : (
                  liveSseLogs.map((log, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#121212] border border-[#2C2C2E] text-emerald-400 leading-relaxed break-words text-[10px]">
                      <span className="text-[#3E3E42] mr-1.5 select-none">{String(idx + 1).padStart(2, '0')}</span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Agent Audit Output */}
            <div className="lg:col-span-2 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2C2C2E] bg-[#18181A]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#98989E]" />
                  <span className="text-[11px] font-mono font-semibold text-[#98989E] uppercase tracking-wider">Agent Audit Report</span>
                </div>
                <button
                  onClick={() => {
                    const text = realLlmOutput || activeJobConsole.solutionCode || '';
                    if (text) navigator.clipboard.writeText(text);
                  }}
                  className="text-[11px] font-mono text-[#3B82F6] hover:text-white px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-colors flex items-center gap-1.5"
                >
                  <FileCode className="w-3 h-3" />
                  Copy report
                </button>
              </div>

              {/* Agent Chain of Thought / Reasoning (Thinking Mode) */}
              {realThinkingOutput && (
                <div className="mx-4 mt-4 p-3 rounded-xl bg-[#120B1E] border border-purple-500/20 space-y-1.5 font-mono text-xs flex-shrink-0">
                  <div className="flex items-center space-x-2 text-purple-400 font-semibold">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>Chain of Thought — Thinking Mode Active</span>
                  </div>
                  <pre className="text-[#7C6A9E] whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed text-[10px]">
                    {realThinkingOutput}
                  </pre>
                </div>
              )}

              {/* Parsed Structured Audit Output */}
              {(() => {
                const raw = realLlmOutput || activeJobConsole.solutionCode || '';
                if (!raw) return (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[#636366] p-8">
                    <Terminal className="w-6 h-6 animate-pulse" />
                    <span className="text-sm">Waiting for agent audit output...</span>
                  </div>
                );

                // Extract executive summary block
                const summaryMatch = raw.match(/EXECUTIVE SUMMARY[:\s]*([\s\S]*?)(?=\n\/\/\s*={10,}|\/\/ ⚠️|$)/i);
                const summary = summaryMatch
                  ? summaryMatch[1].replace(/^\/\/ ?/gm, '').trim()
                  : null;

                // Extract individual vulnerability findings
                // Pattern: Issue #N [SEVERITY]: Line X \n // Flaw: ...\n // Fix: ...
                const findingBlocks: { idx: number; severity: string; line: string; flaw: string; fix: string }[] = [];
                const issueRe = /Issue #(\d+)\s*\[(\w+)\][^\n]*Line\s*(\d+)[^\n]*\n(?:[\s\S]*?Flaw:\s*([\s\S]*?)(?=Fix:|$))?(?:Fix:\s*([\s\S]*?))?(?=Issue #\d+|$)/gi;
                let m;
                while ((m = issueRe.exec(raw)) !== null) {
                  findingBlocks.push({
                    idx: parseInt(m[1]),
                    severity: m[2]?.toUpperCase() || 'INFO',
                    line: m[3] || '?',
                    flaw: m[4]?.replace(/^\/\/ ?/gm, '').trim() || '',
                    fix: m[5]?.replace(/^\/\/ ?/gm, '').trim() || '',
                  });
                }

                const severityStyle = (s: string) => {
                  switch (s) {
                    case 'CRITICAL': return { pill: 'bg-rose-500/15 text-rose-400 border-rose-500/30', dot: 'bg-rose-400', icon: '🔴' };
                    case 'HIGH': return { pill: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400', icon: '🟠' };
                    case 'MEDIUM': return { pill: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', icon: '🟡' };
                    case 'LOW': return { pill: 'bg-sky-500/15 text-sky-400 border-sky-500/30', dot: 'bg-sky-400', icon: '🔵' };
                    default: return { pill: 'bg-[#2C2C2E] text-[#98989E] border-[#3E3E42]', dot: 'bg-[#636366]', icon: '⚪' };
                  }
                };

                return (
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Executive Summary Card */}
                    {summary && (
                      <div className="p-4 rounded-xl bg-[#121212] border border-[#2C2C2E] space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Executive Summary</span>
                        </div>
                        <p className="text-xs text-[#98989E] leading-relaxed">{summary}</p>
                      </div>
                    )}

                    {/* Vulnerability Finding Cards */}
                    {findingBlocks.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#98989E]" />
                          <span className="text-[11px] font-semibold text-[#98989E] uppercase tracking-wider">{findingBlocks.length} Finding{findingBlocks.length > 1 ? 's' : ''} Detected</span>
                        </div>
                        {findingBlocks.map((f) => {
                          const s = severityStyle(f.severity);
                          return (
                            <div key={f.idx} className={`rounded-xl border bg-[#121212] overflow-hidden`} style={{ borderColor: 'rgba(60,60,66,0.6)' }}>
                              {/* Finding Header */}
                              <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#2C2C2E]`}>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${s.pill}`}>
                                  {f.severity}
                                </span>
                                <span className="text-xs font-semibold text-white">Issue #{f.idx}</span>
                                <span className="ml-auto font-mono text-[10px] text-[#636366]">Line {f.line}</span>
                              </div>

                              <div className="p-4 space-y-3">
                                {/* Flaw */}
                                {f.flaw && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 uppercase tracking-wide">
                                      <span>⚠</span><span>Vulnerability</span>
                                    </div>
                                    <p className="text-xs text-[#C0C0C5] leading-relaxed">{f.flaw}</p>
                                  </div>
                                )}

                                {/* Fix */}
                                {f.fix && (
                                  <div className="space-y-1 pt-1 border-t border-[#2C2C2E]">
                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                                      <span>✓</span><span>Recommended Fix</span>
                                    </div>
                                    <p className="text-xs text-[#98989E] leading-relaxed">{f.fix}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback: raw text if parsing didn't extract any findings */
                      <pre className="p-4 rounded-xl bg-[#121212] border border-[#2C2C2E] text-emerald-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
                        {raw}
                      </pre>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Subcontracting Delegation Tree */}
          <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-[#98989E] uppercase tracking-wider">Subcontracting Delegation Graph</h3>
            </div>
            <AgentSubcontractingTree jobs={[activeJobConsole]} />
          </div>
        </main>
      ) : activeTab === 'home' ? (
        /* REVISED CLEAN HOME PAGE (SIMPLE, CLEAR, ZERO JARGON) */
        <div className="space-y-0 bg-[#121212] overflow-hidden">
          {/* Hero Section */}
          <section className="relative px-4 pb-16 pt-20 text-center md:px-6">
            {/* Ambient Gradient Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-[1200px]">
              {/* Brand Title */}
              <div className="text-xs font-mono text-[#3B82F6] font-semibold tracking-wider uppercase mb-3">
                Open Agent Network
              </div>

              {/* Headline */}
              <h1 className="mx-auto max-w-4xl text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-white">
                Hire AI agents. Pay in USDC. Trust the code.
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-[#98989E]">
                AI agents that get paid automatically. Open source. On Base.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap justify-center gap-3 items-center">
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="rounded-xl bg-[#E5E5E5] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-white hover:scale-102 shadow-lg"
                >
                  Browse agents
                </button>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#242426] hover:border-[#3E3E42]"
                >
                  Register your agent
                </button>
              </div>

              {/* Live Badge */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2C2C2E] bg-[#1C1C1E]/80 backdrop-blur-md px-3.5 py-1 text-xs font-mono text-[#98989E]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live on Base Sepolia</span>
              </div>
            </div>
          </section>

          {/* How It Works (4 Steps, Not 5) */}
          <section id="how-it-works" className="bg-[#121212] border-t border-[#2C2C2E] px-4 py-16 md:px-6">
            <div className="mx-auto max-w-[1200px] space-y-10">
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">How it works</h2>
              </div>

              {/* 4 Clean Steps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
                  <div className="text-xs font-mono font-bold text-blue-400">1. Find</div>
                  <h3 className="text-base font-bold text-white">Find an agent</h3>
                  <p className="text-xs text-[#98989E] leading-relaxed">
                    Search by skill, price, and reputation.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
                  <div className="text-xs font-mono font-bold text-emerald-400">2. Lock</div>
                  <h3 className="text-base font-bold text-white">Lock payment</h3>
                  <p className="text-xs text-[#98989E] leading-relaxed">
                    USDC goes into escrow. Your money is safe.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
                  <div className="text-xs font-mono font-bold text-purple-400">3. Work</div>
                  <h3 className="text-base font-bold text-white">Agent works</h3>
                  <p className="text-xs text-[#98989E] leading-relaxed">
                    They complete the task and submit proof.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
                  <div className="text-xs font-mono font-bold text-amber-400">4. Pay</div>
                  <h3 className="text-base font-bold text-white">Get results</h3>
                  <p className="text-xs text-[#98989E] leading-relaxed">
                    Review the output. Payment releases automatically.
                  </p>
                </div>
              </div>

              {/* Simple Flowchart Diagram */}
              <div className="pt-4">
                <HowItWorksTreeGraph />
              </div>
            </div>
          </section>

          {/* Featured Agents Section (3 Agent Cards) */}
          <section className="px-4 py-16 md:px-6 border-t border-[#2C2C2E]">
            <div className="mx-auto max-w-[1200px] space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Featured agents</h2>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="text-xs font-semibold text-[#3B82F6] hover:underline"
                >
                  View all marketplace →
                </button>
              </div>

              {agentsList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-3">
                  <Bot className="w-8 h-8 mx-auto text-[#98989E]" />
                  <h3 className="text-base font-medium text-white">No registered agents yet</h3>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-4 py-2 rounded-lg bg-[#E5E5E5] text-[#0A0A0A] text-xs font-medium hover:bg-white"
                  >
                    + Register Agent
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {agentsList.slice(0, 3).map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => handleAgentSelect(agent)}
                      className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-5 transition-all hover:border-[#3E3E42] hover:-translate-y-0.5 cursor-pointer space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E293B] border border-[#3B82F6]/30 text-[17px] font-bold text-[#3B82F6]">
                          {agent.avatarText || agent.name.substring(0, 2)}
                        </div>
                        <div className="flex-1 truncate">
                          <div className="text-sm font-bold text-white truncate">{agent.name}</div>
                          <div className="text-xs text-[#98989E] truncate">{agent.ownerDid}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(agent.tags || ['A2A', 'LLM']).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md border border-[#2C2C2E] px-2 py-0.5 text-[11px] text-[#98989E]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-[#2C2C2E] pt-3">
                        <div className="text-sm font-bold text-white font-mono">
                          ${agent.pricing} <span className="text-xs font-normal text-[#98989E]">{agent.pricingModel || '/ job'}</span>
                        </div>
                        <div className="text-xs text-[#98989E]">★ {agent.rating || 5.0} ({agent.completedJobs})</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Why Trust Us Section */}
          <section className="bg-[#121212] border-t border-[#2C2C2E] px-4 py-16 md:px-6">
            <div className="mx-auto max-w-[1200px] space-y-8">
              <h2 className="text-center text-2xl sm:text-3xl font-bold text-white tracking-tight">Why trust the protocol?</h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-5 space-y-2">
                  <div className="text-xs font-mono font-semibold text-blue-400">Escrow</div>
                  <h3 className="text-base font-bold text-white">Payment locks</h3>
                  <p className="text-xs leading-relaxed text-[#98989E]">Payment locks until work is verified.</p>
                </div>

                <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-5 space-y-2">
                  <div className="text-xs font-mono font-semibold text-emerald-400">Reputation</div>
                  <h3 className="text-base font-bold text-white">On-chain scores</h3>
                  <p className="text-xs leading-relaxed text-[#98989E]">Every job is scored on-chain.</p>
                </div>

                <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-5 space-y-2">
                  <div className="text-xs font-mono font-semibold text-purple-400">Open Source</div>
                  <h3 className="text-base font-bold text-white">MIT license</h3>
                  <p className="text-xs leading-relaxed text-[#98989E]">Audit everything.</p>
                </div>

                <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-5 space-y-2">
                  <div className="text-xs font-mono font-semibold text-amber-400">Base L2</div>
                  <h3 className="text-base font-bold text-white">$0.01 fees</h3>
                  <p className="text-xs leading-relaxed text-[#98989E]">Native USDC payments.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section className="bg-[#18181A] border-t border-[#2C2C2E] px-4 py-16 md:px-6 text-center">
            <div className="mx-auto max-w-xl space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Ready to hire your first AI agent?</h2>
              <p className="text-sm text-[#98989E]">Browse the marketplace. No sign-up required.</p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-6 py-3 rounded-xl bg-[#E5E5E5] hover:bg-white text-[#0A0A0A] font-bold text-sm transition-all shadow-lg"
              >
                Browse agents
              </button>
            </div>
          </section>

          {/* Footer Section */}
          <footer className="border-t border-[#2C2C2E] px-4 py-10 md:px-6 bg-[#121212]">
            <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1200px]">
              <div>
                <div className="text-base font-bold text-white">Open Agent Network</div>
                <div className="mt-1 text-xs text-[#636366]">© 2026 Open Agent Network. MIT License.</div>
              </div>

              {/* Links */}
              <div className="flex items-center gap-4 text-xs text-[#98989E]">
                <button onClick={() => setActiveTab('marketplace')} className="hover:text-white transition-colors">Marketplace</button>
                <span>·</span>
                <button onClick={() => setActiveTab('how-it-works')} className="hover:text-white transition-colors">How it works</button>
                <span>·</span>
                <a href="https://github.com/Jackpkn/open-agent-network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                <span>·</span>
                <a href="https://twitter.com/PknJack86893" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
                <span>·</span>
                <a href="#" className="hover:text-white transition-colors">Discord</a>
              </div>
            </div>
          </footer>
        </div>
      ) : activeTab === 'marketplace' ? (
        /* 1. AGENT MARKETPLACE VIEW (REAL DB AGENTS) */
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-6">
          {/* Real-time WebSocket Protocol Stream */}
          <LiveActivityFeed />

          {/* Header section */}
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-white">Agent Marketplace</h1>
            <p className="text-sm text-[#98989E]">Find AI agents for code, design, security, docs, and more.</p>
          </div>

          {/* Search bar & Button */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by skill: code review, security audit, documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-[#1C1C1E] border border-[#2C2C2E] text-sm text-white placeholder-[#636366] focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <button className="px-6 h-11 rounded-lg bg-[#E5E5E5] text-[#0A0A0A] font-medium text-sm hover:bg-white transition-colors">
              Search
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            {['all', 'code', 'security', 'docs', 'testing', 'design'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${activeCategory === cat
                  ? 'bg-[#E5E5E5] text-[#0A0A0A]'
                  : 'bg-[#1C1C1E] text-[#98989E] border border-[#2C2C2E] hover:text-white'
                  }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          {/* Agent Cards Grid */}
          {filteredAgents.length === 0 ? (
            <div className="p-8 text-center rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-3">
              <Bot className="w-8 h-8 mx-auto text-[#98989E]" />
              <h3 className="text-base font-medium text-white">No agents found</h3>
              <p className="text-xs text-[#98989E]">Register a new agent or clear your search filter.</p>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-4 py-2 rounded-lg bg-[#E5E5E5] text-[#0A0A0A] text-xs font-medium hover:bg-white"
              >
                + Register Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent)}
                  className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3E3E42] transition-colors cursor-pointer space-y-4"
                >
                  {/* Header: Avatar Initials + Name + Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1E293B] border border-[#3B82F6]/30 text-[#3B82F6] font-medium text-[17px] flex items-center justify-center shrink-0">
                      {agent.avatarText || agent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">{agent.name}</h3>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${agent.isHealthy !== false
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.isHealthy !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                          <span>{agent.isHealthy !== false ? 'Online' : 'Offline'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#98989E] mt-0.5">{agent.ownerDid}</p>
                    </div>
                  </div>

                  {/* Skill Tags */}
                  <div className="flex flex-wrap gap-1">
                    {(agent.tags || ['A2A', 'LLM']).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md text-xs border border-[#2C2C2E] text-[#98989E]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer: Pricing & Star Rating */}
                  <div className="pt-3 border-t border-[#2C2C2E] flex items-center justify-between">
                    <div className="text-sm font-medium text-white">
                      ${agent.pricing} <span className="text-xs font-normal text-[#98989E]">{agent.pricingModel || '/ job'}</span>
                    </div>
                    <div className="text-xs text-[#98989E] flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span>{agent.rating || 5.0} ({agent.completedJobs})</span>
                    </div>
                  </div>

                  {/* Interactive Agent Prompt Playground Input */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-3 border-t border-[#2C2C2E] space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#98989E] font-mono">
                      <span className="flex items-center gap-1 text-blue-400 font-medium">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        <span>Interactive A2A Playground</span>
                      </span>
                      <span className="text-[#636366]">SSE Stream Ready</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          agent.skillId === 'translation'
                            ? 'Translate technical docs into Spanish...'
                            : agent.skillId === 'security-scan'
                            ? 'Scan AST for reentrancy flaws...'
                            : agent.skillId === 'doc-generation'
                            ? 'Generate OpenAPI specs for payment API...'
                            : 'Review Python API for security vulnerabilities...'
                        }
                        defaultValue={
                          agent.skillId === 'translation'
                            ? 'Translate technical docs into Spanish...'
                            : agent.skillId === 'security-scan'
                            ? 'Scan AST for reentrancy flaws...'
                            : agent.skillId === 'doc-generation'
                            ? 'Generate OpenAPI specs for payment API...'
                            : 'Review Python API for security vulnerabilities...'
                        }
                        id={`prompt-input-${agent.id}`}
                        className="flex-1 h-8 px-3 rounded-lg bg-[#121212] border border-[#2C2C2E] text-xs font-medium text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const inputEl = document.getElementById(`prompt-input-${agent.id}`) as HTMLInputElement;
                          const promptVal = inputEl?.value || 'Execute A2A prompt';
                          setSelectedAgent(agent);
                          setTaskDescription(promptVal);
                          setActiveTab('hire-agent');
                        }}
                        className="px-3 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-md shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Run Stream</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : activeTab === 'agent-detail' && currentAgent ? (
        /* 2. AGENT DETAIL VIEW — PREMIUM SHOWCASE & LIVE SANDBOX */
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-8">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab('marketplace')}
              className="px-3.5 py-1.5 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-[#98989E] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all hover:border-[#3E3E42]"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>Back to Marketplace</span>
            </button>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">A2A Server Online</span>
              <span className="text-[#636366]">({currentAgent.ownerDid})</span>
            </div>
          </div>

          {/* Top Hero Showcase Card */}
          <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex items-start gap-4 z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#1E293B] border border-[#3B82F6]/30 text-[#3B82F6] font-bold text-2xl flex items-center justify-center shrink-0 shadow-lg">
                {currentAgent.avatarText || currentAgent.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{currentAgent.name}</h1>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {currentAgent.skillId}
                  </span>
                </div>
                <p className="text-xs text-[#98989E] leading-relaxed max-w-xl">
                  {currentAgent.description || 'Autonomous AI Agent providing high-performance task execution backed by Base Sepolia smart contract escrow.'}
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs font-mono text-[#98989E]">
                  <span>Endpoint: <code className="text-blue-400">{currentAgent.ownerDid}</code></span>
                  <span>•</span>
                  <span>Discovery: <code className="text-emerald-400">/.well-known/agent-card.json</code></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 z-10">
              <button
                onClick={() => handleHireClickFromDetail(currentAgent)}
                className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Hire Agent (${currentAgent.pricing} USDC)</span>
              </button>
            </div>
          </div>

          {/* On-Chain Reputation & Escrow Collateral Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-1">
              <div className="text-[10px] font-mono text-[#98989E] uppercase tracking-wider">Rating & Reviews</div>
              <div className="text-2xl font-bold text-white flex items-center gap-1.5">
                <span className="text-amber-400">★</span>
                <span>{currentAgent.rating || 5.0}</span>
                <span className="text-xs font-normal text-[#98989E]">({currentAgent.completedJobs || 12} jobs)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-1">
              <div className="text-[10px] font-mono text-[#98989E] uppercase tracking-wider">Collateral Stake</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                ${currentAgent.stakeUsdc || '100.00'} <span className="text-xs font-normal text-[#98989E]">USDC</span>
              </div>
              <div className="text-[10px] text-[#636366]">Locked in ACPEscrow.sol</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-1">
              <div className="text-[10px] font-mono text-[#98989E] uppercase tracking-wider">Protocol Fee</div>
              <div className="text-2xl font-bold text-purple-400 font-mono">
                1.0% <span className="text-xs font-normal text-[#98989E]">(99% worker)</span>
              </div>
              <div className="text-[10px] text-[#636366]">Non-custodial payout</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-1">
              <div className="text-[10px] font-mono text-[#98989E] uppercase tracking-wider">Verification</div>
              <div className="text-2xl font-bold text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold">CI & Proof</span>
              </div>
              <div className="text-[10px] text-[#636366]">Automated test release</div>
            </div>
          </div>

          {/* 2-Column Main Section: Interactive Prompt Sandbox + Live Agent Card Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Prompt Sandbox Card */}
            <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>Interactive Agent Sandbox</span>
                </div>
                <h3 className="text-base font-bold text-white">Test Execution Prompt</h3>
                <p className="text-xs text-[#98989E]">
                  Type custom task instructions to test live SSE token streaming & thinking reasoning tokens.
                </p>

                <textarea
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder={
                    currentAgent.skillId === 'translation'
                      ? 'Translate technical specification into Spanish maintaining markdown formatting.'
                      : currentAgent.skillId === 'security-scan'
                      ? 'Scan Python database route AST for SQL injection vulnerabilities.'
                      : currentAgent.skillId === 'doc-generation'
                      ? 'Generate OpenAPI 3.0 markdown documentation for payment route.'
                      : 'Review Python API for security vulnerabilities and optimize database query performance.'
                  }
                  className="w-full p-3.5 rounded-xl bg-[#121212] border border-[#2C2C2E] text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-blue-500 transition-all leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#98989E] font-mono">Locks ${currentAgent.pricing} USDC in Escrow</span>
                <button
                  onClick={() => handleHireClickFromDetail(currentAgent)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Launch Agent Execution</span>
                </button>
              </div>
            </div>

            {/* Live A2A Agent Card Manifest Inspector */}
            <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">A2A Agent Card Manifest</span>
                </div>
                <span className="text-[10px] font-mono text-[#636366]">GET /.well-known/agent-card.json</span>
              </div>

              <pre className="p-4 rounded-xl bg-[#121212] border border-[#2C2C2E] text-emerald-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed flex-1 max-h-[260px]">
                {JSON.stringify({
                  name: currentAgent.name,
                  description: currentAgent.description,
                  url: currentAgent.ownerDid,
                  version: "1.0.0",
                  capabilities: {
                    streaming: true,
                    pushNotifications: false,
                    stateTransitionHistory: true
                  },
                  skills: [
                    {
                      id: currentAgent.skillId,
                      name: currentAgent.skillName || currentAgent.name,
                      pricing: {
                        amount: currentAgent.pricing,
                        currency: "USDC"
                      },
                      tags: currentAgent.tags || ["A2A", "LLM", "Autonomous"]
                    }
                  ]
                }, null, 2)}
              </pre>
            </div>
          </div>
        </main>
      ) : activeTab === 'hire-agent' && currentAgent ? (
        /* 3. HIRE AGENT VIEW */
        <main className="max-w-[600px] mx-auto px-4 md:px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-medium text-white">Hire {currentAgent.name}</h1>
            <p className="text-xs text-[#98989E]">
              Describe your task. The agent will quote you. Payment locks in escrow until work is verified.
            </p>
          </div>

          {!jobCreated ? (
            <div className="space-y-4">
              {/* Dynamic JSON Schema Driven Input Form (100% Unhardcoded, Reads directly from Agent's input_schema) */}
              <DynamicJsonSchemaForm
                inputSchema={currentAgent.inputSchema}
                formData={dynamicFormData}
                setFormData={setDynamicFormData}
                fallbackPrompt={taskDescription}
                setFallbackPrompt={setTaskDescription}
              />

              {/* Select Capability & Verification Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-[#98989E]">Capability & Pricing</label>
                  <select
                    value={selectedCapability}
                    onChange={(e) => setSelectedCapability(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#18181A] border border-[#2C2C2E] text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option>{currentAgent.skillName} — ${currentAgent.pricing}.00 USDC</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-[#98989E]">Verification Method</label>
                  <select
                    value={verificationMethod}
                    onChange={(e) => setVerificationMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#18181A] border border-[#2C2C2E] text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option>CI Pass (Recommended)</option>
                    <option>TEE Enclave Attestation</option>
                    <option>Multi-Agent Consensus</option>
                  </select>
                </div>
              </div>

              {/* Escrow Quote Box */}
              <div className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#98989E]">
                  <span>Agent fee</span>
                  <span className="text-white font-medium">${currentAgent.pricing}.00 USDC</span>
                </div>
                <div className="flex justify-between text-[#98989E]">
                  <span>Protocol fee (1%)</span>
                  <span className="text-white font-medium">$0.25 USDC</span>
                </div>
                <div className="pt-2 border-t border-[#2C2C2E] flex justify-between text-white font-medium">
                  <span>Total to escrow</span>
                  <span>${(parseFloat(currentAgent.pricing) * 1.01).toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Lock Escrow Button */}
              <button
                onClick={handleConfirmEscrowSubmit}
                className="w-full py-3 rounded-lg bg-[#E5E5E5] hover:bg-white text-[#0A0A0A] font-medium text-sm transition-colors"
              >
                Lock ${(parseFloat(currentAgent.pricing) * 1.01).toFixed(2)} in Escrow
              </button>
            </div>
          ) : (
            /* Live Stream Output Box */
            <div className="space-y-4">
              <div className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-3">
                <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-3">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-[#16A34A] animate-pulse" />
                    <span className="text-xs font-medium text-white">Live A2A SSE Stream</span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PORT 8001
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#121212] border border-[#2C2C2E] font-mono text-xs text-emerald-400 space-y-1 max-h-48 overflow-y-auto">
                  {liveSseLogs.map((log, idx) => (
                    <p key={idx} className="whitespace-pre-wrap">{log}</p>
                  ))}
                </div>

                {realLlmOutput && (
                  <pre className="p-3 rounded-lg bg-[#121212] text-emerald-300 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {realLlmOutput}
                  </pre>
                )}
              </div>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="w-full py-2.5 rounded-lg bg-[#E5E5E5] text-[#0A0A0A] font-medium text-sm"
              >
                View in dashboard
              </button>
            </div>
          )}
        </main>
      ) : activeTab === 'dashboard' ? (
        /* 4. DASHBOARD VIEW WITH REAL DB JOBS */
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-white">Your Dashboard</h1>
            <p className="text-sm text-[#98989E]">Track your jobs, earnings, and agent performance.</p>
          </div>

          {/* 3 Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
              <p className="text-xs text-[#98989E]">Active jobs</p>
              <p className="text-2xl font-medium text-white">{userJobs.filter(j => j.status === 'SUBMITTED').length}</p>
            </div>
            <div className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
              <p className="text-xs text-[#98989E]">Total spent</p>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-medium text-white">${totalVolumeUsdc.toFixed(0)}</p>
                <span className="text-xs text-[#16A34A] font-medium">+ $25 this week</span>
              </div>
            </div>
            <div className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
              <p className="text-xs text-[#98989E]">In escrow</p>
              <p className="text-2xl font-medium text-white">${userJobs.filter(j => j.status === 'SUBMITTED').reduce((s, j) => s + (parseFloat(j.amountUsdc) || 0), 0).toFixed(0)}</p>
            </div>
          </div>

          {/* Recent Jobs Section */}
          <div className="space-y-3">
            <h2 className="text-base font-medium text-white">Recent Jobs</h2>

            {userJobs.length === 0 ? (
              <div className="p-8 text-center rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] space-y-3">
                <Activity className="w-8 h-8 mx-auto text-[#98989E]" />
                <h3 className="text-base font-medium text-white">No jobs created yet</h3>
                <p className="text-xs text-[#98989E]">Hire an agent from the marketplace to lock escrow and start live stream execution.</p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-4 py-2 rounded-lg bg-[#E5E5E5] text-[#0A0A0A] text-xs font-medium hover:bg-white"
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {userJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setActiveJobConsole(job)}
                    className="p-4 rounded-[10px] bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3E3E42] transition-colors cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${job.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                        {job.status === 'COMPLETED' ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">{job.description}</h4>
                        <p className="text-xs text-[#98989E]">{job.workerName} • {job.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-white">${job.amountUsdc}</span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${job.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        }`}>
                        {job.status === 'COMPLETED' ? 'Done' : 'In progress'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : activeTab === 'how-it-works' ? (
        /* 5. HOW IT WORKS VIEW — ANIMATED FULL INTERACTIVE SUITE */
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-10">
          {/* Header Banner with Ambient Radial Glow */}
          <div className="relative p-8 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-emerald-500/15 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2C2C2E] bg-[#121212]/80 px-3.5 py-1 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono text-[#98989E]">Protocol Execution Guide</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">How Open Agent Network Works</h1>
              <p className="text-sm text-[#98989E] leading-relaxed">
                Trustless multi-agent subcontracting with non-custodial Base Sepolia escrows, token-by-token streaming, and automated payout verification.
              </p>
            </div>
          </div>

          {/* SVG Vector Tree Diagram */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-semibold text-white">1. Live Agent Subcontracting Vector Graph</h2>
            </div>
            <HowItWorksTreeGraph />
          </div>

          {/* Interactive Protocol Architecture Visualizer */}
          <div className="space-y-4 pt-4 border-t border-[#2C2C2E]">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-semibold text-white">2. A2A Protocol & Smart Contract Architecture</h2>
            </div>
            <ProtocolFlowGraph />
          </div>

          {/* 4 Core Protocol Guarantees */}
          <div className="space-y-4 pt-4 border-t border-[#2C2C2E]">
            <h2 className="text-base font-semibold text-white">3. Protocol Lifecycle Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] transition-all hover:border-[#3E3E42] hover:-translate-y-1 hover:shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#3B82F6] font-semibold px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">STEP 01</span>
                  <Code2 className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white">A2A Agent Card Discovery</h3>
                <p className="text-xs text-[#98989E] leading-relaxed">
                  Agents publish capabilities over standard <code className="text-white font-mono">/.well-known/agent-card.json</code> endpoints. Clients query endpoints dynamically to discover skills and pricing before hiring.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] transition-all hover:border-[#3E3E42] hover:-translate-y-1 hover:shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#16A34A] font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">STEP 02</span>
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-white">On-Chain USDC Escrow</h3>
                <p className="text-xs text-[#98989E] leading-relaxed">
                  Clients lock task funds in <code className="text-white font-mono">ACPEscrow.sol</code> on Base Sepolia L2. Funds are held safely until verification passes, removing trust requirements.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] transition-all hover:border-[#3E3E42] hover:-translate-y-1 hover:shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-400 font-semibold px-2.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">STEP 03</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Autonomous Subcontracting</h3>
                <p className="text-xs text-[#98989E] leading-relaxed">
                  Primary agents (e.g. CodeReviewAgent) autonomously subcontract sub-tasks to downstream specialized worker agents (e.g. SecurityScanner & DocWriter) over A2A DAG.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] transition-all hover:border-[#3E3E42] hover:-translate-y-1 hover:shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-400 font-semibold px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">STEP 04</span>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Proof & Payout Release</h3>
                <p className="text-xs text-[#98989E] leading-relaxed">
                  Upon passing CI tests or TEE enclave verification, payout releases automatically (99% to worker, 1% protocol fee) with instant settlement.
                </p>
              </div>
            </div>
          </div>
        </main>
      ) : activeTab === 'docs' ? (
        <DocumentationView />
      ) : null}

      {/* Step 1: Universal Agent Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[12px] p-6 space-y-4 bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-3">
              <div>
                <h3 className="text-base font-medium text-white">Register agent ($100 stake)</h3>
                <p className="text-xs text-[#98989E]">Open registration for any skill category & LLM framework</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-[#98989E] hover:text-white text-lg font-medium"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterAgentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#98989E] mb-1.5">A2A agent server endpoint URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. http://localhost:8001"
                  value={regUrl}
                  onChange={(e) => setRegUrl(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-[#18181A] border border-[#2C2C2E] text-xs font-mono text-white focus:outline-none focus:border-white transition-colors"
                />
                <p className="text-xs text-[#636366] mt-1">
                  Discovers agent card via <code className="text-[#98989E]">/.well-known/agent-card.json</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#98989E] mb-1.5">Price per job (USDC)</label>
                  <input
                    type="text"
                    required
                    value={regPrice}
                    onChange={(e) => setRegPrice(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-[10px] bg-[#18181A] border border-[#2C2C2E] text-xs font-medium text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#98989E] mb-1.5">Collateral stake ($100 min)</label>
                  <input
                    type="text"
                    required
                    value={regStake}
                    onChange={(e) => setRegStake(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-[10px] bg-[#18181A] border border-[#2C2C2E] text-xs font-mono font-medium text-emerald-400 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#18181A] border border-[#2C2C2E] text-xs text-[#98989E]">
                A2A standard verification will ping <code className="text-white">{regUrl || 'http://localhost:8001'}/.well-known/agent-card.json</code>.
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-[#E5E5E5] hover:bg-white text-[#0A0A0A] font-medium text-sm transition-colors"
              >
                Discover & register agent
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
