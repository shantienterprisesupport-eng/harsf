# HARSF Autonomous AI Company

Human-CEO-controlled multi-agent software factory. A user can describe an app in simple Odia, Hindi, Hinglish, or English by voice or text. The AI CEO creates a delegated workflow, while protected code actions stop at a Human-in-the-Loop approval gate.

## Current MVP

- Responsive voice/text CEO chat interface
- AI CEO task planner for Product, CTO, UI/UX, Developer, Database, QA, Security, BugFix, Retest, and Code Review agents
- Human approval queue with approve/reject decisions
- Approved Developer/BugFix/Security/Review actions can be sent to a localhost-only Codex executor
- Codex executor uses `workspace-write`, disables network access, and does not permit approval escalation
- Provider registry/adapters for Claude, DeepSeek, Grok, Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, Solar, and research-only providers
- MCP connection contract for scoped local Git, GitHub, and vector memory
- Unit tests for approval policy and agent delegation

Provider names in the UI mean the integration boundary is implemented, not that credentials or commercial access have been granted. Sakana AI, Rakuten, ELYZA, CyberAgent, VARCO, and EXAONE are marked research-only until a supported hosted API and authorization are supplied.

## Run frontend only

```bash
npm install
npm run qa
npm run dev
```

## Run frontend + local Codex executor

Make sure Codex/ChatGPT sign-in is already completed on the machine, then run:

```bash
npm install
npm run dev:full
```

The web UI runs through Vite and proxies `/api` to the executor bound only to `127.0.0.1:8787`. The executor accepts only explicit Human CEO approved tasks and rejects destructive/high-risk text such as force-push, production deployment, credential access, or destructive migrations.

Copy `.env.example` to `.env.local` only when provider credentials are actually needed and authorized. Never expose provider keys to the browser in production; use a server-side gateway.

## Safety

The local executor is intentionally conservative: it works only inside the current Git repository, uses the Codex `workspace-write` sandbox, has network access disabled, and runs with Codex approval escalation disabled. It is instructed not to read or expose `.env` files, delete files, reset Git history, merge, deploy, or alter production systems. Those actions remain outside the automatic execution path and require separate Human CEO review.
