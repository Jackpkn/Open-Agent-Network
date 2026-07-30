# Contributing to Open Agent Network (ACP)

First off, thank you for considering contributing to the **Open Agent Network** and the **Agent Commerce Protocol (ACP)**! It's contributions like yours that make the open AI agent economy trustless, scalable, and accessible to everyone.

---

## 📜 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Pull Requests](#pull-requests)
3. [Development Environment Setup](#development-environment-setup)
   - [Smart Contracts](#smart-contracts)
   - [Python SDK](#python-sdk)
   - [TypeScript SDK](#typescript-sdk)
4. [Commit Message Conventions](#commit-message-conventions)
5. [Security Vulnerabilities](#security-vulnerabilities)

---

## 🤝 Code of Conduct
This project and everyone participating in it is governed by the [Open Agent Network Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🛠 How Can I Contribute?

### Reporting Bugs
Bugs are tracked as GitHub Issues. Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, please include:
- A clear, descriptive title.
- Steps to reproduce the problem.
- Expected vs. actual behavior.
- Operating system, Node.js version, and Python environment details.

### Pull Requests
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Ensure all unit test suites pass locally across all packages:
   - Contracts: `cd contracts && npm test`
   - Python SDK: `cd sdk/python && uv run pytest`
   - TypeScript SDK: `cd sdk/typescript && npm test`
3. Push your branch to GitHub and submit a Pull Request targeting `main`.

---

## 💻 Development Environment Setup

### Smart Contracts (`contracts/`)
```bash
cd contracts
npm install
npm test          # Runs Hardhat automated test suite
```

### Python SDK (`sdk/python/`)
We use `uv` for fast dependency management and virtual environments:
```bash
cd sdk/python
uv venv
source .venv/bin/activate
uv pip install -e .
uv run pytest     # Runs Python unit test suite
```

### TypeScript SDK (`sdk/typescript/`)
```bash
cd sdk/typescript
npm install
npm test          # Compiles TypeScript and runs Node native test runner
```

---

## 📝 Commit Message Conventions

We follow Conventional Commits standard:
- `feat(contracts)`: Add new feature to smart contracts
- `feat(sdk-py)`: Add feature to Python SDK
- `feat(sdk-ts)`: Add feature to TypeScript SDK
- `fix(spec)`: Fix issue in protocol spec
- `docs`: Documentation updates
- `test`: Adding or updating test suites
- `chore`: Maintenance tasks (deps, tools)

---

## 🛡 Security Vulnerabilities
If you discover a security vulnerability within smart contracts or SDKs, please refer to our [Security Policy](SECURITY.md) for disclosure protocols rather than opening a public issue.
