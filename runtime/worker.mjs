import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readQueue, updateTask } from './queue.mjs';
import { applyEdits, generateCodeEdits, modelConfigured, rollbackEdits, smokeTestModel } from './model.mjs';

const SAFE_COMMANDS = {
  test: ['npm', ['run', 'test']],
  build: ['npm', ['run', 'build']],
  qa: ['npm', ['run', 'qa']],
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const heartbeatFile = path.join(process.cwd(), '.harsf-runtime', 'worker-heartbeat.json');

async function heartbeat() {
  await fs.mkdir(path.dirname(heartbeatFile), { recursive: true });
  await fs.writeFile(heartbeatFile, JSON.stringify({ pid: process.pid, updatedAt: new Date().toISOString() }), 'utf8');
}

function windowsSafeCommand(command, args) {
  if (process.platform === 'win32' && command === 'npm') {
    const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    return { command: comspec, args: ['/d', '/s', '/c', `npm ${args.join(' ')}`] };
  }
  return { command, args };
}

function runCommand(rawCommand, rawArgs) {
  const { command, args } = windowsSafeCommand(rawCommand, rawArgs);
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: process.env,
    });

    let output = '';
    const capture = (chunk) => {
      output += chunk.toString();
      if (output.length > 16000) output = output.slice(-16000);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', (error) => resolve({ ok: false, output: error.message, code: null }));
    child.on('close', (code) => resolve({ ok: code === 0, output, code }));
  });
}

function runSafeCommand(type) {
  const [command, args] = SAFE_COMMANDS[type];
  return runCommand(command, args);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWhitespaceTolerantMatch(text, needle) {
  const trimmed = String(needle || '').trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/).map(escapeRegExp);
  const matcher = new RegExp(tokens.join('\\s+'), 'g');
  const matches = [...text.matchAll(matcher)];
  if (matches.length !== 1) return null;
  return matches[0][0];
}

async function normalizePatchEdits(edits) {
  const root = process.cwd();
  const normalized = [];

  for (const edit of edits) {
    if (typeof edit.find !== 'string') {
      normalized.push(edit);
      continue;
    }

    let current;
    try {
      current = await fs.readFile(path.join(root, edit.path), 'utf8');
    } catch {
      normalized.push(edit);
      continue;
    }

    const first = current.indexOf(edit.find);
    const exactUnique = first !== -1 && current.indexOf(edit.find, first + edit.find.length) === -1;
    if (exactUnique) {
      normalized.push(edit);
      continue;
    }

    const tolerant = findWhitespaceTolerantMatch(current, edit.find);
    normalized.push(tolerant ? { ...edit, find: tolerant } : edit);
  }

  return normalized;
}

async function runSelfTest(task) {
  try {
    await updateTask(task.id, { status: 'running', phase: 'model-smoke', result: 'Checking local AI model...' });
    const modelReply = await smokeTestModel();
    await updateTask(task.id, { phase: 'qa', result: `Local model replied: ${modelReply}. Running QA...` });
    const qa = await runSafeCommand('qa');
    if (!qa.ok) {
      await updateTask(task.id, {
        status: 'failed',
        phase: 'qa-failed',
        finishedAt: new Date().toISOString(),
        result: `Self-test: model OK, QA failed.\n${qa.output.slice(-6000)}`,
      });
      return;
    }
    await updateTask(task.id, {
      status: 'done',
      phase: 'complete',
      finishedAt: new Date().toISOString(),
      result: 'AUTOPILOT VERIFIED: local Ollama model + HARSF worker + QA are working.',
    });
  } catch (error) {
    await updateTask(task.id, {
      status: 'failed',
      phase: 'self-test-failed',
      finishedAt: new Date().toISOString(),
      result: `AUTOPILOT SELF-TEST FAILED: ${String(error)}`,
    });
  }
}

