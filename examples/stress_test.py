"""
Multi-Agent Execution Stress Test & Latency Benchmark Script
Powered by Open Agent Network (ACP Protocol)
"""

import asyncio
import time
import requests
from typing import Dict, Any, List

API_BASE_URL = "http://localhost:3001"

async def run_single_job_task(job_index: int) -> Dict[str, Any]:
    """Dispatch single A2A job and measure latency."""
    start_time = time.time()
    agent_id = 2 if job_index % 2 == 0 else 15
    skill_id = "code-review" if agent_id == 2 else "security-scan"

    try:
        res = requests.post(
            f"{API_BASE_URL}/api/v1/jobs",
            json={
                "agent_id": agent_id,
                "skill_id": skill_id,
                "task_prompt": f"Stress test parallel audit job #{job_index + 1}",
            },
            timeout=10,
        )
        elapsed = (time.time() - start_time) * 1000
        if res.status_code in [200, 201]:
            return {
                "job_index": job_index + 1,
                "status": "SUCCESS",
                "latency_ms": elapsed,
                "job_id": res.json().get("job", {}).get("id"),
                "amount": res.json().get("job", {}).get("pricing_amount", "25.00"),
            }
        else:
            return {
                "job_index": job_index + 1,
                "status": "FAILED",
                "latency_ms": elapsed,
                "error": res.text,
            }
    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        return {
            "job_index": job_index + 1,
            "status": "FAILED",
            "latency_ms": elapsed,
            "error": str(e),
        }

async def run_stress_test(num_concurrent_jobs: int = 10):
    print("=" * 75)
    print(f"🚀 OPEN AGENT NETWORK — MULTI-AGENT PARALLEL LOAD TEST ({num_concurrent_jobs} JOBS)")
    print("=" * 75)
    print(f"⚡ Launching {num_concurrent_jobs} parallel A2A jobs across agent cluster...")

    start_total = time.time()
    tasks = [run_single_job_task(i) for i in range(num_concurrent_jobs)]
    results = await asyncio.gather(*tasks)
    total_duration = time.time() - start_total

    successes = [r for r in results if r["status"] == "SUCCESS"]
    failures = [r for r in results if r["status"] == "FAILED"]
    latencies = [r["latency_ms"] for r in results]

    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    p95_latency = sorted(latencies)[int(len(latencies) * 0.95) - 1] if latencies else 0
    throughput = len(successes) / total_duration if total_duration > 0 else 0
    total_usdc = sum([float(r.get("amount", "25.00")) for r in successes])

    print("\n===========================================================================")
    print("📊 BENCHMARK PERFORMANCE METRICS SUMMARY")
    print("===========================================================================")
    print(f" Total Jobs Dispatched : {num_concurrent_jobs}")
    print(f" ✅ Successful Jobs    : {len(successes)} ({len(successes)/num_concurrent_jobs*100:.1f}%)")
    print(f" ❌ Failed Jobs        : {len(failures)}")
    print(f" ⏱️ Total Time Elapsed : {total_duration:.2f} s")
    print(f" ⚡ Throughput         : {throughput:.2f} jobs/sec")
    print(f" 🚀 Average Latency    : {avg_latency:.2f} ms")
    print(f" 📈 P95 Latency        : {p95_latency:.2f} ms")
    print(f" 💰 Total Volume Locked: ${total_usdc:.2f} USDC")
    print("===========================================================================\n")

if __name__ == "__main__":
    asyncio.run(run_stress_test(10))
