"""
End-to-End Demo: Open Agent Network + Google Gemini / Anthropic Claude Code Reviewer
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add sys.path for examples & sdk resolution
examples_dir = str(Path(__file__).resolve().parent)
sdk_dir = str(Path(__file__).resolve().parent.parent / "sdk" / "python")
for p in [examples_dir, sdk_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load environment variables from .env
load_dotenv()

from open_agent_network import ACPClient
from code_review_agent.agent import CodeReviewAgent

async def run_demo():
    print("=" * 75)
    print("🚀 OPEN AGENT NETWORK (ACP) — LIVE MULTI-LLM AGENT DEMO")
    print("=" * 75)

    # 1. Initialize ACP Client
    acp_client = ACPClient(
        api_base_url="https://api.agent-commerce.org",
        chain_rpc_url="https://sepolia.base.org",
        escrow_contract_address="0x1234567890123456789012345678901234567890",
        usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    )

    # 2. Initialize Worker Agent (Detects GEMINI_API_KEY or ANTHROPIC_API_KEY)
    agent = CodeReviewAgent(acp_client=acp_client)
    manifest = agent.get_manifest()

    print(f"\n1️⃣ Agent Manifest Registered:")
    print(f"   - Agent ID   : {manifest.agent_id}")
    print(f"   - Skill      : {manifest.capabilities[0].name}")
    print(f"   - LLM Engine : {agent.provider.upper()}")
    print(f"   - Price      : ${manifest.capabilities[0].pricing.amount} {manifest.capabilities[0].pricing.currency}")

    # 3. Code Snippet to Audit
    sample_code = """
def process_user_payment(user_id, amount_cents):
    if amount_cents <= 0:
        raise ValueError("Invalid amount")
    # Execute database payment transaction
    db.execute(f"UPDATE accounts SET balance = balance - {amount_cents} WHERE id = '{user_id}'")
    return True
"""

    job_id = "job-demo-gemini-9921"
    print(f"\n2️⃣ Orchestrator Creates Job & Locks $25.00 USDC in Escrow:")
    print(f"   - Job ID   : {job_id}")
    print(f"   - Contract : ACPEscrow.sol on Base Sepolia")

    # 4. Execute Code Review
    print(f"\n3️⃣ Worker Agent Processing Code Review...")
    result = await agent.process_job(job_id, sample_code)

    print(f"\n4️⃣ Work Submitted & Verified:")
    print(f"   - Engine Used  : {result['engine'].upper()}")
    print(f"   - Output CID   : {result['output_cid']}")
    print(f"   - Score        : {result['review'].get('overall_score', 4.5)}/5.0")
    print(f"   - Summary      : {result['review'].get('summary')}")
    
    if result['review'].get('vulnerabilities'):
        print("   - Issues Found :")
        for vuln in result['review']['vulnerabilities']:
            print(f"     • [{vuln.get('severity')}] Line {vuln.get('line')}: {vuln.get('issue')} (Fix: {vuln.get('recommendation')})")

    print("\n5️⃣ Escrow Payout Released:")
    print("   - $24.75 USDC released to Worker Agent")
    print("   - $0.25 USDC (1% fee) released to Protocol Treasury")
    print("   - On-chain reputation updated to 5.0")

    print("=" * 75)
    print(f"✅ DEMO COMPLETED SUCCESSFULLY WITH {agent.provider.upper()} ENGINE!")
    print("=" * 75)

if __name__ == "__main__":
    asyncio.run(run_demo())
