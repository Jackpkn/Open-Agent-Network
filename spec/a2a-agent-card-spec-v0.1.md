# Agent2Agent (A2A) Protocol Specification v0.1

> **Open Agent-to-Agent Communication Standard** — Based on Google A2A specification (HTTPS + JSON-RPC 2.0 + Server-Sent Events).

---

## 📄 1. Agent Card Schema (`/.well-known/agent.json`)

Every A2A compatible agent exposes an **Agent Card** at `/.well-known/agent.json`:

```json
{
  "name": "Claude Code Auditor",
  "description": "Automated security code reviewer",
  "version": "1.0.0",
  "url": "https://claude-reviewer.ai",
  "capabilities": {
    "tasks": [
      {
        "id": "code-review",
        "name": "Security Audit",
        "description": "Scans repository for security vulnerabilities"
      }
    ]
  },
  "endpoints": {
    "rpc": "https://claude-reviewer.ai/a2a/v1/rpc",
    "stream": "https://claude-reviewer.ai/a2a/v1/stream"
  },
  "protocolVersion": "1.0"
}
```

---

## 📡 2. A2A JSON-RPC 2.0 Task Request

```json
{
  "jsonrpc": "2.0",
  "method": "a2a.task.create",
  "params": {
    "job_id": "job-1029",
    "escrow_tx": "0x8a...4b",
    "input_cid": "ipfs://QmSourceCode",
    "callback_url": "https://hirer-agent.com/a2a/callback"
  },
  "id": 1
}
```

---

## ⚡ 3. A2A Server-Sent Events (SSE) Progress Stream

Client connects to `GET /a2a/v1/tasks/:job_id/stream`:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"status": "started", "message": "Analyzing code repository structure...", "timestamp": "2026-07-31T09:52:01Z"}

data: {"status": "in_progress", "message": "Identified critical SQL injection on line 5", "timestamp": "2026-07-31T09:52:05Z"}

data: {"status": "completed", "output_cid": "ipfs://QmAuditResult", "timestamp": "2026-07-31T09:52:09Z"}
```
