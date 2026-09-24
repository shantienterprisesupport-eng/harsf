# HARSF Autonomous AI Company

Human-CEO-controlled multi-agent software factory. A user can describe an app in simple Odia, Hindi, Hinglish, or English by voice or text. The AI CEO creates a delegated workflow, while code changes, bug fixes, merges, deployments, secrets, and destructive actions stop at a Human-in-the-Loop approval gate.

## Current MVP

- Responsive voice/text CEO chat interface
- AI CEO task planner for Product, CTO, UI/UX, Developer, Database, QA, Security, BugFix, and Code Review agents
- Human approval queue and approve/reject decisions
- Context-aware Master Assistant replies with model/provider failover and goal-specific local fallback
- Live AI gateway support for OmniRoute, OpenAI/ChatGPT, Claude, DeepSeek, and xAI Grok when the corresponding authorized configuration is present
- Browser-first development can run in GitHub Codespaces so the laptop mainly needs a browser; the AI gateway and app-building tools run inside the cloud workspace
- Provider registry/adapters for Alibaba/Qwen, Zhipu/GLM, Moonshot/Kimi, MiniMax, HyperCLOVA X, Solar, and research-only providers
- Repository-scoped MCP server with local project memory and local Ollama semantic/vector recall
- Ruflo safe orchestration handoff into the six-agent PraisonAI team
- Safe app-draft builder: the Coding Agent can create real source/config/documentation files inside `.harsf-runtime/app-drafts` without changing tracked HARSF code
- Unit tests for approval policy, memory safety, app-draft path/secret safety, and agent delegation

Provider names in the UI mean the integration boundary is implemented, not that credentials or commercial access have been granted. Sakana AI, Rakuten, ELYZA, CyberAgent, VARCO, and EXAONE are marked research-only until a supported hosted API and authorization are supplied.

## Live provider selection

Set `AI_PROVIDER` to `auto`, `omniroute`, `openai`, `claude`, `deepseek`, or `grok`.

In `auto` mode, `AI_PROVIDER_ORDER` controls failover. The browser/cloud default is `anthropic,xai,omniroute,openai,deepseek`, so Claude Opus 5.5 is primary and Grok 4.7 is the first fallback when both credentials are configured. You can change the order without changing code.

The default OmniRoute base URL is `http://127.0.0.1:20128/v1`. Set `OMNIROUTE_MODEL` to the model, alias, wildcard route, or combo you configured in the OmniRoute dashboard. Real API keys must stay server-side in environment variables, `.env.local`, or GitHub Codespaces secrets and must never be committed.

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

## Safe app building

For a goal such as `booking app banao`, Ruflo can hand the request to the six-agent team. The Coding and GitHub Agent now has isolated app-draft tools and is instructed to create actual source/config/documentation files instead of only returning a generic plan.

Draft files are written only under:

```text
.harsf-runtime/app-drafts/<app-name>/
```

The draft workspace is local and ignored by Git. It blocks path traversal, `.env`/credential files, private-key formats, and real-looking secret values. The draft tools do not install packages, run generated code, edit tracked HARSF files, commit, merge, publish, or deploy. Those later actions remain separate Human CEO decisions.

A typical safe flow is:

```bash
npm run ruflo:orchestrate -- "simple booking app banao"
npm run agents:run:handoff
```

Then review the generated draft under `.harsf-runtime/app-drafts` before approving any move into a tracked project or any execution/deployment step.

## Browser-first cloud development (GitHub Codespaces)

This mode keeps the heavier runtime off an older laptop. The repository stays in GitHub, the HARSF runtime runs inside a Codespace, and the laptop only needs a browser.

1. Create a GitHub Codespace for this repository.
2. Add `ANTHROPIC_API_KEY` and `XAI_API_KEY` as GitHub Codespaces secrets. Do not paste keys into source files or commit them.
3. The dev container installs Node, Python, PraisonAI, and MCP in the cloud workspace.
4. Run `npm run dev:browser` if the preview did not start automatically.
5. Open the forwarded HARSF browser port (5173). The AI gateway remains bound to `127.0.0.1:8787` inside the Codespace, and Vite proxies `/api` and `/health` to it.
6. In `auto` mode, Claude Opus 5.5 is tried first and Grok 4.7 is the first fallback.

The generated app draft still stays in the isolated `.harsf-runtime/app-drafts` workspace until the Human CEO explicitly approves moving reviewed files into tracked GitHub project files. Merge and deployment remain separate approval steps.

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

Read-only inspection, planning, local coordination records, and isolated app-draft creation may proceed automatically. Every tracked code/bug-fix decision, merge, deployment, credential change, payment, database migration, destructive operation, and irreversible external action requires explicit Human CEO approval.
