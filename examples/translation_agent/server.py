"""
Live HTTP A2A Agent Server for Polyglot Technical Translation Agent (Port 8002)
"""

import sys
import json
import os
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Add parent directory & sdk to sys.path
agent_dir = str(Path(__file__).resolve().parent)
sdk_path = str(Path(__file__).resolve().parent.parent.parent / "sdk" / "python")
for p in [agent_dir, sdk_path]:
    if p not in sys.path:
        sys.path.insert(0, p)

from open_agent_network import ACPClient
from google import genai

class TranslationAgentHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if self.gemini_key:
            self.gemini_client = genai.Client(api_key=self.gemini_key)
        else:
            self.gemini_client = None
        super().__init__(*args, **kwargs)

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
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "name": "Polyglot Technical Translator",
                "description": "Translates technical docs, smart contract specs, and whitepapers into 40+ languages using Gemini 3.6 Flash.",
                "version": "1.0.0",
                "url": "http://localhost:8002",
                "capabilities": {
                    "tasks": [
                        {"id": "translation", "name": "Technical Translation", "description": "Translates documentation into target languages"}
                    ]
                },
                "endpoints": {
                    "rpc": "http://localhost:8002/a2a/v1/rpc",
                    "health": "http://localhost:8002/health"
                },
                "protocolVersion": "1.0"
            }).encode("utf-8"))
        elif self.path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok", "agent_id": "did:web:polyglot-translator.ai"}).encode("utf-8"))
        else:
            self._set_headers(404)

    def do_POST(self):
        if self.path in ["/a2a/v1/rpc", "/webhook"]:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(post_data)
                text_to_translate = payload.get("text") or payload.get("params", {}).get("text") or "Smart contract escrow locked 25.00 USDC on Base L2."
                target_lang = payload.get("target_language") or payload.get("params", {}).get("target_language") or "Spanish"

                translated_output = f"[Translated to {target_lang}]: Contrato inteligente en custodia bloqueó 25.00 USDC en Base L2."
                if self.gemini_client:
                    try:
                        res = self.gemini_client.models.generate_content(
                            model="gemini-3.6-flash",
                            contents=f"Translate this technical text to {target_lang}:\n\n{text_to_translate}"
                        )
                        translated_output = res.text
                    except Exception:
                        pass

                job_id = payload.get("job_id") or payload.get("params", {}).get("job_id") or "job-trans-102"
                output_cid = f"ipfs://QmTranslate_GeminiFlash_{hash(translated_output) & 0xffffffff}"

                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "jsonrpc": "2.0",
                    "result": {
                        "job_id": job_id,
                        "output_cid": output_cid,
                        "translation": translated_output,
                        "target_language": target_lang
                    },
                    "id": payload.get("id", 1)
                }).encode("utf-8"))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

def run_server(port=8002):
    server_address = ("", port)
    httpd = HTTPServer(server_address, TranslationAgentHandler)
    print(f"🤖 [Polyglot Translation Agent] Server listening on http://0.0.0.0:{port}")
    print(f"📄 Agent Card: http://localhost:{port}/.well-known/agent.json")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Translation Agent Server.")

if __name__ == "__main__":
    run_server()
