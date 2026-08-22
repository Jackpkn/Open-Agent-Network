"""
Worker runtime for the Open Agent Network.

Write a function, get a compliant agent. The runtime owns the wire protocol:
it publishes the agent card, accepts tasks, downloads the hirer's file through
the scoped token it was handed, sends heartbeats so the job never looks hung,
uploads results, and reports completion or failure.

Whatever runs inside the handler is your business — Claude, LangGraph, CrewAI, a
local model, plain Python. The runtime never looks.

    from open_agent_network import Agent

    agent = Agent(name="Ledger Extract")

    @agent.task(id="document.extract", steps=["read", "parse", "emit"], price="0.94")
    def extract(ctx):
        text = ctx.input.read_text()
        ctx.step("parse", progress=0.6, note=f"{len(text)} characters")
        ctx.emit_file("tables.csv", b"row,value\\n1,42\\n", mime="text/csv")
        return "Extracted 1 table."

    agent.serve(port=8080)
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
import time
import traceback
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urlparse

import httpx

__all__ = ["Agent", "TaskContext", "TaskInput", "TaskFailure", "DataHandling"]


# ─── Data handling ──────────────────────────────────────────────────

RETENTION = {"delete-on-completion", "24h", "30d", "indefinite", "undeclared"}
TRAINING = {"never", "may-be-used", "undeclared"}


class DataHandling:
    """
    What an agent says it does with the hirer's file.

    This is a *declaration*, not something the protocol can enforce: once a
    worker downloads a document it can do as it likes with the bytes. What the
    protocol does is publish the claim before anyone hires, and record it on the
    receipt — so an agent that breaks its own stated policy has said so in
    writing, on a job it was paid for.

    Undeclared is the honest default. It is shown to hirers as "not stated",
    which is worse for the agent than saying something modest and true.
    """

    def __init__(
        self,
        retention: str = "undeclared",
        training: str = "undeclared",
        processors: Optional[List[str]] = None,
        region: Optional[str] = None,
    ):
        if retention not in RETENTION:
            raise ValueError(f"retention must be one of {sorted(RETENTION)}, got {retention!r}")
        if training not in TRAINING:
            raise ValueError(f"training must be one of {sorted(TRAINING)}, got {training!r}")

        self.retention = retention
        self.training = training
        self.processors = processors or []
        self.region = region

    @classmethod
    def coerce(cls, value: "DataHandling | dict | str | None") -> "DataHandling":
        if value is None:
            return cls()
        if isinstance(value, DataHandling):
            return value
        if isinstance(value, str):
            return cls(retention=value)
        return cls(**value)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "retention": self.retention,
            "training": self.training,
            "processors": self.processors,
            "region": self.region,
        }


class TaskFailure(Exception):
    """Raise to refund the hirer and record why, instead of failing silently."""

    def __init__(self, message: str, code: str = "agent_error"):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class TaskInput:
    """The file the hirer supplied, reachable only through a scoped, expiring token."""

    artifact_id: str
    filename: str
    mime: str
    size_bytes: int
    sha256: str
    download_url: str
    _cached: Optional[bytes] = field(default=None, repr=False)

    def read_bytes(self) -> bytes:
        """Download and verify the file against the hash the hub recorded."""
        if self._cached is not None:
            return self._cached

        response = httpx.get(self.download_url, timeout=120.0, follow_redirects=True)
        response.raise_for_status()
        data = response.content

        actual = hashlib.sha256(data).hexdigest()
        if actual != self.sha256:
            raise TaskFailure(
                f"Downloaded file does not match its recorded hash "
                f"(expected {self.sha256[:12]}..., got {actual[:12]}...).",
                code="bad_input",
            )

        self._cached = data
        return data

    def read_text(self, encoding: str = "utf-8") -> str:
        return self.read_bytes().decode(encoding, errors="replace")

    def save(self, path: str) -> str:
        with open(path, "wb") as handle:
            handle.write(self.read_bytes())
        return path


class TaskContext:
    """Everything the handler needs, and the only way it talks back to the hub."""

    def __init__(self, envelope: Dict[str, Any]):
        self._envelope = envelope
        callback = envelope.get("callback", {})

        self.job_id: str = envelope.get("job_id", "")
        self.skill_id: str = envelope.get("skill_id", "")
        self.instructions: str = envelope.get("instructions", "")
        self.params: Dict[str, Any] = envelope.get("params") or {}
        self.steps: List[str] = envelope.get("steps") or []
        self.deadline_at: Optional[str] = envelope.get("deadline_at")
        self.budget: Dict[str, Any] = envelope.get("budget") or {}
        self.escrow: Dict[str, Any] = envelope.get("escrow") or {}

        self._token: str = callback.get("token", "")
        self._events_url: str = callback.get("events_url", "")
        self._complete_url: str = callback.get("complete_url", "")
        self._fail_url: str = callback.get("fail_url", "")

        output = envelope.get("output") or {}
        self._upload_url: str = output.get("upload_url", "")
        self._upload_token: str = output.get("upload_token", "")

        raw_input = envelope.get("input")
        self.input: Optional[TaskInput] = (
            TaskInput(
                artifact_id=raw_input["id"],
                filename=raw_input.get("filename", "input"),
                mime=raw_input.get("mime", "application/octet-stream"),
                size_bytes=raw_input.get("size_bytes", 0),
                sha256=raw_input.get("sha256", ""),
                download_url=raw_input["download_url"],
            )
            if raw_input
            else None
        )

        self.heartbeat_interval: float = float(envelope.get("heartbeat_interval_s") or 10)
        self._emitted: List[str] = []
        self._closed = False

    # ── reporting back ────────────────────────────────────────────────

    def step(self, name: str, progress: Optional[float] = None, note: Optional[str] = None) -> None:
        """
        Report which step you are on.

        This is what the hirer's progress bar is made of, and it doubles as the
        heartbeat that keeps the job out of `stalled`.
        """
        self._post(self._events_url, {"type": "step", "step": name, "progress": progress, "note": note})

    def log(self, note: str) -> None:
        """Attach a line to the job's event log without changing the step."""
        self._post(self._events_url, {"type": "log", "note": note})

    def emit_file(self, filename: str, data: bytes, mime: str = "application/octet-stream") -> str:
        """Upload a result file. Returns the artifact id the hub assigned."""
        if not self._upload_url:
            raise TaskFailure("This task did not come with an upload destination.")

        response = httpx.post(
            self._upload_url,
            params={"token": self._upload_token},
            content=data,
            headers={"Content-Type": mime, "X-Filename": filename},
            timeout=120.0,
        )
        response.raise_for_status()

        artifact_id = response.json()["artifact"]["id"]
        self._emitted.append(artifact_id)
        return artifact_id

    def emit_text(self, filename: str, text: str, mime: str = "text/plain") -> str:
        return self.emit_file(filename, text.encode("utf-8"), mime=mime)

    def complete(self, result_text: Optional[str] = None, summary: str = "Completed") -> None:
        """Hand the job to the hub's verification gate. Does not release money by itself."""
        if self._closed:
            return
        self._closed = True
        self._post(
            self._complete_url,
            {"output_artifact_ids": self._emitted, "result_text": result_text, "summary": summary},
        )

    def fail(self, message: str, code: str = "agent_error") -> None:
        """
        Say you could not do it. The hirer is refunded.

        Reporting honestly is always better than going quiet: silence costs the
        hirer a stall timeout and counts against you the same way.
        """
        if self._closed:
            return
        self._closed = True
        self._post(self._fail_url, {"code": code, "message": message})

    # ── internals ─────────────────────────────────────────────────────

    def _heartbeat(self) -> None:
        self._post(self._events_url, {"type": "heartbeat"}, quiet=True)

    def _post(self, url: str, payload: Dict[str, Any], quiet: bool = False) -> None:
        if not url:
            return
        try:
            httpx.post(
                url,
                json={k: v for k, v in payload.items() if v is not None},
                headers={"Authorization": f"Bearer {self._token}"},
                timeout=30.0,
            )
        except Exception as err:  # noqa: BLE001 - a failed report must not kill the work
            if not quiet:
                print(f"[oan] could not reach the hub at {url}: {err}")


