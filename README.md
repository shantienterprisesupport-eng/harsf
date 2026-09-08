# HARSF Autonomous AI Company

Human-CEO-controlled multi-agent software factory. A user can describe an app in simple Odia, Hindi, Hinglish, or English by voice or text. The AI CEO creates a delegated workflow, while code changes, bug fixes, merges, deployments, secrets, and destructive actions stop at a Human-in-the-Loop approval gate.

## Current MVP

- Responsive voice/text CEO chat interface
- AI CEO task planner for Product, CTO, UI/UX, Developer, Database, QA, Security, BugFix, and Code Review agents
- Human approval queue and approve/reject decisions
- Live AI gateway support for OpenAI/ChatGPT, Claude, DeepSeek, and xAI Grok when the corresponding authorized API key is configured
- Provider registry/adapters for Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, Solar, and research-only providers
- MCP connection contract for scoped local Git, GitHub, and vector memory
- Unit tests for approval policy and agent delegation

Provider names in the UI mean the integration boundary is implemented, not that credentials or commercial access have been granted. Sakana AI, Rakuten, ELYZA, CyberAgent, VARCO, and EXAONE are marked research-only until a supported hosted API and authorization are supplied.

## Live provider selection

Set `AI_PROVIDER` in `.env.local` to `auto`, `openai`, `claude`, `deepseek`, or `grok`. In `auto` mode HARSF uses the first configured provider in this order: Claude, OpenAI, DeepSeek, then xAI Grok. Real API keys stay only in `.env.local` and must never be committed.

## Run on Windows

Double-click `START-HARSF.cmd`. It checks for Node.js, installs the project packages on first run, and starts the HARSF web app locally. It does not use the old `runtime/start.mjs` starter.

## Manual run

```bash
npm install
npm run qa
npm run dev
```

Copy `.env.example` to `.env.local` and add only credentials you are authorized to use. Never expose provider keys to the browser in production; use a server-side gateway.

## Safety

Read-only inspection, planning, and local test runs may proceed automatically. Every code/bug-fix decision, merge, deployment, credential change, database migration, and destructive operation requires explicit Human CEO approval.
