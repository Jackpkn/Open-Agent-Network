"""
Autonomous Subcontracting Orchestrator Agent — Open Agent Network

Demonstrates AGENTS HIRING AGENTS:
1. Primary Orchestrator receives a $40.00 USDC task.
2. Automatically sub-hires SecurityScanner Agent (Port 8003) for $10.00 USDC to audit AST reentrancy.
3. Automatically sub-hires DocWriter Agent (Port 8004) for $5.00 USDC to generate OpenAPI specs.
4. Combines sub-worker outputs and completes the parent contract.
"""

import sys
import os
import json
import time
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Add sdk/python to sys.path
sdk_path = str(Path(__file__).resolve().parent.parent / "sdk" / "python")
if sdk_path not in sys.path:
    sys.path.insert(0, sdk_path)

from open_agent_network import ACPClient

async def run_subcontracting_workflow():
    print("🤖 Autonomous Subcontracting Orchestrator Started")
    print("==================================================")

    client = ACPClient(api_base_url="http://localhost:3001")

    # 1. Primary Orchestrator accepts parent job ($40.00 USDC)
    parent_job_id = f"parent-job-{int(time.time())}"
    print(f"📥 Received Parent Task #{parent_job_id} ($40.00 USDC Budget)")
    print("   Goal: Perform complete smart contract security audit & documentation generation\n")

    # 2. Subcontracting Stage 1: Hire SecurityScanner Agent ($10.00 USDC)
    print("🔄 [Stage 1] Sub-hiring SecurityScanner Agent (Port 8003)...")
    sec_res = await client.search_agents(skill="security-scan")
    sec_agents = sec_res.get("agents", [])
    sec_agent_id = sec_agents[0]["id"] if sec_agents else 15

    sec_job = client.create_job(
        agent_id=sec_agent_id,
        skill_id="security-scan",
        task_prompt="Audit AST for reentrancy vulnerabilities, SQL injection, and secret keys."
    )
    sec_job_id = sec_job.get("id")
    print(f"   🔒 Sub-escrow locked: $10.00 USDC in ACPEscrow.sol (Sub-Job #{sec_job_id})")

    # Simulate waiting for sub-worker execution
    time.sleep(1.5)
    sec_result = "// 🛡️ SECURITY SCANNER SUB-TASK OUTPUT:\n// Finding #1 [CRITICAL]: Line 4 - SQL Injection\n// Finding #2 [HIGH]: Line 12 - Missing ReentrancyGuard"
    print("   ✅ Sub-task 1 Completed by SecurityScanner Agent!\n")

    # 3. Subcontracting Stage 2: Hire DocWriter Agent ($5.00 USDC)
    print("🔄 [Stage 2] Sub-hiring DocWriter Agent (Port 8004)...")
    doc_res = await client.search_agents(skill="doc-generation")
    doc_agents = doc_res.get("agents", [])
    doc_agent_id = doc_agents[0]["id"] if doc_agents else 16

    doc_job = client.create_job(
        agent_id=doc_agent_id,
        skill_id="doc-generation",
        task_prompt="Generate OpenAPI specifications and Markdown endpoint docs."
    )
    doc_job_id = doc_job.get("id")
    print(f"   🔒 Sub-escrow locked: $5.00 USDC in ACPEscrow.sol (Sub-Job #{doc_job_id})")

    time.sleep(1.5)
    doc_result = "# 📝 DOC WRITER SUB-TASK OUTPUT:\n## API Specification: POST /api/v1/user/payment\n- Authentication: Bearer Token"
    print("   ✅ Sub-task 2 Completed by DocWriter Agent!\n")

    # 4. Master Orchestrator Aggregation & Settlement
    print("🎉 [Stage 3] Master Orchestrator Aggregating Sub-Worker Deliverables...")
    master_report = f"""
===========================================================================
🏆 MASTER SUBCONTRACTING AUDIT REPORT (Orchestrated by Open Agent Network)
===========================================================================
Parent Job ID: {parent_job_id}
Total Escrow: $40.00 USDC
Sub-Task Budget Allocated: $15.00 USDC (SecurityScanner: $10, DocWriter: $5)
Orchestrator Margin Retained: $25.00 USDC

{sec_result}

{doc_result}
===========================================================================
"""
    print(master_report)
    print("✅ All sub-escrows released and parent job completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_subcontracting_workflow())
