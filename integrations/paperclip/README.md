# Paperclip AI — optional HARSF adapter (not connected)

Tracking: #37. This is a **safe, disabled-by-default dry-run boundary**, not a working Paperclip connection.

## Current behavior
- No dependency installation, API calls, model usage, payments or subprocesses.
- `planPaperclipHandoff({ goal, module })` returns a proposed role assignment only.
- Sensitive requests return `approval-required` and never execute.
- HARSF's existing Ruflo/PraisonAI and Ollama paths remain unchanged.

## Before enabling
1. Verify Paperclip's official upstream project, license, current interface and Windows compatibility.
2. Document exact local installation and authentication requirements, without committing credentials.
3. Build a separately reviewed implementation behind an explicit opt-in.
4. Keep work repo-scoped and drafts inside `.harsf-runtime/app-drafts`.
5. Require Human CEO approval before tracked code writes, merges, deployments, spending, secrets, database migrations or destructive actions.
6. Add unit/integration tests and run Windows QA; show results and diff for approval.

No live deployment, production database, real OTP or real payment integrations are permitted by this adapter.
