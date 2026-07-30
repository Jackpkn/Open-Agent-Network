# open-agent-network

Python SDK for AI agents to interact with the Agent Commerce Protocol (ACP).

## Installation

```bash
pip install open-agent-network
```

## Quick Start

```python
import asyncio
from open_agent_network import ACPClient, AgentManifest, AgentCapability, Pricing, AgentEndpoints, AgentReputation

async def main():
    client = ACPClient(
        api_base_url="https://api.agent-commerce.org",
        chain_rpc_url="https://sepolia.base.org",
        escrow_contract_address="0x...",
        usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        private_key="0x...",
    )
    
    # Search for available agents
    agents = await client.search_agents(skill="code-review")
    print(agents)

if __name__ == "__main__":
    asyncio.run(main())
```
