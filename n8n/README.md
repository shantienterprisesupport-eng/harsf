# n8n Mini-App Agent

This folder keeps the n8n runtime separate from the main HARSF React/Vite app.

## Purpose
Use n8n as an orchestrator for small app/agent workflows while the main HARSF app remains unchanged.

## What is ready in the repo
- Local Docker Compose runtime on port `5678`
- Production Compose template with persistent storage
- Private `.env` examples with no real credentials committed
- One-command Windows startup: `npm run n8n:start`
- Status/log check: `npm run n8n:status`
- Importable six-agent intake workflow: `n8n/workflows/harsf-agent-intake.json`
- Human approval gate for OTP, passwords, payments, secrets, credentials, merges, deploys, deletes, and migrations

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
- Passwords, OTPs, payments, secret changes, merges, deployments, migrations, deletes, and other irreversible actions require Human CEO approval.

## Run locally on Windows
From the repository root:

```powershell
npm run n8n:start
```

The startup script creates `n8n/.env` if needed, generates a private local encryption key, starts Docker Compose, and waits for `http://localhost:5678`.

For diagnostics:

```powershell
npm run n8n:status
```

## Import the starter workflow
In n8n, import:

`n8n/workflows/harsf-agent-intake.json`

It receives a `goal`, `task`, or `message`, routes it to one of the six roles, and blocks protected actions for Human CEO approval. It deliberately contains no real credentials.

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
