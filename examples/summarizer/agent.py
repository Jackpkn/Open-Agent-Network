"""
A summariser. Third protocol shape: it returns a document, not a table or findings.

Deliberately deterministic — no API key needed — so the demo runs anywhere.
Swap the body for a model call and nothing else changes.
"""

import os
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "sdk" / "python"))

from open_agent_network import Agent, TaskFailure  # noqa: E402

PORT = int(os.environ.get("PORT", "8012"))

agent = Agent(
    name="Brief",
    description="Condenses a long document into a short readable brief",
    public_url=os.environ.get("PUBLIC_URL", f"http://localhost:{PORT}"),
    # Declared, published on the agent card, and recorded on every receipt.
    # True of this agent: the file is read into memory and never written to disk.
    data_handling={"retention": "delete-on-completion", "training": "never"},
)

STOPWORDS = set(
    "the a an and or but if then than that this these those of in on at to for with from by as is "
    "are was were be been being it its it's we you they he she i not no do does did have has had "
    "will would can could should may might must about into over under more most such other".split()
)


@agent.task(
    id="document.summarize",
    name="Summarise",
    description="Produces a short brief with key points from a longer document",
    steps=["read", "rank", "write"],
    price="0.40",
    tags=["documents", "summary", "writing"],
    result_view="document",
)
def summarize(ctx):
    """Condense a document into a markdown brief."""
    if ctx.input is None:
        raise TaskFailure("Attach the document you want summarised.", code="bad_input")

    ctx.step("read", progress=0.15, note=ctx.input.filename)
    text = ctx.input.read_text().strip()
    if len(text) < 80:
        raise TaskFailure("That document is too short to summarise.", code="bad_input")

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 30]
    if not sentences:
        raise TaskFailure("No complete sentences were found in that document.", code="bad_input")

    ctx.step("rank", progress=0.5, note=f"{len(sentences)} sentences")

    words = [w for w in re.findall(r"[a-z']{3,}", text.lower()) if w not in STOPWORDS]
    weights = Counter(words)

    def score(sentence: str) -> float:
        tokens = [w for w in re.findall(r"[a-z']{3,}", sentence.lower()) if w not in STOPWORDS]
        return sum(weights[w] for w in tokens) / (len(tokens) ** 0.5 or 1)

    wanted = max(3, min(6, len(sentences) // 4))
    top = sorted(sorted(sentences, key=score, reverse=True)[:wanted], key=sentences.index)

    ctx.step("write", progress=0.85, note=f"writing {len(top)} key points")

    themes = ", ".join(w for w, _ in weights.most_common(6)) or "none identified"
    brief = "\n".join(
        [
            f"# Brief: {ctx.input.filename}",
            "",
            f"*{len(sentences)} sentences condensed to {len(top)} key points.*",
            "",
            "## Key points",
            "",
            *[f"{i}. {s}" for i, s in enumerate(top, start=1)],
            "",
            "## Recurring themes",
            "",
            themes,
            "",
        ]
    )

    ctx.emit_text("brief.md", brief, mime="text/markdown")
    return f"Condensed {len(sentences)} sentences into {len(top)} key points."


if __name__ == "__main__":
    agent.serve(port=PORT)
