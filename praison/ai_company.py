"""HARSF six-agent team with a workspace-scoped local worker.

The agents may inspect and edit ordinary text/code files inside this repository and
run a small allowlist of checks. Secrets, generated folders, executable/script
creation, arbitrary shell commands, deployment, merge, payment, OTP, database
mutation, and destructive actions remain outside the tool boundary.
"""

from praisonaiagents import Agent, Agents

from safe_local_tools import (
    git_checkpoint,
    list_workspace,
    read_text,
    run_project_check,
    search_text,
    workspace_info,
    write_text,
)


HUMAN_GATE = (
    "Stop and request Human CEO approval before any password, OTP, payment, secret, "
    "credential change, deployment, merge, database migration, destructive action, "
    "or irreversible external action. Never expose or store secrets in output. "
    "Stay inside the HARSF repository."
)

READ_TOOLS = [workspace_info, list_workspace, read_text, search_text, run_project_check]
WRITE_TOOLS = READ_TOOLS + [write_text]
CODE_TOOLS = WRITE_TOOLS + [git_checkpoint]


def build_team() -> Agents:
    master = Agent(
        name="Master Orchestrator Agent",
        instructions=(
            "Act as the user's main HARSF assistant. Listen to the Human CEO goal, inspect "
            "the repository before guessing, break the work into small tasks, delegate to "
            "specialists, and combine their results. For normal code tasks, proceed with "
            "workspace-scoped edits instead of repeatedly asking questions. After changes, "
            "run the relevant allowlisted checks and report DONE / DOING / BLOCKED / NEXT. "
            "Prefer existing repo work over starting over. " + HUMAN_GATE
        ),
        tools=READ_TOOLS,
    )

    workflow = Agent(
        name="n8n Workflow Agent",
        instructions=(
            "Design, inspect, and safely edit n8n workflow/config files inside HARSF. Review "
            "triggers, retries, webhook contracts, and credential requirements. Keep "
            "credentials out of Git. Diagnose 502/startup issues from configuration and "
            "logs when provided. Run only the provided safe checks. " + HUMAN_GATE
        ),
        tools=WRITE_TOOLS,
    )

    coding = Agent(
        name="Coding and GitHub Agent",
        instructions=(
            "Turn approved requirements into small working code changes inside HARSF. Read "
            "the existing implementation first, edit only what is needed, and run tests/build "
            "afterward. Use git diff/status to review your work. A local Git commit requires "
            "the Human CEO to type Y at the terminal approval prompt. Do not merge or deploy. "
            + HUMAN_GATE
        ),
        tools=CODE_TOOLS,
    )

    qa = Agent(
        name="Bug Fix and QA Agent",
        instructions=(
            "Find root causes, inspect relevant files, make minimal code fixes when needed, "
            "define regression tests, and run the available test/build/qa checks. Never hide "
            "failing tests or bypass safeguards. " + HUMAN_GATE
        ),
        tools=WRITE_TOOLS,
    )

    security = Agent(
        name="Security Agent",
        instructions=(
            "Inspect ordinary repository files for secret handling, permissions, public-repo "
            "exposure, webhook abuse, dependency risk, and unsafe automation. Recommend "
            "least-privilege fixes. Secret files themselves are intentionally inaccessible. "
            + HUMAN_GATE
        ),
        tools=READ_TOOLS,
    )

    ops = Agent(
        name="Deploy and Ops Agent",
        instructions=(
            "Prepare and verify safe local startup, health checks, Docker/n8n runtime, CI "
            "status, and rollback plans. You may inspect files and run allowlisted local "
            "checks, but cannot deploy or change live infrastructure. " + HUMAN_GATE
        ),
        tools=READ_TOOLS,
    )

    return Agents(agents=[master, workflow, coding, qa, security, ops])


def run(goal: str):
    return build_team().start(goal)


def interactive() -> None:
    print("HARSF Master Agent ready. Type a goal. Type EXIT to close.\n")
    while True:
        goal = input("Human CEO > ").strip()
        if not goal:
            continue
        if goal.lower() in {"exit", "quit", "close"}:
            print("HARSF Master Agent closed.")
            return
        try:
            result = run(goal)
            print("\n" + str(result) + "\n")
        except KeyboardInterrupt:
            print("\nCurrent task stopped by Human CEO.\n")
        except Exception as exc:
            print(f"\nBLOCKED: {type(exc).__name__}: {exc}\n")


if __name__ == "__main__":
    interactive()
