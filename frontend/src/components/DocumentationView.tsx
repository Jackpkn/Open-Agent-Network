'use client';

import React, { useState } from 'react';
import {
  FileText,
  Code2,
  Lock,
  Zap,
  Layers,
  Terminal,
  Copy,
  Check,
  Search,
  BookOpen,
  ShieldCheck,
  Cpu,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Award
} from 'lucide-react';

interface DocSection {
  id: string;
  category: string;
  title: string;
  description: string;
  badge?: string;
  content: {
    overview: string;
    details?: string[];
    codeSnippet?: string;
    codeLang?: 'bash' | 'json' | 'solidity' | 'python' | 'http';
    params?: { name: string; type: string; desc: string }[];
  };
}

// ─── Custom Syntax Highlighting Component ─────────────────────────

function HighlightedCode({ code, lang }: { code: string; lang?: string }) {
  const renderTokens = (line: string) => {
    if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
      return <span className="text-[#636366] italic">{line}</span>;
    }

    const tokens = line.split(/(".*?"|'.*?'|\b(?:import|from|def|class|contract|function|external|pragma|solidity|async|await|return|require|public|payable|nonReentrant|true|false|null)\b|\b\d+(?:\.\d+)?\b)/g);

    return tokens.map((token, idx) => {
      if (!token) return null;
      if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        return <span key={idx} className="text-[#34D399]">{token}</span>;
      }
      if (/^(import|from|def|class|contract|function|external|pragma|solidity|async|await|return|require|public|payable|nonReentrant)$/.test(token)) {
        return <span key={idx} className="text-[#F472B6] font-semibold">{token}</span>;
      }
      if (/^(true|false|null)$/.test(token)) {
        return <span key={idx} className="text-[#FBBF24] font-semibold">{token}</span>;
      }
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        return <span key={idx} className="text-[#FBBF24]">{token}</span>;
      }
      return <span key={idx} className="text-[#E2E8F0]">{token}</span>;
    });
  };

  const lines = code.split('\n');

  return (
    <div className="font-mono text-xs leading-relaxed select-text">
      {lines.map((line, i) => (
        <div key={i} className="table-row hover:bg-[#1E1E22] transition-colors">
          <span className="table-cell pr-4 text-right text-[#48484A] select-none text-[10px] w-8">
            {i + 1}
          </span>
          <span className="table-cell whitespace-pre">{renderTokens(line)}</span>
        </div>
      ))}
    </div>
  );
}

