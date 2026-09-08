# HARSF Autonomous AI Company

Human-CEO-controlled multi-agent software factory. A user can describe an app in simple Odia, Hindi, Hinglish, or English by voice or text. The AI CEO creates a delegated workflow, while code changes, bug fixes, merges, deployments, secrets, and destructive actions stop at a Human-in-the-Loop approval gate.

## Current MVP

- Responsive voice/text CEO chat interface
- AI CEO task planner for Product, CTO, UI/UX, Developer, Database, QA, Security, BugFix, and Code Review agents
- Human approval queue and approve/reject decisions
- DONE / DOING / BLOCKED / NEXT workflow status plus per-agent activity status
- Voice language selector for Hindi/Hinglish, Odia, and English
- Live provider health badges that distinguish ACTIVE, CONNECTED, NOT CONFIGURED, ADAPTER, and RESEARCH without exposing keys
- Live AI gateway support for OmniRoute, OpenAI/ChatGPT, Claude, DeepSeek, xAI Grok, Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, and Upstage/Solar when authorized configuration is present
- OmniRoute can sit in front of HARSF as the preferred smart routing/fallback layer while direct providers remain available as explicit alternatives
- Repository-scoped MCP server with local project memory and local Ollama semantic/vector recall
- Ruflo safe orchestration handoff into the six-agent PraisonAI team
- Safety-bounded local n8n import, status, and handoff flow
- CI tests for approval policy, provider routing, secret leakage, memory safety, n8n/Ruflo safety, and agent delegation

Provider names in the UI do not imply credentials or commercial access. The UI separates live connected providers from unconfigured and research-only integrations. Sakana AI, Rakuten, ELYZA, CyberAgent, VARCO, and EXAONE remain research-only until a supported hosted API and authorization are supplied.

## Live provider selection

Set `AI_PROVIDER` in `.env.local` to `auto` or an explicit provider. Supported names/aliases include:

- `omniroute` / `omni`
- `openai`
- `claude` / `anthropic`
- `deepseek`
- `grok` / `xai`
- `alibaba` / `qwen` / `dashscope`
- `zhipu` / `glm` / `bigmodel`
- `moonshot` / `kimi`
- `minimax`
- `hyperclova` / `naver` / `clova`
- `upstage` / `solar`

When OmniRoute is fully configured, `auto` mode prefers it first so its own routing/fallback rules can choose among providers. Without OmniRoute, HARSF tries configured direct providers in this order: Claude, OpenAI, DeepSeek, xAI, Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, then Upstage/Solar.

The default OmniRoute base URL is `http://127.0.0.1:20128/v1`. Set `OMNIROUTE_MODEL` to the model, alias, wildcard route, or combo configured in OmniRoute.

For Alibaba Cloud Model Studio, `ALIBABA_BASE_URL` is intentionally required instead of guessed because the OpenAI-compatible endpoint varies by region/workspace and must match the API key. Other newly live providers have documented default OpenAI-compatible base URLs in `.env.example`, but every base URL/model can be overridden locally.

Real API keys stay only in `.env.local` and must never be committed. The gateway `/health` response exposes only safe connection metadata: provider id, configured/active booleans, and configured model names. It never returns API key values.

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

## n8n local execution

Use `N8N-HARSF.cmd` or the explicit commands:

```bash
npm run n8n:start
npm run n8n:import
npm run n8n:status
```

The imported starter workflow remains inactive until it is reviewed and manually activated. Safe local handoff only permits planning/read-only goals; protected mutations, external messages, credentials, payments, merge/deploy, destructive actions, and production migrations remain blocked for Human CEO approval.

## Morning laptop verification

The remaining checks that require the actual Windows laptop/runtime are:

1. Run `npm run doctor` and confirm Node, provider, Ruflo, Docker/n8n, PraisonAI, and MCP status.
2. Start the AI gateway and HARSF app, then send `HARSF ka current status check karo` and verify the real model reply.
3. Confirm the provider panel shows the expected ACTIVE/CONNECTED provider without exposing a key.
4. Test microphone input once each for Hindi/Hinglish, Odia, and English in the installed browser.
5. Start Docker/n8n, import the workflow, review it, then activate it manually only if the local review is satisfactory.
6. Run one safe n8n handoff and one Ruflo-to-PraisonAI handoff with a non-sensitive test goal.

Do not paste passwords, OTPs, payment data, or API keys into chat, screenshots, GitHub, or committed files during these checks.

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

Read-only inspection, planning, local coordination records, and local test runs may proceed automatically. Every code/bug-fix decision, merge, deployment, credential change, payment, database migration, destructive operation, external message, and irreversible external action requires explicit Human CEO approval.
