# HARSF Autonomous AI Company

Human-CEO-controlled multi-agent software factory. A user can describe an app in simple Odia, Hindi, Hinglish, or English by voice or text. The AI CEO creates a delegated workflow, while code changes, bug fixes, merges, deployments, secrets, and destructive actions stop at a Human-in-the-Loop approval gate.

## Current MVP

- Responsive voice/text CEO chat interface
- AI CEO task planner for Product, CTO, UI/UX, Developer, Database, QA, Security, BugFix, and Code Review agents
- Human approval queue and approve/reject decisions
- Live AI gateway support for OmniRoute, OpenAI/ChatGPT, Claude, DeepSeek, and xAI Grok when the corresponding authorized configuration is present
- OmniRoute can sit in front of HARSF as the preferred smart routing/fallback layer while direct providers remain available as explicit alternatives
- Provider registry/adapters for Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, Solar, and research-only providers
- Repository-scoped MCP server with local project memory and local Ollama semantic/vector recall
- Ruflo safe orchestration handoff into the six-agent PraisonAI team
- Unit tests for approval policy, memory safety, and agent delegation

Provider names in the UI mean the integration boundary is implemented, not that credentials or commercial access have been granted. Sakana AI, Rakuten, ELYZA, CyberAgent, VARCO, and EXAONE are marked research-only until a supported hosted API and authorization are supplied.

## Live provider selection

Set `AI_PROVIDER` in `.env.local` to `auto`, `omniroute`, `openai`, `claude`, `deepseek`, or `grok`.

When OmniRoute is configured with `OMNIROUTE_API_KEY`, a valid `OMNIROUTE_BASE_URL`, and `OMNIROUTE_MODEL`, `auto` mode prefers OmniRoute first so its own routing/fallback rules can choose among providers. If OmniRoute is not fully configured, HARSF falls back to the first configured direct provider in this order: Claude, OpenAI, DeepSeek, then xAI Grok.

The default OmniRoute base URL is `http://127.0.0.1:20128/v1`. Set `OMNIROUTE_MODEL` to the model, alias, wildcard route, or combo you configured in the OmniRoute dashboard. Real API keys stay only in `.env.local` and must never be committed.

## HARSF Doctor

Double-click `HARSF-DOCTOR.cmd` or run `npm run doctor` to get a read-only local status report. It checks Node/npm, local provider configuration without printing secret values, the AI gateway health endpoint, PraisonAI, Ruflo availability, Docker/n8n, and the six-agent intake workflow. The summary is shown as `DONE / BLOCKED / NEXT`. Doctor mode does not install packages, start services, change credentials, merge, deploy, or write production data.

## Ruflo orchestration

Double-click `RUFLO-HARSF.cmd` or run:

```bash
npm run ruflo:orchestrate -- "describe the HARSF task"
```

The runner stays inside the HARSF repository and uses Ruflo to initialize a six-slot hierarchical swarm, route the Human CEO goal, and create a specialized task-orchestration record. It then writes a non-secret local handoff to `.harsf-runtime/ruflo-handoff.json`; that directory is ignored by Git.

Goals that directly request merge, deployment/production changes, credentials/secrets/OTP, payments/purchases, destructive actions, or production database migrations are stopped at the Human CEO approval gate before Ruflo execution.

Ruflo coordination does **not** automatically start a PraisonAI model call. When the handoff is ready and you intentionally want the configured model/provider to be used, run:

```bash
npm run agents:run:handoff
```

This keeps orchestration and potentially billable model execution as two explicit steps.

## Run on Windows

Double-click `START-HARSF.cmd`. It checks for Node.js, installs the project packages on first run, and starts the HARSF web app locally. It does not use the old `runtime/start.mjs` starter.

## Manual run

```bash
npm install
npm run qa
npm run doctor
npm run ruflo:self-test
npm run dev
```

Copy `.env.example` to `.env.local` and add only credentials you are authorized to use. Never expose provider keys to the browser in production; use a server-side gateway.

## Safety

Read-only inspection, planning, local coordination records, and local test runs may proceed automatically. Every code/bug-fix decision, merge, deployment, credential change, payment, database migration, destructive operation, and irreversible external action requires explicit Human CEO approval.
