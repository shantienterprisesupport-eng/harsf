import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const runtimeDir = path.join(process.cwd(), '.harsf-runtime');
const queueFile = path.join(runtimeDir, 'queue.json');
const lockFile = path.join(runtimeDir, 'queue.lock');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureStore() {
  await mkdir(runtimeDir, { recursive: true });
  try {
    await readFile(queueFile, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') return;
    try {
      await writeFile(queueFile, '[]\n', { encoding: 'utf8', flag: 'wx' });
    } catch (createError) {
      if (createError?.code !== 'EEXIST') throw createError;
    }
  }
}

async function readQueueUnlocked() {
  await ensureStore();
  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const parsed = JSON.parse(await readFile(queueFile, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      lastError = error;
      await sleep(25);
    }
  }
  if (lastError?.code === 'ENOENT') return [];
  throw lastError || new Error('Unable to read HARSF queue.');
}

async function withQueueLock(fn) {
  await ensureStore();
  let handle = null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      handle = await open(lockFile, 'wx');
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      await sleep(25);
    }
  }
  if (!handle) throw new Error('HARSF queue is busy; please retry.');

  try {
    return await fn();
  } finally {
    try { await handle.close(); } catch {}
    try {
      const fs = await import('node:fs/promises');
      await fs.unlink(lockFile);
    } catch (error) {
      if (error?.code !== 'ENOENT') console.warn('[HARSF queue] lock cleanup warning:', error.message);
    }
  }
}

export async function readQueue() {
  return readQueueUnlocked();
}

export async function writeQueue(tasks) {
  return withQueueLock(async () => {
    await writeFile(queueFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
  });
}

export async function enqueueTask(task) {
  return withQueueLock(async () => {
    const tasks = await readQueueUnlocked();
    const item = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'queued',
      ...task,
    };
    tasks.push(item);
    await writeFile(queueFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
    return item;
  });
}

export async function updateTask(id, patch) {
  return withQueueLock(async () => {
    const tasks = await readQueueUnlocked();
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) return null;
    tasks[index] = { ...tasks[index], ...patch, updatedAt: new Date().toISOString() };
    await writeFile(queueFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
    return tasks[index];
  });
}
