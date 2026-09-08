"""Safe app-draft tools for the HARSF Coding Agent.

These tools deliberately write only under .harsf-runtime/app-drafts. They do not
modify tracked HARSF source files, run generated code, install packages, commit,
merge, deploy, or touch secret files. A Human CEO can review a draft before any
tracked-repository change is made.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DRAFT_ROOT = REPO_ROOT / ".harsf-runtime" / "app-drafts"
MAX_FILE_CHARS = 120_000
MAX_READ_CHARS = 30_000
ALLOWED_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".mjs",
    ".cjs",
    ".py",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}
ALLOWED_SPECIAL_FILES = {".gitignore", "LICENSE", "README"}
BLOCKED_PARTS = {".git", ".venv", "node_modules", "dist", "coverage", "__pycache__"}
BLOCKED_NAMES = {".env", ".env.local", ".npmrc"}
SECRET_VALUE_PATTERNS = [
    r"\bsk-[A-Za-z0-9_-]{16,}\b",
    r"\bgh[pousr]_[A-Za-z0-9_]{16,}\b",
    r"\bAIza[A-Za-z0-9_-]{20,}\b",
    r"\bAKIA[A-Z0-9]{16}\b",
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r"\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b",
]


def _app_slug(app_name: str) -> str:
    if not isinstance(app_name, str):
        raise ValueError("App name must be text.")
    slug = re.sub(r"[^a-z0-9]+", "-", app_name.strip().lower()).strip("-")
    if not slug:
        raise ValueError("A valid app name is required.")
    return slug[:60]


def _looks_like_secret_value(text: str) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in SECRET_VALUE_PATTERNS)


def _safe_relative_path(relative_path: str) -> Path:
    if not isinstance(relative_path, str) or not relative_path.strip():
        raise ValueError("A draft-relative file path is required.")
    normalized = relative_path.replace("\\", "/").strip()
    path = Path(normalized)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError("Path must stay inside the app draft.")
    if any(part in BLOCKED_PARTS for part in path.parts):
        raise ValueError("That path is blocked in an app draft.")
    if path.name in BLOCKED_NAMES or path.name.startswith(".env"):
        raise ValueError("Environment and credential files are blocked.")
    if path.suffix.lower() in {".pem", ".key", ".p12", ".pfx"}:
        raise ValueError("Credential files are blocked.")
    if path.name not in ALLOWED_SPECIAL_FILES and path.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError("Only normal app source/config/documentation text files are allowed.")
    return path


def _safe_draft_path(app_name: str, relative_path: str) -> tuple[str, Path]:
    slug = _app_slug(app_name)
    rel = _safe_relative_path(relative_path)
    app_root = (DRAFT_ROOT / slug).resolve()
    target = (app_root / rel).resolve()
    try:
        target.relative_to(app_root)
    except ValueError as exc:
        raise ValueError("Path escapes the app draft.") from exc
    return slug, target


def write_app_draft_file(app_name: str, relative_path: str, content: str) -> dict[str, Any]:
    """Create or replace one text file in an isolated app draft.

    Use this only for source/config/documentation files for a new app draft. The
    draft is stored under .harsf-runtime/app-drafts and is not a tracked HARSF
    repository change. Real credentials and secret files are rejected.
    """
    if not isinstance(content, str):
        raise ValueError("File content must be text.")
    if len(content) > MAX_FILE_CHARS:
        raise ValueError("Draft file is too large.")
    if _looks_like_secret_value(content):
        raise ValueError("Real-looking secret values cannot be written to app drafts.")

    slug, target = _safe_draft_path(app_name, relative_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return {
        "written": True,
        "app": slug,
        "path": target.relative_to(DRAFT_ROOT / slug).as_posix(),
        "chars": len(content),
        "scope": ".harsf-runtime/app-drafts only",
    }


def list_app_draft_files(app_name: str) -> list[str]:
    """List files currently present in one isolated HARSF app draft."""
    slug = _app_slug(app_name)
    app_root = (DRAFT_ROOT / slug).resolve()
    if not app_root.exists():
        return []
    files: list[str] = []
    for path in app_root.rglob("*"):
        if not path.is_file():
            continue
        try:
            relative = path.relative_to(app_root).as_posix()
            _safe_relative_path(relative)
        except ValueError:
            continue
        files.append(relative)
        if len(files) >= 300:
            break
    return sorted(files)


def read_app_draft_file(app_name: str, relative_path: str, max_chars: int = MAX_READ_CHARS) -> str:
    """Read one text file from an isolated app draft for review or iteration."""
    _, target = _safe_draft_path(app_name, relative_path)
    if not target.exists() or not target.is_file():
        raise ValueError("Draft file not found.")
    max_chars = max(500, min(int(max_chars), MAX_READ_CHARS))
    text = target.read_text(encoding="utf-8", errors="replace")
    if _looks_like_secret_value(text):
        raise ValueError("Draft contains a real-looking secret value and cannot be returned.")
    return text[:max_chars]
