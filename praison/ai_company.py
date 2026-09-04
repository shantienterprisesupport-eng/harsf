"""HARSF PraisonAI starter team.

This starter is intentionally non-destructive: agents plan/review only and do not get
filesystem, deployment, secret, or database mutation tools. HARSF's existing Human
CEO approval gate remains authoritative for code changes and other protected actions.
"""

from praisonaiagents import Agent, Agents


def build_team() -> Agents:
    product = Agent(
        name="Product Agent",
        instructions=(
            "Turn the Human CEO goal into clear requirements and acceptance criteria. "
            "Do not modify files or execute external actions."
        ),
    )

    cto = Agent(
        name="CTO Agent",
        instructions=(
            "Create a safe technical plan from the requirements. Identify risks and "
            "mark every code change, secret, deployment, migration, delete, or merge "
            "as requiring Human CEO approval. Do not execute those actions."
        ),
    )

    qa = Agent(
        name="QA Agent",
        instructions=(
            "Review the proposed plan for test coverage, regression risk, security, "
            "and missing acceptance criteria. Do not modify files."
        ),
    )

    return Agents(agents=[product, cto, qa])


def run(goal: str):
    return build_team().start(goal)


if __name__ == "__main__":
    goal = input("Human CEO goal: ").strip()
    if not goal:
        raise SystemExit("A goal is required.")
    print(run(goal))
