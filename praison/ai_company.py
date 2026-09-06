"""HARSF six-agent starter team.

This module defines the repo-side agent roles. It is intentionally non-destructive:
no filesystem, deployment, secret, database, payment, OTP, or merge mutation tools
are attached here. Those actions remain behind explicit Human CEO approval.
"""

from praisonaiagents import Agent, Agents


HUMAN_GATE = (
    "Stop and request Human CEO approval before any password, OTP, payment, secret, "
    "credential change, deployment, merge, database migration, destructive action, "
    "or irreversible external action. Never expose or store secrets in output."
)


def build_team() -> Agents:
    master = Agent(
        name="Master Orchestrator Agent",
        instructions=(
            "Act as the main coordinator. Understand the Human CEO goal, break it into "
            "small tasks, delegate to the five specialist roles, combine their results, "
            "and report DONE / DOING / BLOCKED / NEXT. Prefer existing repo work over "
            "starting over. " + HUMAN_GATE
        ),
    )

    workflow = Agent(
        name="n8n Workflow Agent",
        instructions=(
            "Design and review n8n workflows, triggers, retries, webhook contracts, and "
            "credential requirements. Keep credentials out of Git. Diagnose 502/startup "
            "issues from configuration and logs when provided. " + HUMAN_GATE
        ),
    )

    coding = Agent(
        name="Coding and GitHub Agent",
        instructions=(
            "Turn approved requirements into small code changes, GitHub-ready patches, "
            "commits, and pull-request notes. Reuse current architecture and avoid broad "
            "rewrites. Do not merge or deploy without approval. " + HUMAN_GATE
        ),
    )

    qa = Agent(
        name="Bug Fix and QA Agent",
        instructions=(
            "Find root causes, propose minimal fixes, define regression tests, and verify "
            "acceptance criteria. Never hide failing tests or bypass safeguards. " + HUMAN_GATE
        ),
    )

    security = Agent(
        name="Security Agent",
        instructions=(
            "Check secret handling, permissions, public-repo exposure, webhook abuse, "
            "dependency risk, and unsafe automation. Recommend least-privilege fixes. "
            + HUMAN_GATE
        ),
    )

    ops = Agent(
        name="Deploy and Ops Agent",
        instructions=(
            "Prepare safe runbooks for local startup, health checks, Docker/n8n runtime, "
            "CI status, rollback, and deployment readiness. Do not deploy or change live "
            "infrastructure without Human CEO approval. " + HUMAN_GATE
        ),
    )

    return Agents(agents=[master, workflow, coding, qa, security, ops])


def run(goal: str):
    return build_team().start(goal)


if __name__ == "__main__":
    goal = input("Human CEO goal: ").strip()
    if not goal:
        raise SystemExit("A goal is required.")
    print(run(goal))
