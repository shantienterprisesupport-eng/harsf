from __future__ import annotations

import json
import math
import os
import re
import sqlite3
import subprocess
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from mcp.server import MCPServer


REPO_ROOT = Path(__file__).resolve().parents[1]
MEMORY_DIR = REPO_ROOT / ".harsf-memory"
MEMORY_FILE = MEMORY_DIR / "project-memory.json"
VECTOR_DB_FILE = MEMORY_DIR / "vectors.sqlite3"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "all-minilm").strip() or "all-minilm"

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
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in SENSITIVE_PATTERNS)


def _redact_sensitive_lines(text: str) -> str:
    safe_lines: list[str] = []
    for line in text.splitlines():
        safe_lines.append("[REDACTED sensitive line]" if _looks_sensitive(line) else line)
    return "\n".join(safe_lines)


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
        try:
            relative = path.relative_to(REPO_ROOT).as_posix()
            safe = _safe_path(relative)
        except (ValueError, OSError):
            continue
        if safe.suffix.lower() not in ALLOWED_TEXT_SUFFIXES:
            continue
        try:
            if safe.stat().st_size > 256_000:
                continue
        except OSError:
            continue
        yield safe


def _is_local_ollama_url(base_url: str) -> bool:
    try:
        parsed = urlparse(base_url)
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    hostname = (parsed.hostname or "").lower()
    return hostname in {"localhost", "127.0.0.1", "::1"}


def _embed_text(text: str) -> list[float]:
    if not _is_local_ollama_url(OLLAMA_BASE_URL):
        raise RuntimeError("Semantic memory only permits a local Ollama endpoint.")
    if _looks_sensitive(text):
        raise ValueError("Sensitive information cannot be embedded into HARSF memory.")

    payload = json.dumps({"model": OLLAMA_EMBED_MODEL, "input": text}).encode("utf-8")
    request = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/embed",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError("Local Ollama embedding service is unavailable.") from exc

    embeddings = data.get("embeddings") if isinstance(data, dict) else None
    if not isinstance(embeddings, list) or not embeddings or not isinstance(embeddings[0], list):
        raise RuntimeError("Local Ollama returned no embedding vector.")
    try:
        vector = [float(value) for value in embeddings[0]]
    except (TypeError, ValueError) as exc:
        raise RuntimeError("Local Ollama returned an invalid embedding vector.") from exc
    if not vector:
        raise RuntimeError("Local Ollama returned an empty embedding vector.")
    return vector


def _init_vector_db() -> sqlite3.Connection:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(VECTOR_DB_FILE)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS note_vectors (
            note_id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            vector_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    return connection


def _store_vector(note_id: str, vector: list[float]) -> None:
    with _init_vector_db() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO note_vectors(note_id, model, vector_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                note_id,
                OLLAMA_EMBED_MODEL,
                json.dumps(vector),
                datetime.now(timezone.utc).isoformat(),
            ),
        )


def _prune_vectors(valid_note_ids: set[str]) -> None:
    if not VECTOR_DB_FILE.exists():
        return
    with _init_vector_db() as connection:
        rows = connection.execute("SELECT note_id FROM note_vectors").fetchall()
        stale = [(note_id,) for (note_id,) in rows if note_id not in valid_note_ids]
        if stale:
            connection.executemany("DELETE FROM note_vectors WHERE note_id = ?", stale)


def _load_vectors() -> list[tuple[str, str, list[float]]]:
    if not VECTOR_DB_FILE.exists():
        return []
    with _init_vector_db() as connection:
        rows = connection.execute("SELECT note_id, model, vector_json FROM note_vectors").fetchall()
    vectors: list[tuple[str, str, list[float]]] = []
    for note_id, model, vector_json in rows:
        try:
            vector = [float(value) for value in json.loads(vector_json)]
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        if vector:
            vectors.append((note_id, model, vector))
    return vectors


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


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
    """Read a safe text file inside HARSF; secret files are blocked and sensitive-looking lines are redacted."""
    target = _safe_path(path)
    if not target.exists() or not target.is_file():
        raise ValueError("File not found.")
    if target.suffix.lower() not in ALLOWED_TEXT_SUFFIXES:
        raise ValueError("Only normal project text/code files can be read.")
    max_chars = max(500, min(int(max_chars), 20000))
    text = target.read_text(encoding="utf-8", errors="replace")
    return _redact_sensitive_lines(text)[:max_chars]


@mcp.tool()
def search_project_text(query: str, max_results: int = 20) -> list[dict[str, Any]]:
    """Search normal HARSF project files without reading secret/generated directories or returning sensitive-looking lines."""
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
            if needle in line.lower() and not _looks_sensitive(line):
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
    """Store one non-sensitive HARSF project note locally and index it semantically when local Ollama is available."""
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
        "id": f"note-{uuid4().hex[:12]}",
        "title": title,
        "note": note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.append(entry)
    items = items[-200:]
    _save_memory(items)
    _prune_vectors({str(item.get("id")) for item in items})

    semantic_indexed = False
    try:
        vector = _embed_text(f"{title}\n{note}")
        _store_vector(entry["id"], vector)
        semantic_indexed = True
    except (RuntimeError, ValueError):
        semantic_indexed = False

    return {
        "saved": True,
        "id": entry["id"],
        "title": entry["title"],
        "semantic_indexed": semantic_indexed,
        "embedding_model": OLLAMA_EMBED_MODEL if semantic_indexed else None,
    }


@mcp.tool()
def recall_project_notes(query: str = "", limit: int = 10) -> list[dict[str, Any]]:
    """Recall locally stored non-sensitive HARSF project notes using keyword matching."""
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
def semantic_recall_project_notes(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Recall project notes by meaning using local Ollama embeddings and a local SQLite vector index."""
    query = query.strip()
    if not query:
        raise ValueError("Semantic recall query is required.")
    if _looks_sensitive(query):
        raise ValueError("Sensitive information cannot be sent to the embedding model.")
    limit = max(1, min(int(limit), 25))

    query_vector = _embed_text(query)
    items = {str(item.get("id")): item for item in _load_memory()}
    scored: list[tuple[float, dict[str, Any]]] = []
    for note_id, model, vector in _load_vectors():
        if model != OLLAMA_EMBED_MODEL or note_id not in items:
            continue
        score = _cosine_similarity(query_vector, vector)
        if score > 0:
            result = dict(items[note_id])
            result["similarity"] = round(score, 4)
            scored.append((score, result))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [item for _, item in scored[:limit]]


@mcp.tool()
def memory_status() -> dict[str, Any]:
    """Report local project-memory status without exposing note contents."""
    items = _load_memory()
    vectors = _load_vectors()
    return {
        "enabled": True,
        "scope": "HARSF project only",
        "storage": str(MEMORY_FILE.relative_to(REPO_ROOT)),
        "notes": len(items),
        "sensitive_data_policy": "blocked",
        "semantic_memory": {
            "local_only": _is_local_ollama_url(OLLAMA_BASE_URL),
            "embedding_model": OLLAMA_EMBED_MODEL,
            "vector_storage": str(VECTOR_DB_FILE.relative_to(REPO_ROOT)),
            "indexed_notes": len(vectors),
        },
    }


if __name__ == "__main__":
    mcp.run()
