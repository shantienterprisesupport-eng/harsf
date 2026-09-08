"""HARSF Master AI multi-agent team.

The Master Orchestrator coordinates five specialist agents. The module is intentionally
non-destructive: no filesystem, deployment, secret, database, payment, OTP, or merge
mutation tools are attached here. Protected actions remain behind Human CEO approval.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from praisonaiagents import Agent, Agents


HUMAN_GATE = (
    "Stop and request Human CEO approval before any password, OTP, payment, secret, "
    "credential change, deployment, merge, database migration, destructive action, "
    "permission/access-control change, or irreversible external action. Never expose "
    "or store secrets in output."
)


def load_local_env() -> None:
    """Load .env.local without overwriting environment variables already set."""
    env_file = Path(__file__).resolve().parents[1] / ".env.local"
    if not env_file.exists():
        return

    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and key not in os.environ:
            os.environ[key] = value


def resolve_llm() -> str:
    """Choose the configured HARSF model without ever printing a credential."""
    requested = os.getenv("AI_PROVIDER", "auto").strip().lower()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    if requested in {"anthropic", "claude"}:
        if not anthropic_key:
            raise RuntimeError("ANTHROPIC_API_KEY is missing from .env.local")
        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5").strip()
        return f"anthropic/{model}"

    if requested == "openai":
        if not openai_key:
            raise RuntimeError("OPENAI_API_KEY is missing from .env.local")
        return os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()

    if anthropic_key:
        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5").strip()
        return f"anthropic/{model}"
    if openai_key:
        return os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()

    raise RuntimeError("No AI provider key found. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local")


def build_team() -> Agents:
    llm = resolve_llm()
    common = {
        "llm": llm,
        "output": "status",
        "execution": "balanced",
    }

    workflow = Agent(
        name="n8n Workflow Agent",
        instructions=(
            "Design and review n8n workflows, triggers, retries, webhook contracts, and "
            "credential requirements. Keep credentials out of Git. Diagnose 502/startup "
            "issues from configuration and logs when provided. " + HUMAN_GATE
        ),
        **common,
    )

    coding = Agent(
        name="Coding and GitHub Agent",
        instructions=(
            "Turn approved requirements into small code changes, GitHub-ready patches, "
            "commits, and pull-request notes. Reuse current architecture and avoid broad "
            "rewrites. Do not merge or deploy without approval. " + HUMAN_GATE
        ),
        **common,
    )

    qa = Agent(
        name="Bug Fix and QA Agent",
        instructions=(
            "Find root causes, propose minimal fixes, define regression tests, and verify "
            "acceptance criteria. Never hide failing tests or bypass safeguards. " + HUMAN_GATE
        ),
        **common,
    )

    security = Agent(
        name="Security Agent",
        instructions=(
            "Check secret handling, permissions, public-repo exposure, webhook abuse, "
            "dependency risk, and unsafe automation. Recommend least-privilege fixes. "
            + HUMAN_GATE
        ),
        **common,
    )

    ops = Agent(
        name="Deploy and Ops Agent",
        instructions=(
            "Prepare safe runbooks for local startup, health checks, Docker/n8n runtime, "
            "CI status, rollback, and deployment readiness. Do not deploy or change live "
            "infrastructure without Human CEO approval. " + HUMAN_GATE
        ),
        **common,
    )

    master = Agent(
        name="Master Orchestrator Agent",
        instructions=(
            "Act as the main HARSF coordinator. Understand a Human CEO goal written in "
            "Hindi, Hinglish, Odia, or English. Inspect/reuse existing HARSF, PraisonAI, "
            "Ruflo, n8n, MCP, GitHub, and L GenZ work before suggesting anything new. "
            "Delegate the right parts to specialist agents, combine their results, avoid "
            "unnecessary questions, and finish with concise DONE / DOING / BLOCKED / NEXT. "
            "Never claim an action happened without evidence. " + HUMAN_GATE
        ),
        handoffs=[workflow, coding, qa, security, ops],
        allow_delegation=True,
        planning=True,
        **common,
    )

    return Agents(agents=[master, workflow, coding, qa, security, ops])


def run(goal: str):
    return build_team().start(goal)


def main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser(description="Run the HARSF Master AI Agent")
    parser.add_argument("--goal", help="Human CEO goal")
    args = parser.parse_args()

    goal = (args.goal or input("Human CEO goal: ")).strip()
    if not goal:
        raise SystemExit("A goal is required.")

    try:
        print(run(goal))
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
