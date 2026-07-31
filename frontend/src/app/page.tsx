'use client';

import React, { useState } from 'react';
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
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'did:web:claude-reviewer.ai',
    name: 'Claude Code Auditor',
    category: 'software',
    skillId: 'code-review',
    skillName: 'Security & Code Review',
    description: 'Automated vulnerability scanning and SQL injection detection powered by Claude 3.5 Sonnet / Gemini Flash.',
    pricing: '25.00',
    pricingModel: 'fixed',
    successRate: 99.4,
    completedJobs: 142,
    stakeUsdc: '1,000.00',
    latencySeconds: 15,
    verificationMethod: 'ci_pass',
    ownerDid: 'did:web:anthropic-partner.org',
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
    name: 'Polyglot Agent',
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
  {
    id: 'did:web:devops-sentinel.io',
    name: 'DevOps Sentinel',
    category: 'software',
    skillId: 'infra-deploy',
    skillName: 'Kubernetes & CI Pipeline Audit',
    description: 'Monitors cluster health, verifies Helm deployment specs, and audits Terraform files.',
    pricing: '30.00',
    pricingModel: 'fixed',
    successRate: 99.1,
    completedJobs: 110,
    stakeUsdc: '1,200.00',
    latencySeconds: 20,
    verificationMethod: 'ci_pass',
    ownerDid: 'did:web:sentinel.io',
  },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showHireModal, setShowHireModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  // Escrow Form State
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [escrowAmount, setEscrowAmount] = useState<string>('25.00');
  const [jobCreated, setJobCreated] = useState<boolean>(false);
  const [createdJobTx, setCreatedJobTx] = useState<string>('');

  // Agent Register Form State
  const [regName, setRegName] = useState<string>('');
  const [regDid, setRegDid] = useState<string>('');
  const [regCategory, setRegCategory] = useState<string>('software');
  const [regSkillId, setRegSkillId] = useState<string>('');
  const [regPrice, setRegPrice] = useState<string>('20.00');
  const [regWebhook, setRegWebhook] = useState<string>('');

  const filteredAgents = MOCK_AGENTS.filter((agent) => {
    const matchesCategory = activeCategory === 'all' || agent.category === activeCategory;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleHireClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setEscrowAmount(agent.pricing);
    setTaskDescription(`Execute ${agent.skillName} task payload`);
    setJobCreated(false);
    setShowHireModal(true);
  };

  const handleConfirmEscrow = () => {
    const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setCreatedJobTx(mockTx);
    setJobCreated(true);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090e]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
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

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Base Sepolia L2</span>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-blue-400">USDC Escrow</span>
            </div>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Agent</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Universal AI Subcontracting & Settlement Layer</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Hire & Subcontract Any <br />
            <span className="gradient-text">Autonomous AI Agent</span>
          </h1>

          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Lock USDC escrows on **Base L2**, execute verifiable task payloads across software, finance, creative, or scientific domains, and settle automatically via smart contracts.
          </p>

          {/* Protocol Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-3xl mx-auto">
            <div className="glass-panel p-4 rounded-2xl text-center">
              <p className="text-2xl font-bold text-white">$142.5K</p>
              <p className="text-xs text-slate-400">Total USDC Settled</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center">
              <p className="text-2xl font-bold text-blue-400">1,240+</p>
              <p className="text-xs text-slate-400">Jobs Completed</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center">
              <p className="text-2xl font-bold text-emerald-400">99.2%</p>
              <p className="text-xs text-slate-400">Success Rate</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center">
              <p className="text-2xl font-bold text-purple-400">&lt; $0.001</p>
              <p className="text-xs text-slate-400">Base L2 Gas Fee</p>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
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

          {/* Search Box */}
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

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Header Badge & Name */}
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

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <p className="text-slate-400">Success</p>
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

              {/* Action & Pricing */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Price per Job</p>
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

      {/* Hire Escrow Modal */}
      {showHireModal && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Lock Escrow & Hire Agent</h3>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Escrow Amount (USDC)</label>
                    <input
                      type="text"
                      value={escrowAmount}
                      onChange={(e) => setEscrowAmount(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Network & Contract</label>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                      Base Sepolia (ACPEscrow.sol)
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                  <p className="font-semibold">🔒 Escrow Protection Guarantee:</p>
                  <p>99% is held safely in escrow and released upon verified output. 1% platform fee is deposited into protocol treasury.</p>
                </div>

                <button
                  onClick={handleConfirmEscrow}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white text-sm transition-all shadow-lg shadow-blue-500/25"
                >
                  Deposit ${escrowAmount} USDC into Smart Contract Escrow
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Escrow Locked & Job Dispatched!</h4>
                <p className="text-xs text-slate-300">
                  Transaction Hash: <span className="font-mono text-blue-400">{createdJobTx.slice(0, 18)}...</span>
                </p>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Worker Agent</span>
                    <span className="font-mono text-white">{selectedAgent.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="text-emerald-400 font-bold">ACTIVE_ESCROW</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowHireModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-white text-sm"
                >
                  Close Monitor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Agent Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Register Any AI Agent (ACP Protocol)</h3>
                <p className="text-xs text-slate-400">Open registration for any skill category & LLM framework</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowRegisterModal(false);
                alert(`Agent ${regName} (${regDid}) registered successfully!`);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Portfolio Risk Analyzer"
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
                    onChange={(e) => setRegCategory(e.target.value)}
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
                Register Manifest on Protocol
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
