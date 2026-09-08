# n8n Mini-App Agent.

This folder keeps the n8n runtime separate from the main HARSF React/Vite app.

## Purpose
Use n8n as an orchestrator for small app/agent workflows while the main HARSF app remains unchanged.

## What is ready in the repo
- Local Docker Compose runtime on port `5678`
- Production Compose template with persistent storage
- Private `.env` examples with no real credentials committed
- One-command Windows startup: `npm run n8n:start`
- Safe status check: `npm run n8n:status`
- Explicit local workflow import: `npm run n8n:import`
- Safe local handoff: `npm run n8n:handoff -- "your planning goal"`
- Ruflo-to-n8n handoff: `npm run n8n:handoff:ruflo`
- One-click Windows handoff: `N8N-HARSF.cmd`
- Importable six-agent intake workflow: `n8n/workflows/harsf-agent-intake.json`
- Human approval gate for code/file mutation, OTP, passwords, payments, secrets, credentials, merges, publishing, deployments, deletes, migrations, and external messages

The six repo-side roles are:
1. Master Orchestrator Agent
2. n8n Workflow Agent
3. Coding and GitHub Agent
4. Bug Fix and QA Agent
5. Security Agent
6. Deploy and Ops Agent

## Safety
- Never commit real API keys or passwords.
- Put real secrets only in n8n Credentials or the deployed secret manager.
- Keep GitHub credentials inside n8n Credentials or the deployment secret manager.
- Protected actions require explicit Human CEO approval before execution.
- The repository workflow stays `active: false` by default.
- `npm run n8n:import` imports the reviewed local workflow but does not activate it automatically.
- The safe handoff command only permits loopback n8n URLs (`localhost`, `127.0.0.1`, or `::1`) in this phase.
- `npm run n8n:status` does not dump container logs, reducing the chance of exposing user data or secrets.

## Safe local sequence
From the repository root:

```powershell
npm run n8n:start
npm run n8n:status
npm run n8n:import
```

Then open n8n, review the imported workflow, and activate it manually only when you want the local webhook available.

For a safe planning/read-only goal:

```powershell
npm run n8n:handoff -- "review the current workflow and identify blockers"
```

Or, after Ruflo created a ready handoff:

```powershell
npm run n8n:handoff:ruflo
```

The handoff runner first checks local n8n `/healthz`, blocks protected goals, and only then posts to the local HARSF webhook. It never sends the goal to a remote webhook in this phase.

## Import behavior
The repository uses n8n's CLI workflow import command inside the running local container:

```text
n8n import:workflow --input=/tmp/harsf-agent-intake.json
```

The import is an explicit command. Activation stays manual so the Human CEO can review the workflow first.

## Connect an AI model
After n8n is running, add an authorized AI-model credential in n8n and connect the selected model/agent node after the Safe Router. The repository does not store API keys. If ChatGPT/OpenAI is used as the master model, its credential must be added privately in n8n; GitHub connection alone does not provide that model credential.

## GitHub connection inside n8n
After n8n is live, create a GitHub credential in n8n and point GitHub nodes/workflows at this repository. Do not store the token in this public repository.

## WhatsApp
WhatsApp cannot be made live from GitHub alone. The authorized WhatsApp/Meta credential and a reachable webhook URL must be added to n8n. Keep those credentials out of the repository.

## For laptop-off / 24x7 use
Deploy the same n8n container to an always-on host/server with persistent storage, then set:
- `N8N_HOST` to the public host
- `N8N_PROTOCOL=https`
- `WEBHOOK_URL=https://your-host/`
- a strong private `N8N_ENCRYPTION_KEY`

GitHub being connected to the HARSF repository does not itself keep n8n running. A live n8n instance still needs an always-on host/server.
