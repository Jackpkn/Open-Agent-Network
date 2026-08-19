"""
A code auditor. Same protocol as the extractor, completely different work.

It declares `result_view="findings"`, so a client renders its output as a
severity-ranked list rather than a table — without knowing this agent exists.
"""

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "sdk" / "python"))

from open_agent_network import Agent, TaskFailure  # noqa: E402

PORT = int(os.environ.get("PORT", "8011"))

agent = Agent(
    name="Static Auditor",
    description="Scans source files for unsafe patterns and returns ranked findings",
    public_url=os.environ.get("PUBLIC_URL", f"http://localhost:{PORT}"),
    # Declared, published on the agent card, and recorded on every receipt.
    # True of this agent: the file is read into memory and never written to disk.
    data_handling={"retention": "delete-on-completion", "training": "never"},
)

# Patterns are all compiled case-insensitively, so none of them carry inline flags.
RULES = [
    ("critical", r"\beval\s*\(", "Use of eval()", "Executes arbitrary code. Parse the value instead."),
    ("critical", r"\bexec\s*\(", "Use of exec()", "Executes arbitrary code at runtime."),
    ("critical", r"(password|api[_-]?key|secret|token)\s*=\s*[\"'][^\"']{6,}[\"']",
     "Hardcoded credential", "Move this into an environment variable or a secret manager."),
    ("high", r"shell\s*=\s*True", "Shell command execution", "Pass an argument list instead of shell=True."),
    ("high", r"os\.(popen|system)\s*\(", "Shell invocation",
     "Use subprocess with an argument list so input cannot become a command."),
    ("high", r"(select|insert|update|delete)\s[^\n]*%s", "String-built SQL",
     "Use parameterised queries so input cannot alter the statement."),
    ("medium", r"except\s*:", "Bare except", "Catch the specific exception you expect."),
    ("medium", r"verify\s*=\s*False", "TLS verification disabled", "Certificate checks are being skipped."),
    ("low", r"\bprint\s*\(", "print() left in source", "Use a logger so output can be controlled."),
]

COMPILED = [(severity, re.compile(pattern, re.IGNORECASE), title, detail)
            for severity, pattern, title, detail in RULES]

RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


@agent.task(
    id="code.audit",
    name="Security audit",
    description="Finds unsafe patterns in a source file and ranks them by severity",
    steps=["read", "scan", "rank"],
    price="1.80",
    tags=["security", "code-review", "static-analysis"],
    result_view="findings",
)
def audit(ctx):
    """Scan a source file and return ranked findings."""
    if ctx.input is None:
        raise TaskFailure("Attach the source file you want audited.", code="bad_input")

    ctx.step("read", progress=0.1, note=ctx.input.filename)
    lines = ctx.input.read_text().splitlines()

    ctx.step("scan", progress=0.4, note=f"scanning {len(lines)} lines against {len(COMPILED)} rules")

    findings = []
    for number, line in enumerate(lines, start=1):
        for severity, pattern, title, detail in COMPILED:
            if pattern.search(line):
                findings.append(
                    {
                        "severity": severity,
                        "title": title,
                        "detail": detail,
                        "location": f"{ctx.input.filename}:{number}",
                        "snippet": line.strip()[:160],
                    }
                )

    ctx.step("rank", progress=0.85, note=f"{len(findings)} findings")
    findings.sort(key=lambda f: (RANK[f["severity"]], f["location"]))

    ctx.emit_text("findings.json", json.dumps(findings, indent=2), mime="application/json")

    if not findings:
        return f"No unsafe patterns found in {ctx.input.filename}."

    worst = findings[0]["severity"]
    return f"{len(findings)} findings in {ctx.input.filename}, worst severity: {worst}."


if __name__ == "__main__":
    agent.serve(port=PORT)
