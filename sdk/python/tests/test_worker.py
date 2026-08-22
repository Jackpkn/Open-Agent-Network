"""
Tests for the worker runtime.

These start a real server on a real port. A previous change referenced `os`
inside serve() without importing it, which broke every agent at startup and was
invisible to tests that only built an Agent object.
"""

import json
import socket
import threading
import time
import urllib.error
import urllib.request

import pytest

from open_agent_network import Agent, DataHandling


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def build_agent(**kwargs) -> Agent:
    agent = Agent(name="Test Agent", public_url="http://127.0.0.1:1", **kwargs)

    @agent.task(id="test.task", steps=["one", "two"], price="1.50", result_view="table")
    def handler(ctx):
        return "done"

    return agent


def get_json(url: str, timeout: float = 5.0):
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.load(response)


def test_agent_card_describes_the_declared_skill():
    card = build_agent().agent_card("http://x")
    skill = card["skills"][0]

    assert skill["id"] == "test.task"
    assert skill["steps"] == ["one", "two"]
    assert skill["result_view"] == "table"
    assert card["capabilities"]["oanAsync"] is True
    assert card["protocols"] == ["oan/1"]


def test_data_handling_defaults_to_undeclared():
    assert build_agent().agent_card("http://x")["data_handling"]["retention"] == "undeclared"


def test_data_handling_accepts_a_shorthand_and_rejects_nonsense():
    agent = build_agent(data_handling="delete-on-completion")
    assert agent.agent_card("http://x")["data_handling"]["retention"] == "delete-on-completion"

    with pytest.raises(ValueError):
        DataHandling(retention="whenever-we-feel-like-it")


def test_serve_starts_and_answers():
    """The regression test: serve() must actually run."""
    port = free_port()
    agent = build_agent()
    agent.public_url = f"http://127.0.0.1:{port}"

    thread = threading.Thread(target=agent.serve, kwargs={"port": port}, daemon=True)
    thread.start()

    base = f"http://127.0.0.1:{port}"
    deadline = time.time() + 10
    last_error: Exception | None = None

    while time.time() < deadline:
        try:
            assert get_json(f"{base}/health")["status"] == "ok"
            assert get_json(f"{base}/.well-known/agent-card.json")["name"] == "Test Agent"
            return
        except Exception as err:  # noqa: BLE001 - the server may still be binding
            last_error = err
            time.sleep(0.2)

    raise AssertionError(f"serve() never answered: {last_error}")


def test_a_task_without_a_callback_token_is_refused():
    port = free_port()
    agent = build_agent()
    agent.public_url = f"http://127.0.0.1:{port}"

    threading.Thread(target=agent.serve, kwargs={"port": port}, daemon=True).start()
    time.sleep(1.0)

    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/oan/v1/tasks",
        data=json.dumps({"job_id": "job_1"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with pytest.raises(urllib.error.HTTPError) as excinfo:
        urllib.request.urlopen(request, timeout=5)

    assert excinfo.value.code == 400
