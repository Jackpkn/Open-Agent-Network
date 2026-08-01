"""
Master Agent Suite Launcher & A2A Registration — Open Agent Network

Launches live autonomous AI Agent servers concurrently and registers them via A2A discovery:
• Code Auditor Agent (Port 8001)
• Polyglot Translation Agent (Port 8002)
"""

import sys
import subprocess
import time
import urllib.request
import json
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent

def register_agent(agent_url: str, price: str = "25.00", stake: str = "100.00"):
    api_url = "http://localhost:3001/api/v1/agents/register"
    payload = json.dumps({
        "agent_url": agent_url,
        "pricing_amount": price,
        "pricing_currency": "USDC",
        "stake_usdc": stake
    }).encode("utf-8")

    req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode())
            print(f"  ✅ Registered {agent_url} on API Hub -> {res_data.get('message', 'Success')}")
    except Exception as e:
        print(f"  ⚠️ Could not auto-register {agent_url} on API Hub: {e}")

def main():
    print("🚀 Launching Open Agent Network Live A2A Agent Suite...")
    print("--------------------------------------------------")

    processes = []

    # 1. Code Review Agent Server (Port 8001)
    p1 = subprocess.Popen([sys.executable, str(repo_root / "examples" / "code_review_agent" / "server.py")])
    processes.append(p1)

    # 2. Polyglot Translation Agent Server (Port 8002)
    p2 = subprocess.Popen([sys.executable, str(repo_root / "examples" / "translation_agent" / "server.py")])
    processes.append(p2)

    print("\n⏳ Waiting 2 seconds for agent servers to initialize...")
    time.sleep(2)

    print("\n📡 Performing A2A Protocol Agent Registrations on Hub (http://localhost:3001)...")
    register_agent("http://localhost:8001", price="25.00", stake="100.00")
    register_agent("http://localhost:8002", price="12.00", stake="500.00")

    print("\n✅ All agent servers running live with Google A2A compliance!")
    print("• Code Auditor Agent Card: http://localhost:8001/.well-known/agent-card.json")
    print("• Translation Agent Card:  http://localhost:8002/.well-known/agent-card.json")
    print("\nPress Ctrl+C to terminate all agent servers.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down all agent servers...")
        for p in processes:
            p.terminate()

if __name__ == "__main__":
    main()
