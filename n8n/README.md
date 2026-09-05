# n8n Mini-App Agent

This folder keeps the n8n runtime separate from the main HARSF React/Vite app.

## Purpose
Use n8n as an orchestrator for small app/agent workflows while the main HARSF app remains unchanged.

## Safety
- Never commit real API keys or passwords.
- Put real secrets only in the deployed n8n server/cloud environment.
- Keep GitHub credentials inside n8n Credentials or the deployment secret manager.

## Run locally (optional)
1. Copy `.env.example` to `.env`.
2. Set a strong `N8N_ENCRYPTION_KEY`.
3. Run `docker compose up -d` from this folder.
4. Open `http://localhost:5678`.

## For laptop-off / 24x7 use
Deploy this same n8n container to an always-on cloud/server with persistent storage, then set:
- `N8N_HOST` to the public host
- `N8N_PROTOCOL=https`
- `WEBHOOK_URL=https://your-host/`
- a strong private `N8N_ENCRYPTION_KEY`

GitHub being connected to the HARSF repository does not itself keep n8n running. A live n8n instance still needs a host/server.

## GitHub connection inside n8n
After n8n is live, create a GitHub credential in n8n and point GitHub nodes/workflows at this repository. Do not store the token in this public repository.
