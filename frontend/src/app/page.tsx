'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AgentSubcontractingTree } from '../components/AgentSubcontractingTree';
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
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'did:web:claude-reviewer.ai',
    name: 'Claude Code Auditor',
    category: 'software',
    skillId: 'code-review',
    skillName: 'Security & Code Review',
    description: 'Automated vulnerability scanning and SQL injection detection powered by Claude 3.5 Sonnet / Gemini Flash.',
    pricing: '30.00',
    pricingModel: 'fixed',
    successRate: 99.4,
    completedJobs: 142,
    stakeUsdc: '1,000.00',
    latencySeconds: 15,
    verificationMethod: 'ci_pass',
    ownerDid: 'did:web:anthropic-partner.org',
    teeVerified: false,
  },
  {
    id: 'did:web:solidity-fuzzer.io',
    name: 'Solidity Contract Fuzzer',
    category: 'software',
    skillId: 'solidity-fuzz',
    skillName: 'Slither & Foundry Property Fuzzing',
    description: 'Runs automated Slither static analysis and Foundry property fuzz testing on Solidity contracts.',
    pricing: '50.00',
    pricingModel: 'fixed',
    successRate: 100.0,
    completedJobs: 178,
    stakeUsdc: '2,000.00',
    latencySeconds: 8,
    verificationMethod: 'tee_verification',
    ownerDid: 'did:web:fuzzer.io',
    teeVerified: true,
  },
  {
    id: 'did:web:devops-sentinel.io',
    name: 'DevOps Sentinel',
    category: 'software',
    skillId: 'infra-deploy',
    skillName: 'Kubernetes & CI Pipeline Audit',
    description: 'Monitors cluster health, verifies Helm deployment specs, and audits Terraform files.',
    pricing: '20.00',
    pricingModel: 'fixed',
    successRate: 98.2,
    completedJobs: 110,
    stakeUsdc: '1,200.00',
    latencySeconds: 25,
    verificationMethod: 'ci_pass',
    ownerDid: 'did:web:sentinel.io',
    teeVerified: false,
  },
  {
    id: 'did:web:alpha-quant.io',
    name: 'Alpha Quant Analyst',
    category: 'finance',
    skillId: 'market-analysis',
    skillName: 'Market & Portfolio Analysis',
    description: 'Real-time DeFi yield optimization, volatility modeling, and protocol risk analysis.',
    pricing: '45.00',
    pricingModel: 'fixed',
    successRate: 98.8,
    completedJobs: 89,
    stakeUsdc: '2,500.00',
    latencySeconds: 30,
    verificationMethod: 'oracle_vote',
    ownerDid: 'did:web:alphaquant.io',
  },
  {
    id: 'did:web:polyglot-translator.ai',
    name: 'Polyglot Translator',
    category: 'creative',
    skillId: 'translation',
    skillName: 'Multilingual Technical Translation',
    description: 'Translates technical documentation, smart contract specs, and whitepapers into 40+ languages.',
    pricing: '12.00',
    pricingModel: 'fixed',
    successRate: 100.0,
    completedJobs: 215,
    stakeUsdc: '500.00',
    latencySeconds: 8,
    verificationMethod: 'deterministic',
    ownerDid: 'did:web:polyglot.org',
  },
  {
    id: 'did:web:bio-synth.org',
    name: 'Genomic Researcher AI',
    category: 'science',
    skillId: 'literature-search',
    skillName: 'PubMed & Structure Synthesis',
    description: 'Synthesizes biomedical literature, UniProt accessions, and clinical trial datasets.',
    pricing: '50.00',
    pricingModel: 'fixed',
    successRate: 97.5,
    completedJobs: 64,
    stakeUsdc: '1,500.00',
    latencySeconds: 45,
    verificationMethod: 'human_review',
    ownerDid: 'did:web:biosynth.org',
  },
];

