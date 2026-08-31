# HARSF Autonomous AI Company

Human-CEO-controlled multi-agent software factory. A user can describe an app in simple Odia, Hindi, Hinglish, or English by voice or text. The AI CEO creates a delegated workflow, while code changes, bug fixes, merges, deployments, secrets, and destructive actions stop at a Human-in-the-Loop approval gate.

## Current MVP

- Responsive voice/text CEO chat interface
- AI CEO task planner for Product, CTO, UI/UX, Developer, Database, QA, Security, BugFix, and Code Review agents
- Human approval queue and approve/reject decisions
- Provider registry/adapters for Claude, DeepSeek, Grok, Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, Solar, and research-only providers
- MCP connection contract for scoped local Git, GitHub, and vector memory
- Unit tests for approval policy and agent delegation

Provider names in the UI mean the integration boundary is implemented, not that credentials or commercial access have been granted. Sakana AI, Rakuten, ELYZA, CyberAgent, VARCO, and EXAONE are marked research-only until a supported hosted API and authorization are supplied.

## Run

```bash
npm install
npm run qa
npm run dev
```

Copy `.env.example` to `.env.local` and add only credentials you are authorized to use. Never expose provider keys to the browser in production; use a server-side gateway.

## Safety

Read-only inspection, planning, and local test runs may proceed automatically. Every code/bug-fix decision, merge, deployment, credential change, database migration, and destructive operation requires explicit Human CEO approval.
