# HARSF PraisonAI Integration

This directory contains the HARSF six-agent PraisonAI team plus a workspace-scoped local worker.

## Windows setup

From the repository root:

```powershell
npm run agents:setup
```

This creates a local Python virtual environment, installs PraisonAI, initializes Ruflo, and runs basic verification.

## Start the Master Agent

```powershell
npm run agents:run
```

The terminal stays open in an interactive loop:

```text
Human CEO > fix the login bug, run tests, and show me the diff
```

For normal project work the agents can inspect and edit ordinary text/code files inside the HARSF repository and run allowlisted checks such as tests, build, QA, Git status/diff/log, Ruflo doctor, and n8n status.

## Verify later

```powershell
npm run agents:verify
```

## Safety boundary

- The worker is restricted to the HARSF repository root.
- `.env`, credentials, private keys, generated dependency folders, and other secret paths are blocked.
- Arbitrary shell execution is not exposed to the model.
- Deployment, merge, payment, OTP, credential changes, database migrations, destructive actions, and irreversible external actions remain behind Human CEO approval.
- Creating a local Git checkpoint requires the human to type `Y` in the terminal.

This keeps the agent useful for coding and QA without giving it unrestricted control of the whole laptop.
