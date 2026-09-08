from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mcp.server import MCPServer


REPO_ROOT = Path(__file__).resolve().parents[1]
MEMORY_DIR = REPO_ROOT / ".harsf-memory"
MEMORY_FILE = MEMORY_DIR / "project-memory.json"

BLOCKED_PARTS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "coverage",
    "__pycache__",
    ".harsf-memory",
}
BLOCKED_FILE_NAMES = {
    ".env",
    ".env.local",
    ".npmrc",
}
ALLOWED_TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".py",
    ".ps1",
    ".cmd",
    ".html",
    ".css",
}
SENSITIVE_PATTERNS = [
    r"\bpassword\b",
    r"\bpasscode\b",
    r"\botp\b",
    r"\bapi[ _-]?key\b",
    r"\baccess[ _-]?token\b",
    r"\bsecret\b",
    r"\bcvv\b",
    r"\bupi[ _-]?pin\b",
    r"\bcard[ _-]?number\b",
    r"\bbank[ _-]?account\b",
    r"\bprivate[ _-]?key\b",
    r"\bseed[ _-]?phrase\b",
    r"\bmnemonic\b",
    r"\bsk-[A-Za-z0-9_-]{16,}\b",
    r"\bgh[pousr]_[A-Za-z0-9_]{16,}\b",
    r"\bAIza[A-Za-z0-9_-]{20,}\b",
]

mcp = MCPServer("HARSF Scoped MCP")


def _safe_path(relative_path: str) -> Path:
    if not isinstance(relative_path, str) or not relative_path.strip():
        raise ValueError("A repository-relative path is required.")

    candidate = (REPO_ROOT / relative_path).resolve()
    try:
        candidate.relative_to(REPO_ROOT)
    except ValueError as exc:
        raise ValueError("Path escapes the HARSF repository.") from exc

    rel_parts = candidate.relative_to(REPO_ROOT).parts
    if any(part in BLOCKED_PARTS for part in rel_parts):
        raise ValueError("That path is blocked by the HARSF workspace policy.")
    if candidate.name in BLOCKED_FILE_NAMES or candidate.name.startswith(".env"):
        raise ValueError("Environment/secret files are blocked.")
    if candidate.suffix.lower() in {".pem", ".key", ".p12", ".pfx"}:
        raise ValueError("Credential files are blocked.")
    return candidate


def _looks_sensitive(text: str) -> bool:
    lowered = text.lower()
    return any(re.search(pattern, lowered, flags=re.IGNORECASE) for pattern in SENSITIVE_PATTERNS)


def _load_memory() -> list[dict[str, Any]]:
    if not MEMORY_FILE.exists():
        return []
    try:
        data = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    return data if isinstance(data, list) else []


def _save_memory(items: list[dict[str, Any]]) -> None:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")


def _iter_project_text_files():
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(REPO_ROOT)
        if any(part in BLOCKED_PARTS for part in rel.parts):
            continue
        if path.name in BLOCKED_FILE_NAMES or path.name.startswith(".env"):
            continue
        if path.suffix.lower() not in ALLOWED_TEXT_SUFFIXES:
            continue
        try:
            if path.stat().st_size > 256_000:
                continue
        except OSError:
            continue
        yield path


@mcp.tool()
def repository_status() -> str:
    """Return read-only git status for the HARSF repository."""
    try:
        result = subprocess.run(
            ["git", "status", "--short"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return "Git status is unavailable on this machine."

    if result.returncode != 0:
        return "Git status could not be read."
    output = result.stdout.strip()
    return output or "Working tree is clean."


@mcp.tool()
def read_project_file(path: str, max_chars: int = 12000) -> str:
    """Read a safe text file inside the HARSF repository; secrets and generated folders are blocked."""
    target = _safe_path(path)
    if not target.exists() or not target.is_file():
        raise ValueError("File not found.")
    if target.suffix.lower() not in ALLOWED_TEXT_SUFFIXES:
        raise ValueError("Only normal project text/code files can be read.")
    max_chars = max(500, min(int(max_chars), 20000))
    text = target.read_text(encoding="utf-8", errors="replace")
    return text[:max_chars]


@mcp.tool()
def search_project_text(query: str, max_results: int = 20) -> list[dict[str, Any]]:
    """Search normal HARSF project text/code files without reading secret or generated directories."""
    needle = query.strip().lower()
    if not needle:
        raise ValueError("Search query is required.")
    if _looks_sensitive(needle):
        raise ValueError("Searching for credentials, OTPs, passwords, or secrets is blocked.")

    max_results = max(1, min(int(max_results), 30))
    results: list[dict[str, Any]] = []
    for path in _iter_project_text_files():
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for line_number, line in enumerate(lines, start=1):
            if needle in line.lower():
                results.append(
                    {
                        "path": path.relative_to(REPO_ROOT).as_posix(),
                        "line": line_number,
                        "text": line[:300],
                    }
                )
                if len(results) >= max_results:
                    return results
    return results


@mcp.tool()
def remember_project_note(title: str, note: str) -> dict[str, Any]:
    """Store one non-sensitive HARSF project note locally. Secrets, OTPs, credentials, and payment data are rejected."""
    title = title.strip()
    note = note.strip()
    if not title or not note:
        raise ValueError("Both title and note are required.")
    if len(title) > 120 or len(note) > 4000:
        raise ValueError("Project note is too large.")
    if _looks_sensitive(f"{title}\n{note}"):
        raise ValueError("Sensitive information cannot be stored in HARSF project memory.")

    items = _load_memory()
    entry = {
        "id": f"note-{len(items) + 1}",
        "title": title,
        "note": note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.append(entry)
    _save_memory(items[-200:])
    return {"saved": True, "id": entry["id"], "title": entry["title"]}


@mcp.tool()
def recall_project_notes(query: str = "", limit: int = 10) -> list[dict[str, Any]]:
    """Recall locally stored non-sensitive HARSF project notes."""
    items = _load_memory()
    limit = max(1, min(int(limit), 25))
    needle = query.strip().lower()
    if not needle:
        return list(reversed(items))[:limit]

    words = [word for word in re.split(r"\W+", needle) if word]
    scored: list[tuple[int, dict[str, Any]]] = []
    for item in items:
        haystack = f"{item.get('title', '')} {item.get('note', '')}".lower()
        score = sum(haystack.count(word) for word in words)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: (pair[0], pair[1].get("created_at", "")), reverse=True)
    return [item for _, item in scored[:limit]]


@mcp.tool()
def memory_status() -> dict[str, Any]:
    """Report local project-memory status without exposing note contents."""
    items = _load_memory()
    return {
        "enabled": True,
        "scope": "HARSF project only",
        "storage": str(MEMORY_FILE.relative_to(REPO_ROOT)),
        "notes": len(items),
        "sensitive_data_policy": "blocked",
        "vector_memory": "not enabled yet",
    }


if __name__ == "__main__":
    mcp.run()
