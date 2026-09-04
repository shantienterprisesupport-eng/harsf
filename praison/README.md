# HARSF PraisonAI Integration

This directory contains the safe PraisonAI starter for the HARSF Autonomous AI Company.

## Windows setup

From the repository root:

```powershell
npm run agents:setup
```

This creates a local Python virtual environment, installs PraisonAI, initializes Ruflo, and runs basic verification.

## Verify later

```powershell
npm run agents:verify
```

## Safety boundary

The PraisonAI starter is plan/review-only. It has no filesystem, deployment, secret, database-mutation, or destructive tools. HARSF's existing Human CEO approval policy remains required before code changes, bug fixes, merges, deployments, secrets, migrations, deletes, or production actions.
