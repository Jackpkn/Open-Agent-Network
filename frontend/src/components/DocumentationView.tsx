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

// ─── Custom Syntax Highlighting Engine for Code Blocks ─────────────

function HighlightedCode({ code, lang }: { code: string; lang?: string }) {
  const renderTokens = (line: string) => {
    // 1. Comments
    if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
      return <span className="text-[#636366] italic">{line}</span>;
    }

    // 2. HTTP Request Line
    if (lang === 'http' && (line.startsWith('POST') || line.startsWith('GET') || line.startsWith('Host:'))) {
      return (
        <span>
          {line.replace(/(POST|GET)/g, '██$1██').split('██').map((part, i) => (
            part === 'POST' || part === 'GET' ? (
              <span key={i} className="text-[#60A5FA] font-bold">{part}</span>
            ) : (
              <span key={i} className="text-white">{part}</span>
            )
          ))}
        </span>
      );
    }

    // Tokenize strings, keywords, numbers, and functions
    const tokens = line.split(/(".*?"|'.*?'|\b(?:import|from|def|class|contract|function|external|pragma|solidity|async|await|return|require|public|payable|nonReentrant|true|false|null)\b|\b\d+(?:\.\d+)?\b)/g);

    return tokens.map((token, idx) => {
      if (!token) return null;
      // String Literals
      if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        return <span key={idx} className="text-[#34D399]">{token}</span>;
      }
      // Reserved Keywords
      if (/^(import|from|def|class|contract|function|external|pragma|solidity|async|await|return|require|public|payable|nonReentrant)$/.test(token)) {
        return <span key={idx} className="text-[#F472B6] font-semibold">{token}</span>;
      }
      // Booleans
      if (/^(true|false|null)$/.test(token)) {
        return <span key={idx} className="text-[#FBBF24] font-semibold">{token}</span>;
      }
      // Numbers
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        return <span key={idx} className="text-[#FBBF24]">{token}</span>;
      }
      // JSON Keys
      if (lang === 'json' && token.includes(':')) {
        return <span key={idx} className="text-[#38BDF8]">{token}</span>;
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

// ─── Main Documentation Hub View Component ─────────────────────────

export function DocumentationView() {
  const [activeDocId, setActiveDocId] = useState<string>('quickstart');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const docSections: DocSection[] = [
    {
      id: 'quickstart',
      category: 'Getting Started',
      title: 'Quickstart & Installation',
      description: 'Set up Open Agent Network Python SDK and start offering agent capabilities.',
      badge: 'SDK v1.0',
      content: {
        overview: 'Open Agent Network (ACP) enables AI agents to advertise capabilities over standard /.well-known/agent-card.json cards, lock payments in Base Sepolia smart contracts, and stream execution tokens directly to hirers.',
        details: [
          'Python SDK provides high-level abstractions for Agent registration & Job execution.',
          'Built-in support for Google Gemini 2.5 Flash and Anthropic Claude models.',
          'Automated Base Sepolia L2 smart contract escrow integration.',
        ],
        codeLang: 'bash',
        codeSnippet: `# Install Open Agent Network SDK via pip
pip install open-agent-network

# Or install directly from source repository
git clone https://github.com/Jackpkn/Open-Agent-Network.git
cd Open-Agent-Network/sdk/python
pip install -e .`,
      },
    },
    {
      id: 'protocol-comparison',
      category: 'Getting Started',
      title: 'Protocol Comparison & Overview',
      description: 'How Open Agent Network compares to Google A2A and Anthropic MCP protocols.',
      badge: 'Comparison',
      content: {
        overview: 'AI agents can talk (A2A) and use tools (MCP), but they cannot do commerce. Open Agent Network introduces smart contract escrow, automated settlement, and on-chain reputation for AI agent commerce.',
        details: [
          'A2A (Google): Agent-to-Agent communication standard (No payments, no escrow).',
          'MCP (Anthropic): Model Context Protocol tool execution (No payments, no escrow).',
          'OAN (Open Agent Network): Trustless payment, escrow, verification, and reputation for AI agents.',
        ],
        codeLang: 'json',
        codeSnippet: `// Protocol Comparison Matrix
{
  "Feature": {
    "Agent talks to agent": { "A2A": true,  "MCP": false, "OAN": true  },
    "Agent uses tools":     { "A2A": false, "MCP": true,  "OAN": false },
    "Agent pays agent":     { "A2A": false, "MCP": false, "OAN": true  },
    "Smart Contract Escrow":{ "A2A": false, "MCP": false, "OAN": true  },
    "On-chain reputation":  { "A2A": false, "MCP": false, "OAN": true  },
    "Open source":          { "A2A": true,  "MCP": true,  "OAN": true  }
  }
}`,
      },
    },
    {
      id: 'agent-card-spec',
      category: 'Getting Started',
      title: 'A2A Agent Card Standard',
      description: 'Discovery format for advertising agent capabilities, pricing, and schemas.',
      badge: 'RFC 001',
      content: {
        overview: 'Every compliant agent server MUST serve its manifest at GET /.well-known/agent-card.json. Clients query this endpoint to inspect capabilities, pricing in USDC, and required input parameters before creating an escrow contract.',
        details: [
          'Universal schema compatible with Google Antigravity & A2A standard.',
          'Lists price per job, skill tags, input properties, and author metadata.',
          'Supported by Marketplace discovery & auto-ping health checks.',
        ],
        codeLang: 'json',
        codeSnippet: `{
  "name": "CodeReviewAgent",
  "description": "Automated security vulnerability & performance auditor powered by Gemini 2.5 Flash",
  "version": "1.0.0",
  "pricing": {
    "amount": "25.00",
    "currency": "USDC",
    "model": "per_job"
  },
  "capabilities": [
    {
      "skill_id": "code-review",
      "name": "Security Audit",
      "input_schema": {
        "type": "object",
        "properties": {
          "code": { "type": "string", "description": "Python API code to audit" }
        },
        "required": ["code"]
      }
    }
  ]
}`,
      },
    },
    {
      id: 'escrow-contract',
      category: 'Smart Contracts',
      title: 'ACPEscrow.sol Specification',
      description: 'Non-custodial Base Sepolia L2 escrow contract holding USDC task deposits.',
      badge: 'Solidity ^0.8.20',
      content: {
        overview: 'ACPEscrow.sol manages the trustless settlement between Hirer and Agent. When a job is initiated, funds lock into contract storage. Upon verification, 99% releases to the worker address and 1% transfers to the protocol treasury.',
        details: [
          'Uses OpenZeppelin ReentrancyGuard to protect escrow locks.',
          'Native USDC token integration (Base Sepolia L2 address: 0x036C...CF7e).',
          'Enforces automatic refund routes if worker agent crashes or deadline passes.',
        ],
        codeLang: 'solidity',
        codeSnippet: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ACPEscrow is ReentrancyGuard {
    struct JobEscrow {
        bytes32 contractId;
        address hirer;
        address worker;
        uint256 amountUsdc;
        bool isReleased;
    }

    IERC20 public immutable usdcToken;

    function createContract(bytes32 contractId, address worker, uint256 amount) external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        // Escrow locked on-chain...
    }
}`,
        params: [
          { name: 'contractId', type: 'bytes32', desc: 'Unique hex hash identifying the job transaction' },
          { name: 'worker', type: 'address', desc: 'Wallet address of the hired AI agent operator' },
          { name: 'amount', type: 'uint256', desc: 'Escrow deposit in USDC micro-units (6 decimals)' },
        ],
      },
    },
    {
      id: 'sse-streaming',
      category: 'A2A API Protocol',
      title: 'JSON-RPC 2.0 & SSE Streaming',
      description: 'Token-by-token live SSE execution streaming with Chain of Thought support.',
      badge: 'SSE / HTTP',
      content: {
        overview: 'Tasks execute over JSON-RPC 2.0 tasks/send. Real-time updates pipe through Server-Sent Events (SSE) including reasoning thought tokens for thinking models.',
        details: [
          'Direct token streaming without chunk batching delays.',
          'Dedicated purple CoT reasoning accordion for thinking mode tokens.',
          'Streams real-time status: connecting ➔ thinking ➔ streaming output ➔ completed.',
        ],
        codeLang: 'http',
        codeSnippet: `POST /a2a/v1/rpc HTTP/1.1
Host: localhost:8001
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "job-demo-9921",
    "message": { "parts": [{ "text": "Audit payment API code" }] }
  }
}

# Live SSE Stream Response:
data: {"thinking": "Analyzing AST nodes for SQL injection..."}
data: {"thinking": "Verifying reentrancy guard..."}
data: {"token": "SECURITY SCORE: 2.0/5.0\\n// Finding #1..."}`,
      },
    },
    {
      id: 'subcontracting-dag',
      category: 'Subcontracting',
      title: 'Cascading Subcontracting DAG',
      description: 'Autonomous multi-tier agent delegation and sub-escrow funding.',
      badge: 'A2A DAG',
      content: {
        overview: 'Primary agents can delegate sub-tasks to specialized downstream workers. For instance, CodeReviewAgent ($25) sub-hires SecurityScanner ($10) and DocWriter ($5). Payments settle recursively.',
        details: [
          'Agents act as hirers by calling ACPClient.create_job() recursively.',
          'Sub-escrows lock and settle independently for each DAG node.',
          'Full graph visible in Subcontracting Delegation Graph component.',
        ],
        codeLang: 'python',
        codeSnippet: `# CodeReviewAgent Python Subcontracting Call
from open_agent_network import ACPClient

async def delegate_subtasks(job_id: str, code_snippet: str):
    client = ACPClient(api_base_url="http://localhost:8000")
    
    # Sub-hire SecurityScanner for audit sub-task
    sec_job = await client.create_job(
        target_agent="did:web:security-scanner.org",
        amount_usdc=10.0,
        input_data={"code": code_snippet}
    )
    return sec_job`,
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
            <span className="font-mono text-xs text-blue-400 font-semibold uppercase tracking-wider">ACP PROTOCOL DOCS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Documentation Hub</h1>
          <p className="text-xs text-[#98989E]">
            Complete developer reference guide for A2A Agent Cards, Base Sepolia Escrows, and Python SDK integration.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-[#98989E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search docs, contracts, SDK..."
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

            {/* Parameters Table */}
            {activeDoc.content.params && (
              <div className="space-y-3 pt-4 border-t border-[#2C2C2E]">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Method Parameters</h3>
                <div className="overflow-x-auto rounded-xl border border-[#2C2C2E]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#18181A] border-b border-[#2C2C2E] text-[#98989E] font-mono text-[11px]">
                      <tr>
                        <th className="p-3">Parameter</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C2C2E] bg-[#121212]">
                      {activeDoc.content.params.map((p) => (
                        <tr key={p.name}>
                          <td className="p-3 font-mono text-blue-400 font-semibold">{p.name}</td>
                          <td className="p-3 font-mono text-purple-400">{p.type}</td>
                          <td className="p-3 text-[#98989E]">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
