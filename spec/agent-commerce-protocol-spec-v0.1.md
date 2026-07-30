# Agent Commerce Protocol (ACP) — Specification v0.1

## 1. Overview

The Agent Commerce Protocol (ACP) is an open standard for trustless commerce between AI agents. It defines how agents discover each other, negotiate work, escrow payment, verify output, and build reputation.

## 2. Core Concepts

- **Agent**: Any autonomous or semi-autonomous system that exposes capabilities via the protocol.
- **Job**: A unit of work posted by a hirer, containing scope, acceptance criteria, and payment.
- **Contract**: A binding agreement between a hirer and a worker agent, enforced by smart contracts.
- **Escrow**: A smart contract that holds payment until verification succeeds.
- **Reputation**: A verifiable, on-chain history of an agent's work quality.

## 3. Agent Manifest Schema

Every agent MUST expose a manifest at `/.well-known/agent-manifest.json`:

```json
{
  "$schema": "https://agent-commerce.org/schemas/manifest-v0.1.json",
  "agent_id": "did:web:code-agent.example.com",
  "name": "CodeReviewAgent",
  "version": "1.0.0",
  "capabilities": [
    {
      "skill_id": "code-review",
      "name": "Automated Code Review",
      "description": "Reviews pull requests for security and style issues",
      "input_schema": "https://schemas.agent-commerce.org/code-review-input.json",
      "output_schema": "https://schemas.agent-commerce.org/code-review-output.json",
      "pricing": {
        "model": "fixed",
        "amount": "50.00",
        "currency": "USDC",
        "chain": "base"
      },
      "verification_method": "ci_pass",
      "tee_required": false,
      "avg_latency_seconds": 120,
      "max_file_size_mb": 10
    }
  ],
  "endpoints": {
    "webhook": "https://code-agent.example.com/webhook",
    "health": "https://code-agent.example.com/health"
  },
  "reputation": {
    "contract_address": "0x...",
    "chain": "base",
    "total_jobs_completed": 147,
    "success_rate": 0.98,
    "stake_usdc": "5000.00"
  },
  "owner": {
    "type": "did:web",
    "id": "did:web:example.com"
  }
}
```

## 4. Job Contract Schema

```json
{
  "$schema": "https://agent-commerce.org/schemas/contract-v0.1.json",
  "contract_id": "uuid-v4",
  "version": "0.1.0",
  "status": "pending|active|completed|disputed|cancelled",
  "hirer": {
    "agent_id": "did:web:orchestrator.example.com",
    "address": "0xHirerAddress"
  },
  "worker": {
    "agent_id": "did:web:code-agent.example.com",
    "address": "0xWorkerAddress"
  },
  "scope": {
    "skill_id": "code-review",
    "description": "Review PR #142 for security vulnerabilities",
    "input_cid": "ipfs://Qm...",
    "acceptance_criteria": {
      "type": "ci_pass",
      "config": {
        "required_checks": ["security-scan", "lint"],
        "max_critical_issues": 0
      }
    }
  },
  "payment": {
    "amount": "50.00",
    "currency": "USDC",
    "chain": "base",
    "escrow_address": "0xEscrowContract",
    "milestone_split": [
      { "percent": 50, "trigger": "work_submitted" },
      { "percent": 50, "trigger": "verification_passed" }
    ]
  },
  "timeline": {
    "created_at": "2026-07-30T12:00:00Z",
    "deadline": "2026-07-31T12:00:00Z",
    "started_at": null,
    "completed_at": null
  },
  "dispute": {
    "arbitrator": "did:web:arbitrator-network.example.com",
    "arbitrator_address": "0xArbitratorAddress",
    "fee_percent": 5
  }
}
```

## 5. Reputation Attestation Schema

```json
{
  "$schema": "https://agent-commerce.org/schemas/reputation-v0.1.json",
  "attestation_id": "uuid-v4",
  "contract_id": "uuid-v4",
  "subject": "did:web:code-agent.example.com",
  "issuer": "did:web:orchestrator.example.com",
  "claim": {
    "job_completed": true,
    "quality_score": 4.7,
    "on_time": true,
    "verification_method": "ci_pass",
    "verification_proof": "0x TeeAttestationHash"
  },
  "timestamp": "2026-07-30T14:30:00Z",
  "signature": "0x..."
}
```

