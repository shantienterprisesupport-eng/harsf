import { spawn } from 'node:child_process';
import { readQueue, updateTask } from './queue.mjs';

const SAFE_COMMANDS = {
  test: ['npm', ['run', 'test']],
  build: ['npm', ['run', 'build']],
  qa: ['npm', ['run', 'qa']],
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runSafeCommand(type) {
  const [rawCommand, args] = SAFE_COMMANDS[type];
  const command = process.platform === 'win32' && rawCommand === 'npm' ? 'npm.cmd' : rawCommand;
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
      if (output.length > 12000) output = output.slice(-12000);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', (error) => resolve({ ok: false, output: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, output, code }));
  });
}

async function handleTask(task) {
  await updateTask(task.id, { status: 'running', startedAt: new Date().toISOString() });

  if (task.type === 'goal') {
    // A real coding goal needs a configured model/tool adapter. Keep the goal persistent
    // instead of pretending that work happened.
    await updateTask(task.id, {
      status: 'blocked',
      blocker: 'MODEL_ADAPTER_REQUIRED',
      result: 'Goal saved. Connect one approved model/tool adapter before autonomous code changes can execute.',
    });
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

console.log('[HARSF worker] online');
while (true) {
  const tasks = await readQueue();
  const next = tasks.find((task) => task.status === 'queued');
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
