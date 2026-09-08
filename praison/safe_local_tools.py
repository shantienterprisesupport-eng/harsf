"""Safe local tools for the HARSF PraisonAI agents.

These tools deliberately operate only inside the HARSF repository. They do not
read secrets, do not use shell=True, and do not expose arbitrary command
execution. Riskier/reversible Git mutations require an explicit Y/N prompt.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Dict, List


REPO_ROOT = Path(__file__).resolve().parents[1]
MAX_TEXT_BYTES = 1_000_000
NPM = "npm.cmd" if os.name == "nt" else "npm"

BLOCKED_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "credentials.json",
    "secrets.json",
    "id_rsa",
    "id_ed25519",
}
SAFE_ENV_TEMPLATES = {".env.example", ".env.sample", ".env.template"}
BLOCKED_PARTS = {".git", "node_modules", ".venv", "dist", "build", "coverage"}
BLOCKED_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".crt", ".cer"}

SAFE_CHECKS: Dict[str, List[str]] = {
    "git_status": ["git", "status", "--short", "--branch"],
    "git_diff": ["git", "diff", "--"],
    "git_diff_staged": ["git", "diff", "--cached", "--"],
    "git_branch": ["git", "branch", "--show-current"],
    "git_log": ["git", "log", "-8", "--oneline"],
    "test": [NPM, "run", "test"],
    "build": [NPM, "run", "build"],
    "qa": [NPM, "run", "qa"],
    "agents_verify": [NPM, "run", "agents:verify"],
    "n8n_status": [NPM, "run", "n8n:status"],
    "ruflo_doctor": [NPM, "run", "ruflo:doctor"],
}


def _resolve(relative_path: str) -> Path:
    raw = (relative_path or ".").strip().replace("\\", "/")
    candidate = (REPO_ROOT / raw).resolve()
    try:
        candidate.relative_to(REPO_ROOT)
    except ValueError as exc:
        raise ValueError("Path must stay inside the HARSF repository") from exc
    return candidate


def _assert_allowed(path: Path, *, writing: bool = False) -> None:
    rel = path.relative_to(REPO_ROOT)
    lowered_parts = {part.lower() for part in rel.parts}
    if lowered_parts & BLOCKED_PARTS:
        raise PermissionError("Protected/generated directory is not available to the agent")

    name = path.name.lower()
    if name in BLOCKED_NAMES or path.suffix.lower() in BLOCKED_SUFFIXES:
        raise PermissionError("Secret/credential files are blocked")
    if name.startswith(".env") and name not in SAFE_ENV_TEMPLATES:
        raise PermissionError("Environment secret files are blocked")
    if writing and path.suffix.lower() in {".exe", ".dll", ".sys", ".msi", ".bat", ".cmd", ".ps1"}:
        raise PermissionError("Executable/script creation is blocked by the local worker")


def workspace_info() -> str:
    """Return the HARSF workspace root and current Git branch."""
    branch = _run(["git", "branch", "--show-current"], timeout=20)
    return f"workspace={REPO_ROOT}\nbranch={branch.strip()}"


def list_workspace(relative_path: str = ".", max_entries: int = 200) -> str:
    """List files/directories inside HARSF while hiding secrets and generated folders."""
    base = _resolve(relative_path)
    _assert_allowed(base)
    if not base.exists():
        return "NOT_FOUND"
    if base.is_file():
        return str(base.relative_to(REPO_ROOT))

    rows: List[str] = []
    for root, dirs, files in os.walk(base):
        root_path = Path(root)
        dirs[:] = [d for d in dirs if d.lower() not in BLOCKED_PARTS]
        for name in sorted(dirs + files):
            path = root_path / name
            try:
                _assert_allowed(path)
            except PermissionError:
                continue
            suffix = "/" if path.is_dir() else ""
            rows.append(str(path.relative_to(REPO_ROOT)).replace("\\", "/") + suffix)
            if len(rows) >= max(1, min(max_entries, 500)):
                return "\n".join(rows) + "\n...TRUNCATED"
    return "\n".join(rows) or "EMPTY"


def read_text(relative_path: str) -> str:
    """Read a UTF-8 text file inside HARSF. Secret and generated paths are denied."""
    path = _resolve(relative_path)
    _assert_allowed(path)
    if not path.is_file():
        return "NOT_FOUND_OR_NOT_FILE"
    if path.stat().st_size > MAX_TEXT_BYTES:
        return "FILE_TOO_LARGE"
    return path.read_text(encoding="utf-8", errors="replace")


def write_text(relative_path: str, content: str) -> str:
    """Create or replace a text/code file inside HARSF, excluding secrets/executables."""
    path = _resolve(relative_path)
    _assert_allowed(path, writing=True)
    encoded = content.encode("utf-8")
    if len(encoded) > MAX_TEXT_BYTES:
        raise ValueError("Refusing to write a file larger than 1 MB")
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".harsf-agent-tmp")
    temp.write_bytes(encoded)
    temp.replace(path)
    return f"WROTE {path.relative_to(REPO_ROOT)} ({len(encoded)} bytes)"


def search_text(query: str, relative_path: str = ".", max_matches: int = 50) -> str:
    """Search readable text files inside HARSF for a case-insensitive string."""
    needle = query.strip().lower()
    if not needle:
        return "QUERY_REQUIRED"
    base = _resolve(relative_path)
    _assert_allowed(base)
    paths = [base] if base.is_file() else [p for p in base.rglob("*") if p.is_file()]
    matches: List[str] = []
    for path in paths:
        try:
            _assert_allowed(path)
            if path.stat().st_size > MAX_TEXT_BYTES:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
        except (OSError, PermissionError):
            continue
        for line_no, line in enumerate(text.splitlines(), 1):
            if needle in line.lower():
                rel = path.relative_to(REPO_ROOT).as_posix()
                matches.append(f"{rel}:{line_no}: {line[:240]}")
                if len(matches) >= max(1, min(max_matches, 100)):
                    return "\n".join(matches) + "\n...TRUNCATED"
    return "\n".join(matches) or "NO_MATCHES"


def run_project_check(check: str) -> str:
    """Run one allowlisted project check: test/build/qa/Git status/diff/log/etc."""
    key = check.strip().lower()
    command = SAFE_CHECKS.get(key)
    if not command:
        return "BLOCKED. Allowed checks: " + ", ".join(sorted(SAFE_CHECKS))
    return _run(command, timeout=180)


def git_checkpoint(message: str) -> str:
    """Create a local Git commit only after the human types Y at the terminal prompt."""
    clean_message = " ".join(message.split()).strip()[:120]
    if not clean_message:
        return "COMMIT_MESSAGE_REQUIRED"
    answer = input(f"\nHuman approval required to create Git commit '{clean_message}'. Type Y to approve: ").strip().lower()
    if answer not in {"y", "yes"}:
        return "DENIED_BY_HUMAN"
    add_result = _run(["git", "add", "-A"], timeout=30)
    commit_result = _run(["git", "commit", "-m", clean_message], timeout=60)
    return f"git add:\n{add_result}\n\ngit commit:\n{commit_result}"


def _run(command: List[str], timeout: int) -> str:
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=timeout,
        shell=False,
        check=False,
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    output = output.strip()
    if len(output) > 20_000:
        output = output[-20_000:] + "\n...OUTPUT_TRUNCATED"
    return f"exit={completed.returncode}\n{output}".strip()
