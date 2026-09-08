# Personal Master AI Agent

Standalone personal AI orchestrator for Windows. It accepts a goal in Hindi, Hinglish, Odia, or English, delegates planning/coding/QA/security/ops work, and keeps protected actions behind Human CEO approval.

## Windows start
1. Copy `.env.example` to `.env.local`.
2. Add your authorized AI provider key locally. Never commit `.env.local`.
3. Double-click `MASTER-AI.cmd`.

The first run creates a Python virtual environment and installs PraisonAI.

## Safety gates
The agent must stop for explicit human approval before passwords, OTPs, payments, secrets, credential changes, deployments, merges, database migrations, destructive actions, access-control changes, or irreversible external actions.

## Provider setup
Default provider is Claude/Anthropic. OpenAI can also be selected by changing `AI_PROVIDER` in `.env.local`.

This branch intentionally contains only the Personal Master AI files, separate from the HARSF business app tree.
