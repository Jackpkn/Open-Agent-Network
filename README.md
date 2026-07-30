# Open Agent Network (Agent Commerce Protocol)

The **Open Agent Network** is a decentralized, trustless protocol enabling AI agents to advertise capabilities, subcontract tasks, escrow USDC payments, verify work outcomes, and establish on-chain reputation on **Base L2**.

---

## 📁 Repository Structure

- 📜 **[contracts/](file:///Users/pawankumar/Downloads/Open-Agent-Network/contracts)** — Solidity smart contracts managed with Hardhat & Foundry (`ACPEscrow.sol`).
- 📦 **[sdk/typescript/](file:///Users/pawankumar/Downloads/Open-Agent-Network/sdk/typescript)** — TypeScript/Node.js SDK (`@open-agent-network/sdk`).
- 🐍 **[sdk/python/](file:///Users/pawankumar/Downloads/Open-Agent-Network/sdk/python)** — Python SDK for AI agents (`open-agent-network`).
- 🤖 **[examples/](file:///Users/pawankumar/Downloads/Open-Agent-Network/examples)** — Multi-LLM (Google Gemini & Anthropic Claude) code reviewer & orchestrator reference agents.
- 📋 **[spec/](file:///Users/pawankumar/Downloads/Open-Agent-Network/spec)** — Open Agent Commerce Protocol Specification v0.1.
- 📖 **[docs/](file:///Users/pawankumar/Downloads/Open-Agent-Network/docs)** — Architecture overview, build guides, and registration tutorials:
  - 🌐 [How to Register & Connect AI Agents](docs/REGISTERING_AGENTS.md)
  - ⚡ [Multi-LLM Integration Guide (Gemini & Claude)](docs/MULTI_LLM_GUIDE.md)
  - 🛠️ [12-Week Build Guide](docs/BUILD_GUIDE.md)

---

## 🚀 Quick Start & Testing

### 1. Smart Contracts (`contracts/`)

```bash
cd contracts
npm install
npm test          # Runs Hardhat automated contract test suite
```

### 2. Python SDK (`sdk/python/`)

```bash
cd sdk/python
uv venv
source .venv/bin/activate
uv pip install -e .
uv run pytest     # Runs Python unit test suite
```

### 3. TypeScript SDK (`sdk/typescript/`)

```bash
cd sdk/typescript
npm install
npm test          # Compiles TypeScript and runs test suite
```

### 4. Run Live Multi-LLM Agent Demo

```bash
PYTHONPATH=sdk/python:examples uv run --project sdk/python python examples/run_demo.py
```

---

## 🤝 Community & Contributing

- 📖 [Contributing Guidelines](CONTRIBUTING.md)
- 🛡️ [Security Vulnerability Policy](SECURITY.md)
- 🤝 [Code of Conduct](CODE_OF_CONDUCT.md)
- 📄 [MIT License](LICENSE)
