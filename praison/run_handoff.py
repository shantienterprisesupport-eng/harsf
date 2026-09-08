"""Run the latest safe Ruflo handoff through the HARSF PraisonAI team.

This command is intentionally explicit because it may call a configured model/provider.
It never reads provider secrets itself and refuses handoffs marked as approval-blocked.
"""
from __future__ import annotations

import json
from pathlib import Path

from ai_company import run


REPO_ROOT = Path(__file__).resolve().parents[1]
HANDOFF_FILE = REPO_ROOT / ".harsf-runtime" / "ruflo-handoff.json"


def load_handoff() -> dict:
    if not HANDOFF_FILE.exists():
        raise SystemExit("No Ruflo handoff found. Run npm run ruflo:orchestrate first.")

    try:
        payload = json.loads(HANDOFF_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit("Ruflo handoff is unreadable or invalid.") from exc

    if payload.get("scope") != "HARSF repository only":
        raise SystemExit("Handoff scope is not HARSF; refusing to continue.")
    if payload.get("status") != "READY_FOR_PRAISON_HANDOFF":
        raise SystemExit("Handoff is not ready for PraisonAI; review BLOCKED status first.")
    if payload.get("approval_gate", {}).get("required"):
        raise SystemExit("Human CEO approval is required before this handoff can run.")

    goal = payload.get("goal")
    if not isinstance(goal, str) or not goal.strip():
        raise SystemExit("Handoff does not contain a valid goal.")
    return payload


def main() -> None:
    payload = load_handoff()
    print("HARSF PraisonAI handoff starting.")
    print("This explicit command may use the locally configured model/provider.")
    result = run(payload["goal"].strip())
    print(result)


if __name__ == "__main__":
    main()
