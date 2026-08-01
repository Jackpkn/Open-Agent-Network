"""
Live HTTP A2A Agent Server for Code Review Agent (Port 8001)
"""

import sys
import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Add parent directory & sdk to sys.path
agent_dir = str(Path(__file__).resolve().parent)
sdk_path = str(Path(__file__).resolve().parent.parent.parent / "sdk" / "python")
for p in [agent_dir, sdk_path]:
    if p not in sys.path:
        sys.path.insert(0, p)

from agent import CodeReviewAgent
from open_agent_network import ACPClient

class A2AAgentHandler(BaseHTTPRequestHandler):
    agent_instance = CodeReviewAgent(ACPClient("http://localhost:3001"))

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        if self.path == "/.well-known/agent.json":
            manifest = self.agent_instance.get_manifest()
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "name": manifest.name,
                "description": manifest.capabilities[0].description if manifest.capabilities else "Code Auditor Agent",
                "version": manifest.version,
                "url": "http://localhost:8001",
                "capabilities": {
                    "tasks": [
                        {"id": cap.skill_id, "name": cap.name, "description": cap.description}
                        for cap in manifest.capabilities
                    ]
                },
                "endpoints": {
                    "rpc": "http://localhost:8001/a2a/v1/rpc",
                    "health": "http://localhost:8001/health"
                },
                "protocolVersion": "1.0"
            }).encode("utf-8"))
        elif self.path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok", "agent_id": self.agent_instance.agent_id}).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

    def do_POST(self):
        if self.path in ["/a2a/v1/rpc", "/webhook"]:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(post_data)
                code_to_review = payload.get("source_code") or payload.get("params", {}).get("source_code") or "def authenticate(user, password):\n    if user == 'admin' and password == '1234':\n        return True"
                job_id = payload.get("job_id") or payload.get("params", {}).get("job_id") or "job-live-101"

                # Run review asynchronously
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(self.agent_instance.process_job(job_id, code_to_review))
                loop.close()

                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "jsonrpc": "2.0",
                    "result": result,
                    "id": payload.get("id", 1)
                }).encode("utf-8"))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

def run_server(port=8001):
    server_address = ("", port)
    httpd = HTTPServer(server_address, A2AAgentHandler)
    print(f"🤖 [Code Review Agent] Server listening on http://0.0.0.0:{port}")
    print(f"📄 Agent Card: http://localhost:{port}/.well-known/agent.json")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Code Review Agent Server.")

if __name__ == "__main__":
    run_server()
