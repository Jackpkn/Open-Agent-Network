"""
Claude-Powered Code Review Agent for Open Agent Network
"""

import os
import json
import asyncio
from typing import Dict, Any
from anthropic import AsyncAnthropic
from open_agent_network import (
    ACPClient,
    AgentManifest,
    AgentCapability,
    Pricing,
    AgentEndpoints,
    AgentReputation,
)

class ClaudeCodeReviewAgent:
    def __init__(self, acp_client: ACPClient, anthropic_api_key: str = None):
        self.client = acp_client
        self.anthropic = AsyncAnthropic(api_key=anthropic_api_key or os.getenv("ANTHROPIC_API_KEY"))
        self.agent_id = "did:web:claude-code-reviewer.ai"

    def get_manifest(self) -> AgentManifest:
        return AgentManifest(
            agent_id=self.agent_id,
            name="ClaudeCodeReviewer",
            version="1.0.0",
            capabilities=[
                AgentCapability(
                    skill_id="code-review",
                    name="Claude Code Security Audit",
                    description="Deep static analysis & security review powered by Anthropic Claude 3.5 Sonnet",
                    input_schema="https://schemas.agent-commerce.org/code-review-input.json",
                    output_schema="https://schemas.agent-commerce.org/code-review-output.json",
                    pricing=Pricing(
                        model="fixed",
                        amount="25.00",
                        currency="USDC",
                        chain="base",
                    ),
                    verification_method="ci_pass",
                    tee_required=False,
                    avg_latency_seconds=30,
                )
            ],
            endpoints=AgentEndpoints(
                webhook="https://claude-reviewer.ai/webhook",
                health="https://claude-reviewer.ai/health",
            ),
            reputation=AgentReputation(
                contract_address="0xReputationAddress",
                chain="base",
                total_jobs_completed=120,
                success_rate=0.99,
                stake_usdc="1000.00",
            ),
            owner={"type": "did:web", "id": self.agent_id},
        )

    async def review_code(self, source_code: str) -> Dict[str, Any]:
        """Performs automated code review using Anthropic's Claude API."""
        prompt = f"""
You are an expert security auditor and code reviewer participating in the Open Agent Network.
Please review the following code snippet for security vulnerabilities, logic bugs, gas optimization, and performance:

```
{source_code}
```

Respond with a valid JSON object matching this schema:
{{
  "overall_score": 4.8,
  "vulnerabilities": [
    {{
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "line": 12,
      "issue": "Description of issue",
      "recommendation": "Fix recommendation"
    }}
  ],
  "summary": "Executive summary of review"
}}
"""
        response = await self.anthropic.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text
        # Parse JSON output from Claude
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                return json.loads(content[start_idx:end_idx])
        except Exception:
            pass

        return {
            "overall_score": 4.5,
            "vulnerabilities": [],
            "summary": content,
        }

    async def process_job(self, job_id: str, code_payload: str) -> Dict[str, Any]:
        """Process incoming job, run Claude review, and submit results to Open Agent Network."""
        print(f"[Claude Agent] Starting job {job_id}...")
        review_result = await self.review_code(code_payload)
        output_json = json.dumps(review_result)
        
        # Output hash / IPFS CID simulation
        output_cid = f"ipfs://QmClaudeReview_{hash(output_json) & 0xffffffff}"
        verification_proof = "0x" + "a1b2c3d4e5f6"*4

        print(f"[Claude Agent] Completed review for {job_id}. CID: {output_cid}")
        return {
            "job_id": job_id,
            "output_cid": output_cid,
            "verification_proof": verification_proof,
            "review": review_result,
        }
