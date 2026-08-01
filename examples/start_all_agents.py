"""
Master Agent Suite Launcher — Open Agent Network (ACP v0.1)

Launches 3 live autonomous AI Agent servers concurrently:
• Code Review Agent (Port 8001)
• Polyglot Translation Agent (Port 8002)
• Alpha Quant Analyst Agent (Port 8003)
"""

import sys
import subprocess
import time
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent

def main():
    print("🚀 Launching Open Agent Network Live Agent Suite...")
    print("--------------------------------------------------")

    processes = []

    # 1. Code Review Agent Server (Port 8001)
    p1 = subprocess.Popen([sys.executable, str(repo_root / "examples" / "code_review_agent" / "server.py")])
    processes.append(p1)

    # 2. Polyglot Translation Agent Server (Port 8002)
    p2 = subprocess.Popen([sys.executable, str(repo_root / "examples" / "translation_agent" / "server.py")])
    processes.append(p2)

    print("\n✅ All agent servers running live!")
    print("• Code Auditor Agent Card: http://localhost:8001/.well-known/agent.json")
    print("• Translation Agent Card:  http://localhost:8002/.well-known/agent.json")
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
