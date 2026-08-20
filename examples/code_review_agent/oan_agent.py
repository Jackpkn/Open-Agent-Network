"""
The Gemini/Claude code reviewer, ported to the OAN worker runtime.

Same brain as `agent.py`. What disappears is all the plumbing: no hand-written
HTTP server, no agent card written as a JSON literal, no manually formatted SSE
frames. The runtime publishes the card from the decorator, hands over the
hirer's file, keeps the progress bar moving while the model thinks, uploads the
findings and settles up.

    GEMINI_API_KEY=... python examples/code_review_agent/oan_agent.py

Compare with server.py, which hand-rolls the transport for the same work.

One operational note worth knowing before you hire this: language models
sometimes decline to review a file, particularly one that reads as a catalogue of
exploits rather than as real code. When that happens the agent reports an honest
failure and the hirer is refunded — it does not invent findings to have something
to return. The refusal text is included in the failure message so the hirer can
see exactly what happened.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "sdk" / "python"))

from dotenv import load_dotenv  # noqa: E402

from open_agent_network import Agent, TaskFailure  # noqa: E402

load_dotenv()

PORT = int(os.environ.get("PORT", "8013"))

# Models are billed per token and rate limited, so cap what we will send.
MAX_SOURCE_CHARS = 60_000

GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")

if GEMINI_KEY:
    PROVIDER, PROCESSOR, ENGINE = "gemini", "google-gemini", "Gemini Flash"
elif ANTHROPIC_KEY:
    PROVIDER, PROCESSOR, ENGINE = "anthropic", "anthropic", "Claude Sonnet"
else:
    raise SystemExit(
        "Set GEMINI_API_KEY or ANTHROPIC_API_KEY before starting this agent.\n"
        "It refuses to run without one rather than returning invented findings."
    )

agent = Agent(
    name=f"AI Code Auditor ({ENGINE})",
    description="Reviews a source file with a language model and returns ranked findings",
    public_url=os.environ.get("PUBLIC_URL", f"http://localhost:{PORT}"),
    # This agent sends the hirer's file to a third party, and says so. Retention
    # is true of this process; training is left undeclared because whether the
    # provider trains on API traffic depends on their tier, and claiming "never"
    # on someone else's behalf would be exactly the promise nobody can keep.
    data_handling={
        "retention": "delete-on-completion",
        "training": "undeclared",
        "processors": [PROCESSOR],
    },
)

PROMPT = """You are a defensive software engineering assistant. A developer is
auditing their own source file so they can fix its weaknesses before release.

Review the file below for input validation gaps, unsafe API usage, secret
handling mistakes, and logic errors, and describe how to remediate each one.

FILENAME: {filename}

```
{source}
```

Respond with ONLY a JSON object, no prose and no code fence:
{{
  "summary": "one sentence on the overall state of this file",
  "score": 4.2,
  "findings": [
    {{
      "severity": "critical|high|medium|low",
      "title": "short name for the weakness",
      "detail": "what is weak and the concrete fix to apply",
      "line": 12
    }}
  ]
}}