async function runCodingGoal(task) {
  if (!modelConfigured()) {
    await updateTask(task.id, {
      status: 'blocked',
      blocker: 'MODEL_ADAPTER_REQUIRED',
      result: 'Background runtime is ready, but one model adapter still needs HARSF_MODEL_API_URL, HARSF_MODEL_API_KEY and HARSF_MODEL_NAME.',
    });
    return;
  }

  let feedback = '';
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await updateTask(task.id, { status: 'running', phase: `coding-attempt-${attempt}` });
    let backups = [];
    try {
      const proposal = await generateCodeEdits(task.goal, feedback);
      if (proposal.edits.length === 0) {
        await updateTask(task.id, { status: 'done', result: proposal.summary, finishedAt: new Date().toISOString() });
        return;
      }

      const normalizedEdits = await normalizePatchEdits(proposal.edits);
      backups = await applyEdits(normalizedEdits);
      await updateTask(task.id, { phase: 'qa', result: `${proposal.summary}\nRunning QA...` });
      const qa = await runSafeCommand('qa');
      if (qa.ok) {
        await updateTask(task.id, {
          status: 'done',
          phase: 'complete',
          finishedAt: new Date().toISOString(),
          result: `${proposal.summary}\n\nQA PASSED\n${qa.output.slice(-6000)}`,
          files: normalizedEdits.map((edit) => edit.path),
        });
        return;
      }

      await rollbackEdits(backups);
      backups = [];
      feedback = qa.output;
      await updateTask(task.id, { phase: 'bugfix', result: `QA failed on attempt ${attempt}; changes rolled back safely. BugFix Agent preparing retry.` });
    } catch (error) {
      if (backups.length) await rollbackEdits(backups);
      const errorText = String(error);
      if (errorText.includes('MODEL_ADAPTER_REQUIRED')) {
        await updateTask(task.id, { status: 'blocked', blocker: 'MODEL_ADAPTER_REQUIRED', result: errorText });
        return;
      }

      const patchMismatch = errorText.includes('Patch text not found') || errorText.includes('Patch text is not unique');
      feedback = patchMismatch
        ? `${errorText}\nPATCH RECOVERY REQUIRED: the previous find text did not exactly match the repository. Do not reuse that find string. On the next attempt use a much smaller unique find copied character-for-character from CURRENT REPOSITORY SNAPSHOT, or return complete file content when the entire target file is visible. Keep the edit minimal.`
        : errorText;

      if (attempt < maxAttempts) {
        await updateTask(task.id, {
          phase: patchMismatch ? 'patch-recovery' : 'bugfix',
          result: patchMismatch
            ? `Patch mismatch on attempt ${attempt}; safe recovery retry is preparing an exact repository match.`
            : `Attempt ${attempt} failed safely; BugFix Agent preparing retry.`,
        });
      }

      if (attempt === maxAttempts) {
        await updateTask(task.id, { status: 'failed', finishedAt: new Date().toISOString(), result: feedback });
        return;
      }
    }
  }

  await updateTask(task.id, {
    status: 'failed',
    finishedAt: new Date().toISOString(),
    result: `Safe coding attempts failed. No failing code was kept.\n${feedback.slice(-8000)}`,
  });
}

async function handleTask(task) {
  await updateTask(task.id, { status: 'running', startedAt: new Date().toISOString() });

  if (task.type === 'selftest') {
    await runSelfTest(task);
    return;
  }

  if (task.type === 'goal') {
    await runCodingGoal(task);
    return;
  }

  if (!(task.type in SAFE_COMMANDS)) {
    await updateTask(task.id, { status: 'blocked', blocker: 'UNSUPPORTED_TASK' });
    return;
  }

  const result = await runSafeCommand(task.type);
  await updateTask(task.id, {
    status: result.ok ? 'done' : 'failed',
    finishedAt: new Date().toISOString(),
    result: result.output,
    exitCode: result.code ?? null,
  });
}

console.log(`[HARSF worker] online | model adapter: ${modelConfigured() ? 'configured' : 'waiting for configuration'}`);
await heartbeat();
setInterval(() => void heartbeat().catch((error) => console.warn('[HARSF worker] heartbeat warning:', error.message)), 2000);

while (true) {
  const tasks = await readQueue();
  const next = tasks.find((task) => task.type === 'selftest' && task.status === 'queued') || tasks.find((task) => task.status === 'queued');
  if (next) {
    try {
      await handleTask(next);
    } catch (error) {
      await updateTask(next.id, { status: 'failed', result: String(error) });
    }
  } else {
    await delay(1000);
  }
}
