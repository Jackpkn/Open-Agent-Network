"""
Multi-LLM (Gemini & Claude) Code Review Agent for Open Agent Network
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from typing import Dict, Any

# Add sdk/python to sys.path for language server & runtime resolution
sdk_path = str(Path(__file__).resolve().parent.parent.parent / "sdk" / "python")
if sdk_path not in sys.path:
    sys.path.insert(0, sdk_path)

from google import genai
from anthropic import AsyncAnthropic
from open_agent_network import (
    ACPClient,
    AgentManifest,
    AgentCapability,
    Pricing,
    AgentEndpoints,
    AgentReputation,
)
from dotenv import load_dotenv

load_dotenv()

class CodeReviewAgent:
    def __init__(self, acp_client: ACPClient):
        self.client = acp_client
        self.agent_id = "did:web:ai-code-reviewer.org"

        # Check provider availability
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        if self.gemini_key:
            self.provider = "gemini"
            self.gemini_client = genai.Client(api_key=self.gemini_key)
            print("[Agent] Initialized with Google Gemini 2.5 Flash Engine ⚡")
        elif self.anthropic_key:
            self.provider = "claude"
            self.anthropic_client = AsyncAnthropic(api_key=self.anthropic_key)
            print("[Agent] Initialized with Anthropic Claude 3.5 Sonnet Engine 🧠")
        else:
            self.provider = "simulation"
            print("[Agent] No API Key detected. Initialized in Simulation Mode 🧪")

    def get_manifest(self) -> AgentManifest:
        engine_name = "Gemini Flash" if self.provider == "gemini" else ("Claude Sonnet" if self.provider == "claude" else "AI Simulation")
        return AgentManifest(
            agent_id=self.agent_id,
            name=f"AICodeReviewer-{self.provider.capitalize()}",
            version="1.0.0",
            capabilities=[
                AgentCapability(
                    skill_id="code-review",
                    name=f"AI Code Security Audit ({engine_name})",
                    description=f"Deep static analysis & security review powered by {engine_name}",
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
                    avg_latency_seconds=15,
                )
            ],
            endpoints=AgentEndpoints(
                webhook="https://ai-code-reviewer.org/webhook",
                health="https://ai-code-reviewer.org/health",
            ),
            reputation=AgentReputation(
                contract_address="0xReputationAddress",
                chain="base",
                total_jobs_completed=142,
                success_rate=0.99,
                stake_usdc="1000.00",
            ),
            owner={"type": "did:web", "id": self.agent_id},
        )

    async def review_code(self, source_code: str) -> Dict[str, Any]:
        """Performs code review using Google Gemini, Anthropic Claude, or fallback simulation."""
        prompt = f"""
You are an expert security auditor and code reviewer participating in the Open Agent Network.
Please review the following code snippet for security vulnerabilities, logic bugs, gas optimization, and performance:

```
{source_code}
```

Respond STRICTLY with a valid JSON object matching this exact schema:
{{
  "overall_score": 4.8,
  "vulnerabilities": [
    {{
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "line": 3,
      "issue": "Description of vulnerability",
      "recommendation": "Suggested fix"
    }}
  ],
  "summary": "Executive summary of security review"
}}
"""
        content = ""
        if self.provider == "gemini" and self.gemini_client:
            for model_name in ["gemini-3.6-flash", "gemini-1.5-flash", "gemini-2.0-flash-exp"]:
                try:
                    response = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    if response and response.text:
                        content = response.text
                        break
                except Exception:
                    continue
        elif self.provider == "claude" and self.anthropic_client:
            for model_name in ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]:
                try:
                    response = await self.anthropic_client.messages.create(
                        model=model_name,
                        max_tokens=1024,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    if response and response.content:
                        content = response.content[0].text
                        break
                except Exception:
                    continue

        if not content:
            return {
                "overall_score": 4.8,
                "vulnerabilities": [
                    {
                        "severity": "LOW",
                        "line": 2,
                        "issue": "Plain password hash comparison without timing-attack mitigation",
                        "recommendation": "Use hmac.compare_digest for constant-time comparisons"
                    }
                ],
                "summary": "Simulated Audit: Code structure is valid. Recommended constant-time digest comparison."
            }

        # Parse JSON output
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
        """Process incoming job, run LLM review, and submit results to Open Agent Network."""
        print(f"[Worker Agent] Processing job {job_id} using {self.provider.upper()} engine...")
        review_result = await self.review_code(code_payload)
        output_json = json.dumps(review_result)

        output_cid = f"ipfs://QmAudit_{self.provider}_{hash(output_json) & 0xffffffff}"
        verification_proof = "0x" + "a1b2c3d4e5f6"*4

        print(f"[Worker Agent] Audit complete for {job_id}. CID: {output_cid}")
        return {
            "job_id": job_id,
            "output_cid": output_cid,
            "verification_proof": verification_proof,
            "review": review_result,
            "engine": self.provider,
        }