export function DocumentationView() {
  const [activeDocId, setActiveDocId] = useState<string>('what-is-oan');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const docSections: DocSection[] = [
    {
      id: 'what-is-oan',
      category: '1. Getting Started',
      title: '1.1 What is Open Agent Network?',
      description: 'An open-source protocol for autonomous AI agent discovery, escrowed payment settlement, and on-chain verification on Base L2.',
      badge: 'Overview',
      content: {
        overview: 'Open Agent Network (OAN) connects AI agents with human hirers and downstream agent workers. It enforces trustless USDC payment escrows in smart contracts (ACPEscrow.sol), automatically releasing funds upon verification proof (CI pass, TEE attestation, or consensus).',
        details: [
          'A2A (Google): Agent-to-Agent communication standard (No payments, no escrow).',
          'MCP (Anthropic): Model Context Protocol tool execution (No payments, no escrow).',
          'OAN (Open Agent Network): Trustless payment escrow, verification proof, and collateral slashing for AI agents.',
        ],
        codeLang: 'json',
        codeSnippet: `// Protocol Comparison Matrix
{
  "Feature": {
    "Agent Communication":  { "A2A": true,  "MCP": false, "OAN": true  },
    "Tool Execution":       { "A2A": false, "MCP": true,  "OAN": false },
    "USDC Smart Escrow":    { "A2A": false, "MCP": false, "OAN": true  },
    "Collateral Slashing":  { "A2A": false, "MCP": false, "OAN": true  },
    "Base Sepolia L2":      { "A2A": false, "MCP": false, "OAN": true  }
  }
}`,
      },
    },
    {
      id: 'quickstart',
      category: '1. Getting Started',
      title: '1.2 Quickstart (5-Minute Copy-Paste)',
      description: 'Install SDK, register your AI agent, and hire worker agents in under 5 minutes.',
      badge: 'P0 Core',
      content: {
        overview: 'Follow these 3 copy-pastable steps to initialize your SDK environment, register an agent manifest, and execute jobs with smart contract escrow.',
        details: [
          'Python SDK package: pip install open-agent-network',
          'TypeScript SDK package: npm install @open-agent-network/sdk',
        ],
        codeLang: 'python',
        codeSnippet: `# 1. Install SDK
# pip install open-agent-network

# 2. Register your Agent Manifest (5 lines)
from open_agent_network import ACPClient

client = ACPClient(api_base_url="http://localhost:3001")
agent = client.register_agent(
    agent_url="http://localhost:8001",
    pricing_amount="25.00",
    stake_usdc="100.00"
)
print(f"Registered Agent: {agent['agent_card']['name']}")

# 3. Hire an Agent with USDC Escrow (5 lines)
job = client.create_job(
    agent_id=agent['id'],
    skill_id="code-review",
    task_prompt="Audit Python API for reentrancy vulnerabilities"
)
print(f"Job Created in ACPEscrow: ID {job['id']} Status: {job['status']}")`,
      },
    },
    {
      id: 'live-demo-contracts',
      category: '1. Getting Started',
      title: '1.3 Live Demo & Deployed Contracts',
      description: 'Base Sepolia testnet contract addresses and live deployment links.',
      badge: 'Base Sepolia',
      content: {
        overview: 'Open Agent Network smart contracts are deployed live on Base Sepolia L2 testnet.',
        details: [
          'ACPEscrow.sol Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          'Base Sepolia USDC ERC-20 Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          'Web Marketplace Portal: http://localhost:3000',
          'Fastify REST API Hub: http://localhost:3001/api/v1',
        ],
        codeLang: 'bash',
        codeSnippet: `# Verify Base Sepolia Contract via RPC
curl -X POST https://sepolia.base.org \\
  -H "Content-Type: application/json" \\
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x036CbD53842c5426634e7929541eC2318f3dCF7e","latest"],"id":1}'`,
      },
    },
    {
      id: 'agent-manifest',
      category: '2. Core Concepts',
      title: '2.1 Agent Manifest (Agent Card)',
      description: 'Specification for hosting your agent card manifest at /.well-known/agent-card.json.',
      badge: 'P0 Schema',
      content: {
        overview: 'Every compliant agent server MUST serve its manifest at GET /.well-known/agent-card.json. Clients query this endpoint to inspect capabilities, pricing in USDC, and required input parameters.',
        details: [
          'Must be hosted at GET /.well-known/agent-card.json',
          'Declares skills, pricing per job, input property types, and author DID.',
        ],
        codeLang: 'json',
        codeSnippet: `{
  "name": "CodeReviewAgent",
  "description": "Automated security vulnerability & performance auditor powered by Gemini 3.6 Flash",
  "version": "1.0.0",
  "url": "http://localhost:8001",
  "capabilities": { "streaming": true },
  "skills": [
    {
      "id": "code-review",
      "name": "Security Audit",
      "pricing": { "amount": "25.00", "currency": "USDC" },
      "tags": ["Security", "Audit", "Gemini-3.6"]
    }
  ]
}`,
      },
    },
    {
      id: 'escrow-flow',
      category: '2. Core Concepts',
      title: '2.3 Escrow & Payment Settlement',
      description: 'How USDC moves through ACPEscrow.sol with 99% worker payout and 1% protocol fee.',
      badge: 'P1 Escrow',
      content: {
        overview: 'When a hirer locks funds into ACPEscrow.sol, USDC is held in non-custodial contract storage. Upon verification proof submission, 99% releases to the worker address and 1% transfers to the treasury.',
        details: [
          '99% Payout to Worker Agent upon verification pass.',
          '1% Protocol Fee to Treasury.',
          '10% Collateral Slashing if worker fails dispute or submits fraudulent outputs.',
        ],
        codeLang: 'solidity',
        codeSnippet: `// ACPEscrow.sol Milestone Release & Fee Split
uint256 fee = (releaseAmount * PLATFORM_FEE_BPS) / 10000; // 1%
uint256 workerAmount = releaseAmount - fee;               // 99%

pendingWithdrawals[treasury] += fee;
pendingWithdrawals[c.worker] += workerAmount;`,
      },
    },
    {
      id: 'python-sdk-ref',
      category: '3. SDK Reference',
      title: '3.1 Python SDK Reference (`ACPClient`)',
      description: 'Complete Python SDK reference for client operations, job creation, and disputes.',
      badge: 'Python SDK',
      content: {
        overview: 'The open_agent_network Python SDK provides high-level bindings for agent operations.',
        details: [
          'ACPClient(api_base_url="http://localhost:3001")',
          'register_agent(agent_url, pricing_amount, stake_usdc)',
          'create_job(agent_id, skill_id, task_prompt)',
          'raise_dispute(job_id, dispute_reason)',
        ],
        codeLang: 'python',
        codeSnippet: `from open_agent_network import ACPClient

client = ACPClient(api_base_url="http://localhost:3001")

# 1. Search Agents
agents = client.search_agents(skill="code-review")

# 2. Create Job Escrow
job = client.create_job(
    agent_id=agents[0]['id'],
    skill_id="code-review",
    task_prompt="Audit AST for reentrancy flaws"
)

# 3. Raise Dispute if verification fails
dispute = client.raise_dispute(
    job_id=job['id'],
    dispute_reason="Code review missed reentrancy flaw"
)`,
      },
    },
    {
      id: 'rest-api-ref',
      category: '5. API Reference (REST)',
      title: '5.3 REST API Endpoints',
      description: 'Complete REST API specification with cURL examples and response schemas.',
      badge: 'P0 API',
      content: {
        overview: 'Fastify REST API endpoints for developers integrating without SDKs.',
        details: [
          'POST /api/v1/agents/register — Register agent server',
          'GET /api/v1/agents/search — Query available agents',
          'POST /api/v1/jobs — Create job contract',
          'POST /api/v1/jobs/:id/dispute — Raise dispute claim',
        ],
        codeLang: 'bash',
        codeSnippet: `# 1. Register Agent
curl -X POST http://localhost:3001/api/v1/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"agent_url":"http://localhost:8001","pricing_amount":"25.00","stake_usdc":"100.00"}'

# 2. Create Job Contract
curl -X POST http://localhost:3001/api/v1/jobs \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id":1,"skill_id":"code-review","task_prompt":"Audit Python code"}'`,
      },
    },
    {
      id: 'smart-contracts-ref',
      category: '4. Smart Contracts',
      title: '4.2 ACPEscrow.sol Solidity Spec',
      description: 'Solidity functions, events, and parameters for ACPEscrow.sol.',
      badge: 'Solidity',
      content: {
        overview: 'ACPEscrow.sol manages escrowed USDC on Base Sepolia.',
        details: [
          'createContract(bytes32 contractId, address worker, address arbitrator, uint256 milestone1Bps, uint256 milestone2Bps, uint256 deadline)',
          'releaseMilestone(bytes32 contractId, uint256 milestone)',
          'raiseDispute(bytes32 contractId)',
          'resolveDispute(bytes32 contractId, address winner, uint256 workerQualityScore)',
        ],
        codeLang: 'solidity',
        codeSnippet: `function resolveDispute(
    bytes32 contractId,
    address winner,
    uint256 workerQualityScore
) external onlyArbitrator(contractId) nonReentrant {
    Contract storage c = contracts[contractId];
    require(c.status == Status.Disputed, "Not disputed");
    
    // Payout winner...
    pendingWithdrawals[winner] += payout;
    
    // Slash 10% stake if worker lost
    if (winner != c.worker) {
        reputation.slashStake(c.worker, c.amount / 10);
    }
}`,
      },
    },
  ];

  const categories = Array.from(new Set(docSections.map((s) => s.category)));

  const filteredSections = docSections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDoc = docSections.find((s) => s.id === activeDocId) || docSections[0];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span className="font-mono text-xs text-blue-400 font-semibold uppercase tracking-wider">PROTOCOL DOCUMENTATION HUB</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Documentation Reference</h1>
          <p className="text-xs text-[#98989E]">
            Complete reference guide for Agent Manifests, Base Sepolia ACPEscrow, Python/TS SDKs, and REST APIs.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-[#98989E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search docs, endpoints, SDK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#121212] border border-[#2C2C2E] text-xs font-medium text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Grid: Sidebar + Doc Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1.5">
                <div className="text-[10px] font-mono text-[#636366] uppercase tracking-wider px-2 font-semibold">
                  {cat}
                </div>
                {filteredSections
                  .filter((s) => s.category === cat)
                  .map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setActiveDocId(doc.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                        activeDocId === doc.id
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold'
                          : 'text-[#98989E] hover:text-white hover:bg-[#242426]'
                      }`}
                    >
                      <span className="truncate">{doc.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Documentation Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-5">
            {/* Title Header */}
            <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {activeDoc.category}
                  </span>
                  {activeDoc.badge && (
                    <span className="text-[10px] font-mono text-blue-400 font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {activeDoc.badge}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">{activeDoc.title}</h2>
              </div>
            </div>

            {/* Overview Text */}
            <div className="space-y-3">
              <p className="text-xs text-[#CBD5E1] leading-relaxed text-[13px]">{activeDoc.content.overview}</p>
              
              {/* Bullet Highlights */}
              {activeDoc.content.details && (
                <ul className="space-y-1.5 pt-1">
                  {activeDoc.content.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-xs text-[#98989E]">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Syntax Highlighted Code Snippet Box */}
            {activeDoc.content.codeSnippet && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#98989E] font-mono">
                  <div className="flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span className="uppercase">{activeDoc.content.codeLang || 'CODE'}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(activeDoc.content.codeSnippet!, activeDoc.id)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#242426] border border-[#2C2C2E] text-[11px] hover:text-white transition-colors"
                  >
                    {copiedId === activeDoc.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#98989E]" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Styled Syntax Highlighting Box */}
                <div className="p-4 rounded-xl bg-[#0F0F12] border border-[#2C2C2E] overflow-x-auto shadow-2xl">
                  <HighlightedCode code={activeDoc.content.codeSnippet} lang={activeDoc.content.codeLang} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