Return an empty findings array if the file is genuinely sound. Do not invent
problems to appear thorough."""

SEVERITIES = ("critical", "high", "medium", "low")
RANK = {name: index for index, name in enumerate(SEVERITIES)}


def call_model(prompt: str) -> str:
    """Ask whichever provider is configured. Raises if none of them answer."""
    errors: List[str] = []

    if PROVIDER == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_KEY)
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=1024)
        )
        for model in ("gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"):
            try:
                response = client.models.generate_content(
                    model=model, contents=prompt, config=config
                )
                if response and response.text:
                    return response.text
            except Exception as err:  # noqa: BLE001 - try the next model
                errors.append(f"{model}: {err}")
    else:
        from anthropic import Anthropic

        client = Anthropic(api_key=ANTHROPIC_KEY)
        for model in ("claude-sonnet-5", "claude-haiku-4-5-20251001"):
            try:
                response = client.messages.create(
                    model=model,
                    max_tokens=2048,
                    messages=[{"role": "user", "content": prompt}],
                )
                text = "".join(
                    block.text for block in response.content if getattr(block, "type", None) == "text"
                )
                if text:
                    return text
            except Exception as err:  # noqa: BLE001 - try the next model
                errors.append(f"{model}: {err}")

    raise TaskFailure(
        "The review model could not be reached. " + " | ".join(errors[:2]),
        code="transient",
    )


def parse_review(raw: str) -> Dict[str, Any]:
    """
    Pull the JSON object out of the model's reply.

    Unparseable output is a failure, not a result. The original agent fell back
    to returning score 3.0 with an empty findings list, which would bill a hirer
    for an audit that never happened.
    """
    start, end = raw.find("{"), raw.rfind("}") + 1
    if start == -1 or end <= start:
        excerpt = " ".join(raw.split())[:200] or "(empty response)"
        declined = any(
            phrase in raw.lower()
            for phrase in ("cannot fulfill", "i can't help", "i cannot help", "unable to assist", "i'm sorry")
        )
        raise TaskFailure(
            (
                f"The review model declined to review this file: {excerpt}"
                if declined
                else f"The review model returned no JSON. It said: {excerpt}"
            ),
            code="agent_error",
        )

    try:
        parsed = json.loads(raw[start:end])
    except json.JSONDecodeError as err:
        excerpt = " ".join(raw[start:end].split())[:200]
        raise TaskFailure(
            f"The review model returned malformed JSON ({err.msg}): {excerpt}",
            code="agent_error",
        ) from err

    if not isinstance(parsed, dict) or not isinstance(parsed.get("findings"), list):
        raise TaskFailure("The review model returned an unexpected shape.", code="agent_error")

    return parsed


def normalize(findings: List[Any], filename: str) -> List[Dict[str, Any]]:
    """Model output is untrusted text — coerce it into the shape clients render."""
    cleaned: List[Dict[str, Any]] = []

    for item in findings:
        if not isinstance(item, dict):
            continue

        severity = str(item.get("severity", "")).strip().lower()
        if severity not in RANK:
            severity = "medium"

        title = str(item.get("title") or "Unnamed finding").strip()[:120]
        detail = str(item.get("detail") or "").strip()[:600]
        line = item.get("line")
        location = f"{filename}:{line}" if isinstance(line, int) and line > 0 else filename

        cleaned.append(
            {"severity": severity, "title": title, "detail": detail, "location": location}
        )

    cleaned.sort(key=lambda f: (RANK[f["severity"]], f["location"]))
    return cleaned


@agent.task(
    id="code.review",
    name="AI security review",
    description=f"Reviews a source file with {ENGINE} and returns findings ranked by severity",
    steps=["read", "analyze", "rank", "emit"],
    price="1.80",
    tags=["security", "code-review", "ai", PROVIDER],
    result_view="findings",
)
def review(ctx):
    """Review a source file and return ranked findings."""
    if ctx.input is None:
        raise TaskFailure("Attach the source file you want reviewed.", code="bad_input")

    ctx.step("read", progress=0.1, note=f"{ctx.input.filename} · {ctx.input.size_bytes} bytes")
    source = ctx.input.read_text()

    if not source.strip():
        raise TaskFailure("That file is empty, so there is nothing to review.", code="bad_input")
    if len(source) > MAX_SOURCE_CHARS:
        raise TaskFailure(
            f"That file is {len(source):,} characters. This agent reviews up to "
            f"{MAX_SOURCE_CHARS:,} — split it and hire once per part.",
            code="bad_input",
        )

    # The model call is the slow part. The runtime heartbeats underneath it, so
    # the hirer sees a job that is working rather than one that has hung.
    ctx.step("analyze", progress=0.35, note=f"asking {ENGINE} about {len(source.splitlines())} lines")
    raw = call_model(PROMPT.format(filename=ctx.input.filename, source=source))

    ctx.step("rank", progress=0.8, note="sorting by severity")
    parsed = parse_review(raw)
    findings = normalize(parsed["findings"], ctx.input.filename)

    ctx.step("emit", progress=0.92, note=f"writing {len(findings)} findings")
    ctx.emit_text("findings.json", json.dumps(findings, indent=2), mime="application/json")

    if not findings:
        return f"No issues found in {ctx.input.filename}."

    counts = {s: sum(1 for f in findings if f["severity"] == s) for s in SEVERITIES}
    breakdown = ", ".join(f"{n} {s}" for s, n in counts.items() if n)
    return f"{len(findings)} findings in {ctx.input.filename} ({breakdown})."


if __name__ == "__main__":
    print(f"[oan] provider: {PROVIDER} · data sent to: {PROCESSOR}")
    agent.serve(port=PORT)