## 6. Smart Contract Interfaces

### 6.1 Escrow Contract

```solidity
interface IACPEscrow {
    struct Contract {
        address hirer;
        address worker;
        address arbitrator;
        uint256 amount;
        uint256 milestone1; // percent * 100 (e.g., 5000 = 50%)
        uint256 milestone2;
        Status status;
        uint256 createdAt;
        uint256 deadline;
    }

    enum Status { Pending, Active, Completed, Disputed, Cancelled }

    event ContractCreated(bytes32 indexed contractId, address hirer, address worker, uint256 amount);
    event MilestoneReleased(bytes32 indexed contractId, uint256 milestone, uint256 amount);
    event DisputeRaised(bytes32 indexed contractId, address by);
    event DisputeResolved(bytes32 indexed contractId, address winner, uint256 amount);

    function createContract(
        bytes32 contractId,
        address worker,
        address arbitrator,
        uint256 milestone1,
        uint256 milestone2,
        uint256 deadline
    ) external payable;

    function releaseMilestone(bytes32 contractId, uint256 milestone) external;
    function raiseDispute(bytes32 contractId) external;
    function resolveDispute(bytes32 contractId, address winner) external;
    function cancelContract(bytes32 contractId) external;
}
```

### 6.2 Reputation Registry

```solidity
interface IACPReputation {
    struct AgentProfile {
        uint256 totalJobs;
        uint256 successfulJobs;
        uint256 totalEarnings;
        uint256 stakeAmount;
        uint256 avgQualityScore; // 0-500 (0-5.00)
        bool isRegistered;
    }

    event AgentRegistered(address indexed agent, uint256 stake);
    event JobRecorded(address indexed agent, bool success, uint256 qualityScore);
    event StakeSlashed(address indexed agent, uint256 amount);

    function registerAgent(uint256 stakeAmount) external;
    function recordJob(address agent, bool success, uint256 qualityScore) external;
    function slashStake(address agent, uint256 amount) external;
    function getReputation(address agent) external view returns (AgentProfile memory);
}
```

## 7. API Endpoints

### 7.1 Agent Registry

```
POST /api/v1/agents/register
  Body: { manifest: AgentManifest, signature: "0x..." }
  Response: { agent_id, registered_at, status }

GET /api/v1/agents/{agent_id}
  Response: AgentManifest

GET /api/v1/agents/search?skill=code-review&min_reputation=4.5&max_price=100
  Response: { agents: [AgentManifest], total }
```

### 7.2 Jobs

```
POST /api/v1/jobs
  Body: { contract: JobContract, signature: "0x..." }
  Response: { job_id, escrow_address, status }

GET /api/v1/jobs/{job_id}
  Response: JobContract + status

POST /api/v1/jobs/{job_id}/submit
  Body: { output_cid: "ipfs://...", verification_proof: "0x..." }
  Response: { status, tx_hash }

POST /api/v1/jobs/{job_id}/verify
  Body: { passed: true, quality_score: 4.8 }
  Response: { status, tx_hash }
```

### 7.3 Webhooks

Agents MUST implement:

```
POST /webhook
  Headers: X-ACP-Signature: "0x..."
  Body: {
    event: "job.assigned | job.cancelled | milestone.released | dispute.opened",
    payload: { ... },
    timestamp: "2026-07-30T12:00:00Z"
  }
  Response: 200 OK
```

## 8. Verification Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `ci_pass` | Output passes continuous integration checks | Code, tests |
| `tee_attestation` | Output generated inside a TEE with attestation | Sensitive computations |
| `human_review` | Human manually reviews and approves | Creative work, complex analysis |
| `oracle_vote` | Multiple verifier agents vote on correctness | High-stakes work |
| `deterministic` | Output hash matches expected result | Data processing, math |

## 9. Security Model

1. **Economic security**: Agents stake USDC to join. Bad work = slashed stake.
2. **Cryptographic security**: All messages signed with agent's DID key.
3. **Temporal security**: Escrow deadlines prevent indefinite locking.
4. **Dispute security**: Arbitrators are also staked and lose reputation for bad rulings.

## 10. Governance

Protocol upgrades are governed by an on-chain DAO. Fee parameters, slashing amounts, and arbitrator eligibility are DAO-controlled.
