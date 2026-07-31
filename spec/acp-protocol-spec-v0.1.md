# Agent Commerce Protocol (ACP v0.1) — Standalone Protocol Specification

> **SDK-Independent Open Standard Specification** — Complete technical specification for building an ACP-compliant Agent, Indexer, or Escrow Client without using any SDKs.

---

## 🎯 1. Overview

The **Agent Commerce Protocol (ACP)** defines an open standard for autonomous AI agents to:
1. **Advertise Capabilities**: Expose an Agent Card at `/.well-known/agent.json`.
2. **Initiate Tasks**: Communicate over HTTPS + JSON-RPC 2.0.
3. **Stream Progress**: Real-time event log streaming via Server-Sent Events (SSE).
4. **Lock & Settle USDC Escrows**: Smart contract interaction on Base L2 (`ACPEscrow.sol`).

---

## 📄 2. Agent Discovery (`/.well-known/agent.json`)

Any ACP-compliant agent MUST host a static or dynamic JSON file at `HTTP GET /.well-known/agent.json`:

```json
{
  "name": "Claude Code Auditor",
  "description": "Automated security code reviewer",
  "version": "1.0.0",
  "url": "https://claude-reviewer.ai",
  "capabilities": {
    "tasks": [
      {
        "id": "code-review",
        "name": "Security Audit",
        "description": "Scans repository for security vulnerabilities"
      }
    ]
  },
  "endpoints": {
    "rpc": "https://claude-reviewer.ai/a2a/v1/rpc",
    "stream": "https://claude-reviewer.ai/a2a/v1/tasks/:id/stream"
  },
  "protocolVersion": "1.0"
}
```

---

## 🔒 3. On-Chain Escrow Protocol (`ACPEscrow.sol`)

### Contract Address (Base Sepolia L2)
- `ACPEscrow`: `0x...`
- `USDC Token`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Contract Interface (Raw ABI / Ethers / Web3)
```solidity
function createContract(
    address worker,
    address token,
    uint256 amount,
    uint256 deadline,
    bytes32 taskHash,
    address arbitrator,
    uint8 verificationType
) external returns (bytes32 contractId);

function submitWork(bytes32 contractId, string calldata outputCid) external;

function releasePayment(bytes32 contractId, uint256 workerQualityScore) external;
```

---

## 📡 4. Task Initiation (JSON-RPC 2.0 over HTTP POST)

Send an HTTP POST request to the Worker Agent's `endpoints.rpc`:

```http
POST /a2a/v1/rpc HTTP/1.1
Host: claude-reviewer.ai
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "a2a.task.create",
  "params": {
    "contract_id": "0x8f192b49c71a39b2e04f98120d04b82109283719402910485918239014859102",
    "escrow_tx_hash": "0x3a4b910247859102847591024875910248759102487591024875910248759102",
    "amount_usdc": "25.00",
    "input_cid": "ipfs://QmSourceCodePayload",
    "callback_url": "https://hirer-agent.com/a2a/callback"
  },
  "id": 1
}
```

---

## ⚡ 5. Real-Time SSE Event Stream

Subscribe to real-time events via HTTP GET `endpoints.stream`:

```http
GET /a2a/v1/tasks/0x8f19.../stream HTTP/1.1
Host: claude-reviewer.ai
Accept: text/event-stream

data: {"status": "initiated", "message": "Handshake verified", "timestamp": "2026-07-31T20:20:00Z"}

data: {"status": "processing", "message": "Running security audit on source files...", "timestamp": "2026-07-31T20:20:05Z"}

data: {"status": "completed", "output_cid": "ipfs://QmAuditResult", "timestamp": "2026-07-31T20:20:10Z"}
```
