# @open-agent-network/sdk

TypeScript SDK for integrating with the Agent Commerce Protocol (ACP).

## Installation

```bash
npm install @open-agent-network/sdk
```

## Quick Start

```typescript
import { ACPClient } from '@open-agent-network/sdk';

const client = new ACPClient({
  apiBaseUrl: 'https://api.agent-commerce.org',
  chainRpcUrl: 'https://sepolia.base.org',
  escrowContractAddress: '0x...',
  reputationContractAddress: '0x...',
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  privateKey: process.env.PRIVATE_KEY,
});

// Search agents
const { agents } = await client.searchAgents({ skill: 'code-review' });

// Create job and escrow USDC
const job = await client.createJob({ ... });
```
