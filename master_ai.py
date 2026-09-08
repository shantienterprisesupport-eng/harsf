from __future__ import annotations

import argparse
import os
from pathlib import Path

from praisonaiagents import Agent, Agents

HUMAN_GATE = (
    "Stop and request explicit Human CEO approval before any password, OTP, payment, secret, "
    "credential change, deployment, merge, database migration, destructive action, permission/access-control "
    "change, or irreversible external action. Never expose secrets in output. Never claim an action happened "
    "without evidence."
)


def load_local_env() -> None:
    env_file = Path(__file__).resolve().parent / ".env.local"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if key and value and key not in os.environ:
            os.environ[key] = value


def resolve_llm() -> str:
    provider = os.getenv("AI_PROVIDER", "anthropic").strip().lower()
    if provider in {"anthropic", "claude"}:
        if not os.getenv("ANTHROPIC_API_KEY", "").strip():
            raise RuntimeError("ANTHROPIC_API_KEY is missing from .env.local")
        model = os.getenv("ANTHROPIC_MODEL", "").strip()
        if not model:
            raise RuntimeError("ANTHROPIC_MODEL is missing from .env.local")
        return f"anthropic/{model}"
    if provider == "openai":
        if not os.getenv("OPENAI_API_KEY", "").strip():
            raise RuntimeError("OPENAI_API_KEY is missing from .env.local")
        model = os.getenv("OPENAI_MODEL", "").strip()
        if not model:
            raise RuntimeError("OPENAI_MODEL is missing from .env.local")
        return model
    raise RuntimeError(f"Unsupported AI_PROVIDER: {provider}")


def build_team() -> Agents:
    llm = resolve_llm()
    common = {"llm": llm, "output": "status", "execution": "balanced"}

    coding = Agent(
        name="Coding and GitHub Agent",
        instructions=(
            "Turn approved goals into small code changes, GitHub-ready patches, commits and PR notes. "
            "Prefer existing architecture. Do not merge or deploy without approval. " + HUMAN_GATE
        ),
        **common,
    )
    workflow = Agent(
        name="Automation Agent",
        instructions=(
            "Design n8n/Ruflo/MCP workflows, triggers, retries, webhooks and API integration plans. "
            "Keep credentials out of Git and use least privilege. " + HUMAN_GATE
        ),
        **common,
    )
    qa = Agent(
        name="QA and Bug Fix Agent",
        instructions=(
            "Find root causes, propose minimal fixes, define regression tests and verify acceptance criteria. "
            "Never hide failing tests or bypass safeguards. " + HUMAN_GATE
        ),
        **common,
    )
    security = Agent(
        name="Security Agent",
        instructions=(
            "Check secret handling, permissions, public-repo exposure, unsafe automation and dependency risk. "
            "Recommend least-privilege fixes. " + HUMAN_GATE
        ),
        **common,
    )
    ops = Agent(
        name="Ops Agent",
        instructions=(
            "Prepare safe local startup, health-check, CI, rollback and deployment-readiness steps. "
            "Do not deploy or change live infrastructure without approval. " + HUMAN_GATE
        ),
        **common,
    )
    master = Agent(
        name="Personal Master Orchestrator",
        instructions=(
            "Act as the user's main personal AI coordinator. Understand goals in Hindi, Hinglish, Odia or English. "
            "Delegate to specialist agents, reuse existing work, avoid unnecessary questions, and finish with "
            "DONE / DOING / BLOCKED / NEXT. Planning and read-only inspection may proceed automatically. "
            + HUMAN_GATE
        ),
        handoffs=[coding, workflow, qa, security, ops],
        allow_delegation=True,
        planning=True,
        **common,
    )
    return Agents(agents=[master, coding, workflow, qa, security, ops])


def main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser(description="Run Personal Master AI")
    parser.add_argument("--goal", required=False)
    args = parser.parse_args()
    goal = (args.goal or input("Goal: ")).strip()
    if not goal:
        raise SystemExit("A goal is required.")
    try:
        print(build_team().start(goal))
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
