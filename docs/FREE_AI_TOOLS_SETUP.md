# L GenZ / HARSF — Free-first AI tool integration plan

This is a **configuration guide**, not a claim that external accounts are connected or services are running. No billing, deployment, publication or secrets are authorized.

## Existing repository
HARSF is a Vite + React + TypeScript app with an AI gateway, local MCP, Ruflo, PraisonAI and n8n scripts. Preserve its Human CEO approval gate and existing screens. Run `npm run doctor`, `npm test`, and `npm run build` locally before enabling new integrations.

## Tool matrix
| Tool | Free-first use | Connection required |
| --- | --- | --- |
| ChatGPT / Codex | Plan, review and edit via authorized GitHub workflow | ChatGPT/Codex account and GitHub access |
| GitHub | Source control, issues and approval-gated PRs | Existing repository access |
| v0 | Generate or refine UI; export code for review | v0 account, manual export or authorized integration |
| Figma | Design screens and components | Figma account/authorization |
| Replit | Import GitHub project for preview and testing | Replit account and GitHub authorization |
| Supabase | Database, auth and storage; start with free tier limits | Supabase project and secure server-side credentials |
| LangGraph | Open-source agent state machine; install in isolated Python environment only after approval | Python dependencies and selected model provider |
| n8n | Existing local scripts and self-hosted workflows | Local n8n setup; workflow import approval |
| Ollama | Optional local models; hardware-dependent | Local Ollama install/model download |
| ChatGPT Plus | Interactive assistance; not a general-purpose free API key | Existing account, separate API billing if used |

## Setup order
1. Read existing README and architecture; confirm current code and tests.
2. Check local Windows environment with `npm run doctor` (read-only).
3. Use Codex for a **read-only repository audit** before changes.
4. Import or compare v0/Figma designs; do not overwrite current UI.
5. Connect Replit to a **review branch** for preview only; disable auto-deploy.
6. Create a separate Supabase development project. Never commit service-role keys.
7. Prototype LangGraph with mock agents, bounded permissions and human approval.
8. Verify existing n8n scripts before importing workflows.
9. Enable optional Ollama locally if hardware allows.
10. Add official ad integrations only after account permissions and Human CEO approval.

## Security rules
- Never commit .env, .env.local, tokens, passwords or service-role credentials.
- Do not enable automated purchases, payments, ad spend, mass messaging or production deployment.
- Any real ad launch must verify immutable campaign creative, target and budget against owner approval.
- Free plans have usage limits and may change; verify provider pricing before activating.
- Existing `main` remains unchanged until reviewed PR and explicit approval.

## Verification
```powershell
npm install
npm run doctor
npm test
npm run build
```
These commands are for a trusted local checkout. Installation may access package registries and should be done only when approved.
