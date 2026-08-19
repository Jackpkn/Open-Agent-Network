"""
A document extraction agent, written against the OAN worker runtime.

This is the whole agent. There is no HTTP server here, no agent card written by
hand, no SSE frames: the runtime publishes the card from the decorator, hands the
handler the hirer's file, keeps the progress bar moving, and settles up.

Run it:

    python examples/document_extractor/agent.py

Then register it with a hub and hire it — see docs/HIRING_QUICKSTART.md.
"""

import csv
import io
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "sdk" / "python"))

from open_agent_network import Agent, TaskFailure  # noqa: E402

PORT = int(os.environ.get("PORT", "8010"))
HUB_URL = os.environ.get("OAN_HUB_URL", "http://localhost:3001")

agent = Agent(
    name="Ledger Extract",
    description="Pulls tables and figures out of documents and returns them as CSV",
    public_url=os.environ.get("PUBLIC_URL", f"http://localhost:{PORT}"),
    # Declared, published on the agent card, and recorded on every receipt.
    # True of this agent: the file is read into memory and never written to disk.
    data_handling={"retention": "delete-on-completion", "training": "never"},
)

# Rows that look like "label ..... 1,234.56" — enough to demonstrate real work
# without pulling in a PDF stack.
ROW = re.compile(r"^(?P<label>[A-Za-z][A-Za-z0-9 ,./&'()-]{2,60}?)[\s.:]{2,}(?P<value>-?[\d,]+(?:\.\d+)?)\s*$")


@agent.task(
    id="document.extract",
    name="Extract tables",
    description="Finds labelled figures in a document and returns them as a CSV table",
    steps=["read", "scan", "emit"],
    price="0.94",
    tags=["documents", "extraction", "csv"],
    result_view="table",
)
def extract(ctx):
    """Turn a document into a CSV of the figures it contains."""
    if ctx.input is None:
        raise TaskFailure("Attach the document you want extracted.", code="bad_input")

    ctx.step("read", progress=0.1, note=f"{ctx.input.filename} ({ctx.input.size_bytes} bytes)")
    text = ctx.input.read_text()
    lines = text.splitlines()

    ctx.step("scan", progress=0.4, note=f"scanning {len(lines)} lines")

    rows = []
    for number, line in enumerate(lines, start=1):
        match = ROW.match(line.strip())
        if match:
            rows.append(
                {
                    "line": number,
                    "label": match.group("label").strip(),
                    "value": match.group("value").replace(",", ""),
                }
            )
        # Report real detail periodically so the hirer sees actual movement.
        if number % 200 == 0:
            ctx.step("scan", progress=0.4 + 0.4 * (number / max(len(lines), 1)),
                     note=f"line {number} of {len(lines)} · {len(rows)} rows so far")

    if not rows:
        raise TaskFailure(
            "No labelled figures were found in this document, so there is nothing to extract.",
            code="bad_input",
        )

    ctx.step("emit", progress=0.9, note=f"writing {len(rows)} rows")

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["line", "label", "value"])
    writer.writeheader()
    writer.writerows(rows)

    ctx.emit_text("tables.csv", buffer.getvalue(), mime="text/csv")
    return f"Extracted {len(rows)} rows from {ctx.input.filename}."


if __name__ == "__main__":
    if os.environ.get("OAN_REGISTER", "").lower() in {"1", "true", "yes"}:
        try:
            agent.register(HUB_URL)
            print(f"[oan] registered with {HUB_URL}")
        except Exception as err:  # noqa: BLE001
            print(f"[oan] could not register with {HUB_URL}: {err}")

    agent.serve(port=PORT)
