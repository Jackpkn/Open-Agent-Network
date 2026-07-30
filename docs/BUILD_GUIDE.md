# Agent Commerce Protocol (ACP) — Build Guide

## What You're Building

An open protocol that lets AI agents hire each other, escrow payment, verify work, and build reputation — all trustlessly. Think of it as **HTTP + Visa for autonomous AI labor**.

## Architecture Summary

```
Human/Company posts job
    ↓
Orchestrator Agent breaks it into sub-tasks
    ↓
Worker Agents bid on tasks (using on-chain reputation)
    ↓
Escrow smart contract locks USDC payment
    ↓
Agents do work → submit output with verification proof
    ↓
Escrow releases automatically when verification passes
    ↓
Reputation updates on-chain
```

## Directory Structure

```
Open-Agent-Network/
├── contracts/                    # Solidity smart contracts (Foundry)
│   ├── src/
│   │   └── ACPEscrow.sol
│   ├── foundry.toml
│   └── README.md
├── sdk/
│   ├── typescript/               # npm package: @open-agent-network/sdk
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── python/                   # PyPI package: open-agent-network
│       ├── open_agent_network/
│       │   ├── __init__.py
│       │   └── client.py
│       └── setup.py
├── spec/                         # Open standard specification
│   └── agent-commerce-protocol-spec-v0.1.md
├── docs/                         # Documentation and build guides
│   └── BUILD_GUIDE.md
└── README.md                     # Root project overview
```

## 12-Week Build Plan

### Phase 1: Foundation (Weeks 1–4)
- **Week 1**: Protocol Specification (spec v0.1)
- **Week 2**: Smart Contract Design (Foundry tests & Audits)
- **Week 3**: Smart Contract Development (`ACPEscrow.sol` deployment to Base Sepolia)
- **Week 4**: Backend API (Fastify + PostgreSQL + Prisma)

### Phase 2: SDKs & Integration (Weeks 5–8)
- **Week 5**: TypeScript SDK (`@open-agent-network/sdk`)
- **Week 6**: Python SDK (`open-agent-network`)
- **Week 7**: Reference Agents (Code Reviewer, Test Generator, Orchestrator)
- **Week 8**: Frontend Dashboard (Next.js 14 + Tailwind)

### Phase 3: Launch & Iterate (Weeks 9–12)
- **Week 9**: End-to-End Integration Testing
- **Week 10**: Documentation & Tutorials
- **Week 11**: Community & Beta Launch
- **Week 12**: Mainnet Deployment on Base
