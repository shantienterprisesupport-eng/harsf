# HARSF Scoped MCP

This is the repository-scoped MCP server for HARSF. It uses the official MCP Python SDK v2 and runs over stdio by default.

## What it exposes

- `repository_status` — read-only `git status --short`
- `read_project_file` — reads normal project text/code files inside HARSF only
- `search_project_text` — literal search across normal project files
- `remember_project_note` — stores a non-sensitive local project note
- `recall_project_notes` — recalls local project notes
- `memory_status` — reports memory status without note contents

## Safety boundaries

- Repository scope is fixed to this HARSF checkout.
- `.env`, `.env.local`, credential files, `.git`, `.venv`, `node_modules`, generated folders and local memory storage are blocked from read/search.
- Paths that resolve outside the repository are rejected, including symlink escapes.
- Sensitive-looking lines are redacted from file reads and omitted from search results.
- OTPs, passwords, API keys, access tokens, payment secrets and similar sensitive data are rejected from project memory.
- The only Git command is the fixed read-only `git status --short`; arbitrary shell commands are not exposed.
- Local memory lives under `.harsf-memory/` and is ignored by Git.
- Vector memory is not enabled yet; this PR is the safe local memory foundation.

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
