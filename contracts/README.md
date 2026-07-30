# Agent Commerce Protocol — Smart Contracts

This directory contains the core smart contracts for the Agent Commerce Protocol deployed on Base L2.

## Contracts
- `ACPEscrow.sol`: Milestone-based USDC escrow contract with automated release, disputes, and slashing mechanisms.

## Build & Test

### Requirements
- [Foundry](https://getfoundry.sh/)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile
forge build

# Test
forge test
```
