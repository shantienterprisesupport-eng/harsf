"""HARSF six-agent team with a safe app-draft workspace.

The Coding and GitHub Agent can create real source files only inside the isolated
.harsf-runtime/app-drafts workspace. Tracked repository changes, deployment,
secrets, payments, database migrations, destructive actions, and merges remain
behind explicit Human CEO approval.
"""
from praisonaiagents import Agent, Agents

try:
    from .app_builder_tools import list_app_draft_files, read_app_draft_file, write_app_draft_file
except ImportError:  # Running this file directly from the praison directory.
    from app_builder_tools import list_app_draft_files, read_app_draft_file, write_app_draft_file


HUMAN_GATE = (
    "Stop and request Human CEO approval before any password, OTP, payment, secret, "
    "credential change, deployment, merge, tracked-repository code change, database "
    "migration, destructive action, or irreversible external action. Never expose or "
    "store secrets in output."
)

APP_DRAFT_RULE = (
    "For a request to build a new app, do not stop at a generic plan. Use the app-draft "
    "tools to create the actual source/config/documentation files in the isolated draft "
    "workspace. Start with the smallest runnable structure that satisfies the request, "
    "iterate by reading the draft files when needed, and list the files you created. "
    "Draft files are not approval to modify HARSF tracked source, run generated code, "
    "install packages, commit, merge, publish, or deploy."
)


def build_team() -> Agents:
    master = Agent(
        name="Master Orchestrator Agent",
        instructions=(
            "Act as the main coordinator. Understand the Human CEO goal, break it into "
            "small tasks, delegate to the five specialist roles, combine their results, "
            "and report DONE / DOING / BLOCKED / NEXT. Prefer existing repo work over "
            "starting over. For new-app goals, make sure the Coding and GitHub Agent "
            "produces an isolated app draft instead of only describing one. " + HUMAN_GATE
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
            "Turn requirements into concrete implementation. Reuse current architecture "
            "for existing-project work and prepare GitHub-ready patches without applying "
            "tracked changes unless approved. " + APP_DRAFT_RULE + " " + HUMAN_GATE
        ),
        tools=[write_app_draft_file, list_app_draft_files, read_app_draft_file],
    )

    qa = Agent(
        name="Bug Fix and QA Agent",
        instructions=(
            "Find root causes, propose minimal fixes, define regression tests, and verify "
            "acceptance criteria. For a new app draft, review the Coding Agent's reported "
            "file structure and identify missing acceptance checks. Never hide failing "
            "tests or bypass safeguards. " + HUMAN_GATE
        ),
    )

    security = Agent(
        name="Security Agent",
        instructions=(
            "Check secret handling, permissions, public-repo exposure, webhook abuse, "
            "dependency risk, and unsafe automation. App drafts must keep credentials out "
            "of source files. Recommend least-privilege fixes. " + HUMAN_GATE
        ),
    )

    ops = Agent(
        name="Deploy and Ops Agent",
        instructions=(
            "Prepare safe runbooks for local startup, health checks, Docker/n8n runtime, "
            "CI status, rollback, and deployment readiness. Do not run unreviewed generated "
            "app code, deploy, or change live infrastructure without Human CEO approval. "
            + HUMAN_GATE
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