@dataclass
class _Task:
    id: str
    name: str
    description: str
    steps: List[str]
    price: str
    handler: Callable[[TaskContext], Any]
    tags: List[str]
    result_view: str


class Agent:
    """An OAN-compliant agent server built from decorated functions."""

    def __init__(
        self,
        name: str,
        description: str = "",
        version: str = "1.0.0",
        public_url: Optional[str] = None,
        data_handling: "DataHandling | dict | str | None" = None,
    ):
        self.name = name
        self.description = description or f"{name} agent"
        self.version = version
        self.public_url = public_url
        self.data_handling = DataHandling.coerce(data_handling)
        self._tasks: Dict[str, _Task] = {}

    def task(
        self,
        id: str,
        name: Optional[str] = None,
        description: str = "",
        steps: Optional[List[str]] = None,
        price: str = "1.00",
        tags: Optional[List[str]] = None,
        result_view: str = "files",
    ):
        """
        Register a skill.

        `steps` become the hirer's progress bar. `result_view` tells a client how
        to render output it has never seen before — one of "table", "findings",
        "document", "text" or "files". A client needs a renderer per shape, never
        per agent, which is what lets agents doing wildly different jobs share one
        interface.
        """

        def decorator(handler: Callable[[TaskContext], Any]):
            self._tasks[id] = _Task(
                id=id,
                name=name or id,
                description=description or handler.__doc__ or id,
                steps=steps or [],
                price=price,
                handler=handler,
                tags=tags or [],
                result_view=result_view,
            )
            return handler

        return decorator

    # ── the agent card ────────────────────────────────────────────────

    def agent_card(self, base_url: str) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "url": self.public_url or base_url,
            "version": self.version,
            "protocols": ["oan/1"],
            "capabilities": {
                "streaming": True,
                "oanAsync": True,
                "stateTransitionHistory": True,
            },
            "data_handling": self.data_handling.to_dict(),
            "skills": [
                {
                    "id": task.id,
                    "name": task.name,
                    "description": task.description,
                    "tags": task.tags,
                    "steps": task.steps,
                    "result_view": task.result_view,
                    "pricing": {"amount": task.price, "currency": "USDC"},
                }
                for task in self._tasks.values()
            ],
            "defaultInputModes": ["application/json", "text/plain"],
            "defaultOutputModes": ["application/json", "text/plain"],
        }

    def register(self, hub_url: str, price: Optional[str] = None) -> Dict[str, Any]:
        """Announce this agent to a hub so hirers can find it."""
        if not self.public_url:
            raise ValueError("Set public_url so the hub knows where to reach this agent.")

        first_price = price or next(iter(self._tasks.values())).price
        response = httpx.post(
            f"{hub_url.rstrip('/')}/api/v1/agents/register",
            json={"agent_url": self.public_url, "pricing_amount": first_price},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    def _register_when_reachable(self, hub_url: str, attempts: int = 30) -> None:
        """
        Keep trying to register in the background.

        Under an orchestrator the hub and its agents start in whatever order they
        like, so a single attempt at boot loses the race about half the time. The
        hub must also be able to fetch this agent's card, which means this agent
        has to be listening first — hence registering after serve() starts.
        """
        for attempt in range(attempts):
            try:
                result = self.register(hub_url)
                key = result.get("payout_key")
                print(f"[oan] registered with {hub_url}")
                if key:
                    print(f"[oan] payout key (shown once, needed to withdraw earnings): {key}")
                return
            except Exception as err:  # noqa: BLE001 - the hub may not be up yet
                if attempt == attempts - 1:
                    print(f"[oan] could not register with {hub_url}: {err}")
                    return
                time.sleep(min(2 + attempt, 10))

    # ── running a task ────────────────────────────────────────────────

    def _run(self, envelope: Dict[str, Any]) -> None:
        ctx = TaskContext(envelope)
        task = self._tasks.get(ctx.skill_id) or next(iter(self._tasks.values()), None)

        if task is None:
            ctx.fail(f"This agent has no skill called {ctx.skill_id}.", code="bad_input")
            return

        stop = threading.Event()

        def beat() -> None:
            while not stop.wait(ctx.heartbeat_interval):
                ctx._heartbeat()

        heart = threading.Thread(target=beat, daemon=True)
        heart.start()

        try:
            result = task.handler(ctx)
            if not ctx._closed:
                ctx.complete(result if isinstance(result, str) else None)
        except TaskFailure as failure:
            ctx.fail(failure.message, code=failure.code)
        except Exception as err:  # noqa: BLE001 - never leave a job hanging
            traceback.print_exc()
            ctx.fail(f"{type(err).__name__}: {err}")
        finally:
            stop.set()

    # ── HTTP ──────────────────────────────────────────────────────────

    def serve(
        self,
        port: int = 8080,
        host: str = "0.0.0.0",
        register_with: Optional[str] = None,
    ) -> None:
        """
        Start serving. Pass `register_with` (or set OAN_HUB_URL) to announce this
        agent to a hub once it is listening.
        """
        agent = self
        hub_url = register_with or os.environ.get("OAN_HUB_URL")

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, *args: Any) -> None:
                pass

            def _send(self, status: int, body: Dict[str, Any]) -> None:
                payload = json.dumps(body).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(payload)

            def _base_url(self) -> str:
                return f"http://{self.headers.get('Host', f'localhost:{port}')}"

            def do_OPTIONS(self) -> None:  # noqa: N802
                self._send(200, {})

            def do_GET(self) -> None:  # noqa: N802
                path = urlparse(self.path).path
                if path == "/.well-known/agent-card.json":
                    self._send(200, agent.agent_card(self._base_url()))
                elif path == "/health":
                    self._send(200, {"status": "ok", "agent": agent.name, "protocol": "oan/1"})
                else:
                    self._send(404, {"error": "not_found"})

            def do_POST(self) -> None:  # noqa: N802
                path = urlparse(self.path).path
                if path != "/oan/v1/tasks":
                    self._send(404, {"error": "not_found"})
                    return

                length = int(self.headers.get("Content-Length", 0))
                try:
                    envelope = json.loads(self.rfile.read(length) or b"{}")
                except json.JSONDecodeError:
                    self._send(400, {"error": "invalid_json"})
                    return

                if not envelope.get("job_id") or not envelope.get("callback", {}).get("token"):
                    self._send(400, {"error": "invalid_task", "message": "Missing job_id or callback token."})
                    return

                # Acknowledge immediately; the work happens on its own thread.
                self._send(202, {"accepted": True, "job_id": envelope["job_id"]})
                threading.Thread(target=agent._run, args=(envelope,), daemon=True).start()

        server = ThreadingHTTPServer((host, port), Handler)
        skills = ", ".join(self._tasks) or "none"
        print(f"[oan] {self.name} listening on http://{host}:{port}  (skills: {skills})")

        if hub_url:
            if not self.public_url:
                print("[oan] OAN_HUB_URL is set but public_url is not — skipping registration.")
            else:
                print(f"[oan] registering at {hub_url} as {self.public_url}")
                threading.Thread(
                    target=self._register_when_reachable, args=(hub_url,), daemon=True
                ).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[oan] shutting down")
            server.shutdown()
