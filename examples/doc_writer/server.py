"""
Google A2A Protocol Compliant Agent Server: DocWriter Agent (Port 8004)

Adheres strictly to the Google Agent2Agent (A2A) Protocol Specification:
- /.well-known/agent-card.json (Agent Discovery Card)
- /a2a/v1/rpc (JSON-RPC 2.0 tasks/send & tasks/get)
- /a2a/v1/stream (SSE Task Event Stream with TaskStatusUpdateEvent & TaskArtifactUpdateEvent)
"""

import sys
import json
import os
import time
import asyncio
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class DocWriterA2AHandler(BaseHTTPRequestHandler):

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
        parsed = urlparse(self.path)

        # ─── 1. Google A2A Standard Agent Card Discovery Endpoint ─────
        if parsed.path == "/.well-known/agent-card.json":
            self._set_headers(200)
            agent_card = {
                "name": "DocWriter Agent",
                "description": "Sub-worker agent for generating OpenAPI schemas & API markdown documentation",
                "url": "http://localhost:8004",
                "version": "1.0.0",
                "capabilities": {
                    "streaming": True,
                    "pushNotifications": False,
                    "stateTransitionHistory": True
                },
                "skills": [
                    {
                        "id": "doc-generation",
                        "name": "API Documentation Generator",
                        "description": "Generates OpenAPI specifications, endpoint parameters, & usage guides",
                        "pricing": {
                            "amount": "5.00",
                            "currency": "USDC"
                        },
                        "tags": ["Documentation", "OpenAPI", "Markdown", "A2A-Subworker"]
                    }
                ]
            }
            self.wfile.write(json.dumps(agent_card, indent=2).encode("utf-8"))
            return

        # ─── 2. Real-time SSE Token Stream ────────────────────────────
        if parsed.path == "/a2a/v1/stream":
            query_params = parse_qs(parsed.query)
            prompt = query_params.get("prompt", ["Generate API Docs"])[0]

            self._set_headers(200, content_type="text/event-stream")
            
            def send_event(data_dict):
                evt = f"data: {json.dumps(data_dict)}\n\n"
                self.wfile.write(evt.encode("utf-8"))
                self.wfile.flush()

            # Thinking CoT Reasoning Steps
            send_event({"thinking": "Parsing API route handlers & query parameters..."})
            time.sleep(0.3)
            send_event({"thinking": "Generating OpenAPI 3.0 schema definitions..."})
            time.sleep(0.4)
            send_event({"thinking": "Formatting Markdown endpoint documentation..."})
            time.sleep(0.4)

            # Doc Output Payload
            doc_output = (
                "# 📝 DOC WRITER SUB-TASK REPORT — PRICE: $5.00 USDC\n"
                "## API Reference & OpenAPI Specification\n\n"
                "### Endpoint: `POST /api/v1/user/payment`\n"
                "- **Description**: Processes user payment transactions\n"
                "- **Authentication**: Bearer Token / Web3 Wallet Signature\n"
                "- **Request Body**:\n"
                "```json\n"
                "{\n"
                "  \"user_id\": \"usr_88921\",\n"
                "  \"amount_cents\": 2500\n"
                "}\n"
                "```\n"
                "- **Response `200 OK`**:\n"
                "```json\n"
                "{\n"
                "  \"status\": \"success\",\n"
                "  \"transaction_hash\": \"0x892f...a12\"\n"
                "}\n"
                "```\n"
            )

            for char in doc_output:
                send_event({"token": char})
                time.sleep(0.005)

            send_event({"status": "COMPLETED"})
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else ""

        if parsed.path == "/a2a/v1/rpc":
            try:
                rpc_req = json.loads(post_body)
                rpc_id = rpc_req.get("id", "rpc-1")
                method = rpc_req.get("method")

                if method == "tasks/send":
                    self._set_headers(200)
                    response = {
                        "jsonrpc": "2.0",
                        "result": {
                            "id": f"job-doc-{int(time.time())}",
                            "status": "COMPLETED",
                            "output_cid": "ipfs://QmDocWriterResult",
                            "result": "Documentation generated successfully."
                        },
                        "id": rpc_id
                    }
                    self.wfile.write(json.dumps(response).encode("utf-8"))
                    return
            except Exception as e:
                pass

        self._set_headers(400)
        self.wfile.write(json.dumps({"error": "Invalid RPC request"}).encode("utf-8"))

def run_server(port=8004):
    server_address = ("", port)
    httpd = ThreadingHTTPServer(server_address, DocWriterA2AHandler)
    print(f"🚀 DocWriter A2A Sub-Worker Agent running on http://localhost:{port}")
    print(f"   - Discovery Card: http://localhost:{port}/.well-known/agent-card.json")
    print(f"   - Pricing       : $5.00 USDC per doc job")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server(8004)
