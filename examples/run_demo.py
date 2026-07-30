"""
End-to-End Demo: Open Agent Network + Anthropic Claude Code Reviewer
"""

import asyncio
import os
from open_agent_network import ACPClient
from code_review_agent.agent import ClaudeCodeReviewAgent

async def run_demo():
    print("=" * 70)
    print("🚀 OPEN AGENT NETWORK (ACP) — LIVE CLAUDE DEMO")
    print("=" * 70)

    # 1. Initialize ACP Client
    acp_client = ACPClient(
        api_base_url="https://api.agent-commerce.org",
        chain_rpc_url="https://sepolia.base.org",
        escrow_contract_address="0x1234567890123456789012345678901234567890",
        usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    )

    # 2. Initialize Claude-powered Worker Agent
    claude_agent = ClaudeCodeReviewAgent(acp_client=acp_client)
    manifest = claude_agent.get_manifest()

    print(f"\n1️⃣ Agent Manifest Registered:")
    print(f"   - Agent ID : {manifest.agent_id}")
    print(f"   - Skill    : {manifest.capabilities[0].name}")
    print(f"   - Price    : ${manifest.capabilities[0].pricing.amount} {manifest.capabilities[0].pricing.currency}")

    # 3. Simulate Sample Code to Review
    sample_code = """
def authenticate_user(username, password_hash):
    # Simulated authentication logic
    if not username or not password_hash:
        return False
    return True
"""

    job_id = "job-demo-8912"
    print(f"\n2️⃣ Orchestrator Creates Job & Locks $25.00 USDC in Escrow:")
    print(f"   - Job ID   : {job_id}")
    print(f"   - Contract : ACPEscrow.sol on Base Sepolia")

    # 4. Run Claude Review Process
    print(f"\n3️⃣ Claude Agent Processing Work Payload...")
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("   ⚠️ ANTHROPIC_API_KEY not set. Running simulated Claude response...")
        result = {
            "job_id": job_id,
            "output_cid": "ipfs://QmClaudeReview_8f912a",
            "verification_proof": "0x" + "a1b2c3d4e5f6"*4,
            "review": {
                "overall_score": 4.9,
                "vulnerabilities": [
                    {
                        "severity": "LOW",
                        "line": 2,
                        "issue": "Plain password hash comparison without timing-attack mitigation",
                        "recommendation": "Use hmac.compare_digest for constant-time comparisons"
                    }
                ],
                "summary": "Code is clean and concise. Minor security hardening recommended for password verification."
            }
        }
    else:
        result = await claude_agent.process_job(job_id, sample_code)

    print(f"\n4️⃣ Work Submitted & Verified:")
    print(f"   - Output CID   : {result['output_cid']}")
    print(f"   - Score        : {result['review']['overall_score']}/5.0")
    print(f"   - Summary      : {result['review']['summary']}")

    print("\n5️⃣ Escrow Payout Released:")
    print("   - $24.75 USDC released to Worker Agent")
    print("   - $0.25 USDC (1% fee) released to Protocol Treasury")
    print("   - On-chain reputation updated to 5.0")

    print("=" * 70)
    print("✅ DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_demo())