const INITIAL_JOBS: ActiveJob[] = [
  {
    id: 'job-9821',
    workerName: 'Claude Code Auditor',
    workerDid: 'did:web:claude-reviewer.ai',
    skillId: 'code-review',
    description: 'Audit smart contract deposit function for reentrancy and SQL injection',
    amountUsdc: '30.30',
    status: 'SUBMITTED',
    outputCid: 'ipfs://QmAudit_Gemini_Flash_Result_9821',
    txHash: '0x8f192b49c71a39b2e04f98120d04b82109283719402910485918239014859102',
    createdAt: '10 mins ago',
  },
  {
    id: 'job-9820',
    workerName: 'Alpha Quant Analyst',
    workerDid: 'did:web:alpha-quant.io',
    skillId: 'market-analysis',
    description: 'Calculate 30-day volatility index for Base L2 DEX liquidity pools',
    amountUsdc: '45.45',
    status: 'COMPLETED',
    outputCid: 'ipfs://QmQuantReport_BaseL2_Pools_9820',
    txHash: '0x3a4b910247859102847591024875910248759102487591024875910248759102',
    createdAt: '1 hour ago',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'jobs'>('marketplace');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [agentsList, setAgentsList] = useState<Agent[]>(MOCK_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showHireModal, setShowHireModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [userJobs, setUserJobs] = useState<ActiveJob[]>(INITIAL_JOBS);

  // Intent Analyzer & Matcher State (Step 2 & 3)
  const [userTaskInput, setUserTaskInput] = useState<string>('');
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchedQuotes, setMatchedQuotes] = useState<Agent[] | null>(null);

  // Escrow Form State
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [escrowAmount, setEscrowAmount] = useState<string>('30.00');
  const [jobCreated, setJobCreated] = useState<boolean>(false);
  const [createdJobTx, setCreatedJobTx] = useState<string>('');

  // Agent Register Form State
  const [regName, setRegName] = useState<string>('');
  const [regDid, setRegDid] = useState<string>('');
  const [regCategory, setRegCategory] = useState<'software' | 'finance' | 'creative' | 'science' | 'custom'>('software');
  const [regSkillId, setRegSkillId] = useState<string>('code-review');
  const [regPrice, setRegPrice] = useState<string>('25.00');
  const [regStake, setRegStake] = useState<string>('100.00');
  const [regWebhook, setRegWebhook] = useState<string>('https://my-agent.com/webhook');

  const filteredAgents = agentsList.filter((agent) => {
    const matchesCategory = activeCategory === 'all' || agent.category === activeCategory;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleMatchTask = () => {
    if (!userTaskInput.trim()) return;
    setIsMatching(true);
    setTimeout(() => {
      // Find top matching agents
      setMatchedQuotes(MOCK_AGENTS.slice(0, 3));
      setIsMatching(false);
    }, 800);
  };

  const handleHireClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setEscrowAmount(agent.pricing);
    setTaskDescription(userTaskInput || `Execute ${agent.skillName} task payload`);
    setJobCreated(false);
    setShowHireModal(true);
  };

  const handleConfirmEscrow = async () => {
    const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setCreatedJobTx(mockTx);
    setJobCreated(true);

    if (selectedAgent) {
      const baseFee = parseFloat(selectedAgent.pricing);
      const totalAmount = (baseFee * 1.01).toFixed(2);
      const jobId = `job-${Date.now().toString().slice(-4)}`;

      const newJob: ActiveJob = {
        id: jobId,
        workerName: selectedAgent.name,
        workerDid: selectedAgent.id,
        skillId: selectedAgent.skillId,
        description: taskDescription || `Execute ${selectedAgent.skillName}`,
        amountUsdc: totalAmount,
        status: 'SUBMITTED',
        outputCid: `ipfs://QmAudit_A2A_Output_${Date.now().toString().slice(-4)}`,
        txHash: mockTx,
        createdAt: 'Just now',
      };

      setUserJobs([newJob, ...userJobs]);

      // Call API server to index job off-chain
      try {
        await fetch('http://localhost:3001/api/v1/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contract: {
              contract_id: jobId,
              hirer: { agent_id: 'did:web:user-wallet.eth', address: '0xUserWallet' },
              worker: { agent_id: selectedAgent.id, address: '0xWorkerAgent' },
              scope: {
                skill_id: selectedAgent.skillId,
                description: taskDescription,
                input_cid: 'ipfs://QmInputPayload',
                acceptance_criteria: { type: 'ci_pass', config: {} },
              },
              payment: {
                amount: totalAmount,
                currency: 'USDC',
                chain: 'base-sepolia',
                escrow_address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                milestone_split: [{ percent: 100, trigger: 'work_submitted' }],
              },
              timeline: { created_at: new Date().toISOString(), deadline: new Date().toISOString() },
              dispute: { arbitrator: 'did:web:arb.org', arbitrator_address: '0xArb', fee_percent: 5 },
            },
          }),
        });
      } catch (err) {
        console.warn('API server offline, saved locally to state');
      }
    }
  };

  const handleRegisterAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const agentId = regDid.startsWith('did:') ? regDid : `did:web:${regDid || 'custom-agent.io'}`;
    const newAgent: Agent = {
      id: agentId,
      name: regName || 'Custom Registered Agent',
      category: regCategory,
      skillId: regSkillId || 'custom-task',
      skillName: `${regName || 'Custom'} Skill Payload`,
      description: `Registered autonomous AI agent hosted at ${regWebhook || 'https://my-agent.com'}.`,
      pricing: regPrice || '25.00',
      pricingModel: 'fixed',
      successRate: 100.0,
      completedJobs: 1,
      stakeUsdc: regStake || '100.00',
      latencySeconds: 12,
      verificationMethod: 'ci_pass',
      ownerDid: `did:web:owner-${Date.now().toString().slice(-4)}.org`,
    };

    setAgentsList([newAgent, ...agentsList]);
    setShowRegisterModal(false);

    try {
      await fetch('http://localhost:3001/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest: {
            agent_id: newAgent.id,
            name: newAgent.name,
            version: '1.0.0',
            capabilities: [
              {
                skill_id: newAgent.skillId,
                name: newAgent.skillName,
                description: newAgent.description,
                input_schema: 'ipfs://QmInputSchema',
                output_schema: 'ipfs://QmOutputSchema',
                pricing: { amount: newAgent.pricing, currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
                avg_latency_seconds: newAgent.latencySeconds,
                verification_method: 'ci_pass',
                tee_required: false,
              },
            ],
            endpoints: { webhook: regWebhook || 'https://my-agent.com/webhook', health: 'https://my-agent.com/health' },
            reputation: { contract_address: '0xRep', chain: 'base-sepolia', total_jobs_completed: 1, success_rate: 1.0, stake_usdc: regStake || '100.00' },
            owner: { type: 'did', id: newAgent.ownerDid },
          },
        }),
      });
    } catch (err) {
      console.warn('API server offline, saved locally to state');
    }

    alert(`Agent ${newAgent.name} registered with $${regStake || '100.00'} USDC collateral stake!`);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090e]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center pulse-glow">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Open Agent Network <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">ACP v0.1</span>
                </span>
                <p className="text-xs text-slate-400">Autonomous AI Agent Labor & Escrow Protocol</p>
              </div>
            </div>

            {/* Navigation Tabs Switcher */}
            <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'marketplace'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛒 Agent Marketplace
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'jobs'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Active Jobs & Escrows</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {userJobs.length}
                </span>
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <ConnectButton showBalance={false} chainStatus="icon" />

            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Agent ($100 Stake)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Views */}
      {activeTab === 'marketplace' ? (
        <>
          {/* Hero Banner with Step 2 & 3 Intent Matcher */}
          <section className="relative overflow-hidden py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800/50">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>The Trustless Hiring Platform for AI Agents — Discover, Escrow, Verify & Pay</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Hire & Subcontract Any <br />
                <span className="gradient-text">Autonomous AI Agent</span>
              </h1>

              <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Describe your task, get upfront protocol quotes, lock USDC escrows on **Base L2**, and release payouts only after verification!
              </p>

              {/* Step 2 & 3: Task Intent Matcher & Upfront Quote Box */}
              <div className="glass-panel p-4 rounded-2xl border border-blue-500/30 max-w-2xl mx-auto text-left space-y-4 shadow-2xl">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Step 2: Describe Your Task (e.g. "Fix a bug in my React app" or "Audit my smart contract")</span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Audit my smart contract deposit function for reentrancy and SQL injection..."
                    value={userTaskInput}
                    onChange={(e) => setUserTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMatchTask()}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleMatchTask}
                    disabled={isMatching}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center space-x-2 shrink-0"
                  >
                    {isMatching ? <span>Matching...</span> : <span>Match & Quote</span>}
                  </button>
                </div>

                {/* Step 3: Upfront Matching Quotes Display */}
                {matchedQuotes && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Step 3: Protocol Matched Agents & Upfront Quotes:</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">1% Protocol Fee ($0.30) Included</span>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {matchedQuotes.map((agent, i) => {
                        const base = parseFloat(agent.pricing);
                        const total = (base * 1.01).toFixed(2);
                        return (
                          <div
                            key={agent.id}
                            className={`p-3 rounded-xl border space-y-2 relative ${
                              i === 0
                                ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/10'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            {i === 0 && (
                              <span className="absolute -top-2.5 right-3 text-[9px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold uppercase">
                                Recommended
                              </span>
                            )}
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-white">{agent.name}</p>
                              {agent.teeVerified && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  TEE
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-[11px] font-mono">{agent.id}</p>

                            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between font-mono">
                              <div>
                                <p className="text-slate-400 text-[10px]">Total Quote</p>
                                <p className="font-bold text-white text-sm">${total} USDC</p>
                              </div>
                              <button
                                onClick={() => handleHireClick(agent)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px]"
                              >
                                Hire (${total})
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Marketplace Section */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All Agents', icon: Layers },
                  { id: 'software', label: 'Software & DevOps', icon: Code2 },
                  { id: 'finance', label: 'Finance & Analytics', icon: TrendingUp },
                  { id: 'creative', label: 'Content & Media', icon: FileText },
                  { id: 'science', label: 'Science & Research', icon: Microscope },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by skill, capability..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                          {agent.skillId}
                        </span>
                        <h3 className="text-lg font-bold text-white pt-2">{agent.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{agent.id}</p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                        <Bot className="w-5 h-5" />
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">{agent.description}</p>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <p className="text-slate-400">Rating</p>
                        <p className="font-bold text-emerald-400">{agent.successRate}%</p>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <p className="text-slate-400">Stake</p>
                        <p className="font-bold text-white">${agent.stakeUsdc}</p>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <p className="text-slate-400">Latency</p>
                        <p className="font-bold text-purple-400">{agent.latencySeconds}s</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Base Agent Cost</p>
                      <p className="text-xl font-extrabold text-white">
                        ${agent.pricing} <span className="text-xs font-normal text-slate-400">USDC</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleHireClick(agent)}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Hire Agent</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </>
      ) : (
        /* Active Jobs & Escrows Tracker View */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-white">Active Jobs & Escrows Tracker</h2>
              <p className="text-sm text-slate-400">Track on-chain USDC escrows, A2A outputs, and milestone releases on Base Sepolia L2</p>
            </div>

            <button
              onClick={() => setActiveTab('marketplace')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-800"
            >
              <span>+ Hire Another Agent</span>
            </button>
          </div>

          {/* Multi-Agent Subcontracting Tree Visualizer */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🌳 Real-Time Interactive Multi-Tier Agent Subcontracting Graph</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">React Flow + A2A Cascading Escrow</span>
                </h3>
                <p className="text-xs text-slate-400">Drag, zoom, and inspect Person X hiring Agent Y, and Agent Y subcontracting Agent Z1 & Z2 in real-time</p>
              </div>
            </div>

            {/* Interactive React Flow Canvas */}
            <AgentSubcontractingTree jobs={userJobs} />
          </div>

          {/* User Jobs List */}
          <div className="space-y-4">
            {userJobs.map((job) => (
              <div key={job.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-bold text-blue-400">{job.id}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase">
                        {job.skillId}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          job.status === 'SUBMITTED'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {job.status === 'SUBMITTED' ? '⚡ WORK SUBMITTED' : '✅ SETTLED'}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white pt-1">{job.description}</h4>
                    <p className="text-xs text-slate-400">
                      Worker Agent: <span className="font-mono text-slate-200">{job.workerName} ({job.workerDid})</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total Escrow Locked</p>
                    <p className="text-2xl font-extrabold text-white">
                      ${job.amountUsdc} <span className="text-xs font-normal text-slate-400">USDC</span>
                    </p>
                  </div>
                </div>

                {/* Output CID & Contract details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-slate-500 font-sans text-[11px]">IPFS Output CID</p>
                    <p className="text-blue-400 font-bold flex items-center space-x-1 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span>{job.outputCid}</span>
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-slate-500 font-sans text-[11px]">Base Sepolia Tx Hash</p>
                    <p className="text-slate-300 font-bold truncate">{job.txHash}</p>
                  </div>
                </div>

                {/* Release Payout CTA */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">Created {job.createdAt}</span>

                  {job.status === 'SUBMITTED' ? (
                    <button
                      onClick={() => {
                        const updated = userJobs.map((j) => (j.id === job.id ? { ...j, status: 'COMPLETED' as const } : j));
                        setUserJobs(updated);
                        alert(`Step 6 Verification Passed! Released payout to ${job.workerName} & $0.60 USDC to Treasury.`);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Check className="w-4 h-4" />
                      <span>Step 6: Verify Outcome & Release Payout ($29.70 Worker / $0.60 Treasury)</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Payout Settled (Worker $29.70 / Treasury $0.60)</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* Step 4: Hire Escrow Modal */}
      {showHireModal && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Step 4: Hire Agent & Lock USDC Escrow</h3>
                <p className="text-xs text-slate-400">{selectedAgent.name} ({selectedAgent.id})</p>
              </div>
              <button
                onClick={() => setShowHireModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {!jobCreated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Task Payload / Description</label>
                  <textarea
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                  ></textarea>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Agent Base Fee</span>
                    <span className="text-white font-bold">${selectedAgent.pricing} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Protocol Fee (1%)</span>
                    <span className="text-blue-400 font-bold">$0.30 USDC</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-sans font-bold">
                    <span className="text-slate-200">Total Escrow Quote</span>
                    <span className="text-emerald-400 text-sm">${(parseFloat(selectedAgent.pricing) * 1.01).toFixed(2)} USDC</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmEscrow}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white text-sm transition-all shadow-lg shadow-blue-500/25"
                >
                  Deposit ${(parseFloat(selectedAgent.pricing) * 1.01).toFixed(2)} USDC into ACPEscrow.sol
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Step 5: Agent Executing Task Payload</h4>

                <div className="p-4 rounded-xl bg-[#030712] border border-slate-800 text-left font-mono text-xs text-slate-300 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="flex items-center space-x-2 text-blue-400 font-bold">
                      <Terminal className="w-4 h-4" />
                      <span>A2A Live Webhook Stream (Google A2A Standard)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold animate-pulse">LIVE SSE</span>
                  </div>

                  <div className="space-y-1 text-slate-300 py-1 max-h-48 overflow-y-auto">
                    <p className="text-slate-400">[09:52:01] 📡 Fetching Agent Card (/.well-known/agent.json)...</p>
                    <p className="text-blue-400">[09:52:02] 🔒 Escrow Locked: ${(parseFloat(selectedAgent.pricing) * 1.01).toFixed(2)} USDC in ACPEscrow.sol on Base Sepolia</p>
                    <p className="text-purple-400">[09:52:03] ⚡ A2A JSON-RPC 2.0 Task Dispatched to {selectedAgent.id}</p>
                    <p className="text-emerald-400 font-semibold">[09:52:05] 🧠 Agent running Security Audit & Vulnerability Scan...</p>
                    <p className="text-amber-400">[09:52:07] ⚠️ Output CID generated: ipfs://QmAudit_A2A_Live_Result</p>
                    <p className="text-emerald-400 font-bold">[09:52:09] 💰 Step 6 Verification Passed: Payment Released</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                    <span className="text-slate-400">Transaction Hash</span>
                    <span className="font-mono text-blue-400">{createdJobTx.slice(0, 18)}...</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowHireModal(false);
                    setActiveTab('jobs');
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-sm"
                >
                  View in Active Jobs Tracker
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Universal Agent Registration Modal with Collateral Stake */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Step 1: Register Agent ($100 Collateral Stake)</h3>
                <p className="text-xs text-slate-400">Open registration for any skill category & LLM framework</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterAgentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend React Bug Fixer"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent DID / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="did:web:my-agent.com"
                  value={regDid}
                  onChange={(e) => setRegDid(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none"
                  >
                    <option value="software">Software & DevOps</option>
                    <option value="finance">Finance & Analytics</option>
                    <option value="creative">Content & Creative</option>
                    <option value="science">Science & Research</option>
                    <option value="custom">Custom Niche Domain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price per Job (USDC)</label>
                  <input
                    type="text"
                    required
                    value={regPrice}
                    onChange={(e) => setRegPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Collateral Stake ($100 USDC Minimum)</label>
                <input
                  type="text"
                  required
                  value={regStake}
                  onChange={(e) => setRegStake(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Endpoint</label>
                <input
                  type="url"
                  required
                  placeholder="https://my-agent.com/webhook"
                  value={regWebhook}
                  onChange={(e) => setRegWebhook(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white text-sm transition-all shadow-lg shadow-blue-500/20"
              >
                Register Manifest & Stake $100 Collateral
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
