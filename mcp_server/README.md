# HARSF Scoped MCP

This is the repository-scoped MCP server for HARSF. It uses the official MCP Python SDK v2 and runs over stdio by default.

## What it exposes

- `repository_status` — read-only `git status --short`
- `read_project_file` — reads normal project text/code files inside HARSF only
- `search_project_text` — literal search across normal project files
- `remember_project_note` — stores a non-sensitive local project note and indexes it semantically when local Ollama is available
- `recall_project_notes` — keyword recall from local project notes
- `semantic_recall_project_notes` — meaning-based recall using local Ollama embeddings
- `memory_status` — reports memory/vector status without note contents

## Safety boundaries

- Repository scope is fixed to this HARSF checkout.
- `.env`, `.env.local`, credential files, `.git`, `.venv`, `node_modules`, generated folders and local memory storage are blocked from read/search.
- Paths that resolve outside the repository are rejected, including symlink escapes.
- Sensitive-looking lines are redacted from file reads and omitted from search results.
- OTPs, passwords, API keys, access tokens, payment secrets and similar sensitive data are rejected from project memory and embeddings.
- The only Git command is the fixed read-only `git status --short`; arbitrary shell commands are not exposed.
- Local memory lives under `.harsf-memory/` and is ignored by Git.
- Semantic vectors are stored locally in `.harsf-memory/vectors.sqlite3`.
- Ollama embedding calls are restricted to loopback hosts (`localhost`, `127.0.0.1`, or `::1`). Remote embedding URLs are rejected in this phase.

## Semantic memory

HARSF uses Ollama's current `/api/embed` endpoint. Configure locally:

```text
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=all-minilm
```

If Ollama or the embedding model is unavailable, normal project-note storage still works; the note simply reports `semantic_indexed: false`.

## Windows setup

Run once:

```powershell
npm run agents:setup
```

That installs PraisonAI and `mcp>=2,<3` inside `.venv`.

Then either double-click:

```text
START-HARSF-MCP.cmd
```

or run:

```powershell
npm run mcp:run
```

The MCP host should launch the server as a stdio child process. Do not pass provider API keys to this MCP server; it does not need them.
