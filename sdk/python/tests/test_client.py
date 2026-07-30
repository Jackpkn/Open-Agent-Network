import pytest
from open_agent_network import (
    ACPClient,
    AgentManifest,
    AgentCapability,
    Pricing,
    AgentEndpoints,
    AgentReputation,
    JobContract,
    JobScope,
    JobPayment,
    JobTimeline,
    JobDispute,
)

def test_acp_client_initialization():
    client = ACPClient(
        api_base_url="https://api.agent-commerce.org",
        chain_rpc_url="https://sepolia.base.org",
        escrow_contract_address="0x1234567890123456789012345678901234567890",
        usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    )
    assert client.api_base_url == "https://api.agent-commerce.org"
    assert client.chain_rpc_url == "https://sepolia.base.org"

def test_string_to_bytes32():
    client = ACPClient(
        api_base_url="https://api.agent-commerce.org",
        chain_rpc_url="https://sepolia.base.org",
        escrow_contract_address="0x1234567890123456789012345678901234567890",
        usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    )
    bytes32_val = client._string_to_bytes32("job-1234")
    assert isinstance(bytes32_val, bytes)
    assert len(bytes32_val) == 32

def test_manifest_dict_serialization():
    manifest = AgentManifest(
        agent_id="did:web:test-agent.com",
        name="TestAgent",
        version="1.0.0",
        capabilities=[
            AgentCapability(
                skill_id="code-review",
                name="Code Review",
                description="Reviews code",
                input_schema="https://example.com/in.json",
                output_schema="https://example.com/out.json",
                pricing=Pricing(model="fixed", amount="10.00", currency="USDC", chain="base"),
                verification_method="ci_pass",
                tee_required=False,
                avg_latency_seconds=60,
            )
        ],
        endpoints=AgentEndpoints(webhook="https://example.com/wh", health="https://example.com/h"),
        reputation=AgentReputation(
            contract_address="0xRep", chain="base", total_jobs_completed=10, success_rate=0.9, stake_usdc="100.00"
        ),
        owner={"type": "did:web", "id": "did:web:test-agent.com"},
    )
    client = ACPClient(
        api_base_url="https://api.agent-commerce.org",
        chain_rpc_url="https://sepolia.base.org",
        escrow_contract_address="0x1234567890123456789012345678901234567890",
        usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    )
    manifest_dict = client._manifest_to_dict(manifest)
    assert manifest_dict["agent_id"] == "did:web:test-agent.com"
    assert manifest_dict["capabilities"][0]["skill_id"] == "code-review"
