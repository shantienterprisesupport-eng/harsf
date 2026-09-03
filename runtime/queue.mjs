import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const runtimeDir = path.join(process.cwd(), '.harsf-runtime');
const queueFile = path.join(runtimeDir, 'queue.json');

async function ensureStore() {
  await mkdir(runtimeDir, { recursive: true });
  try {
    await readFile(queueFile, 'utf8');
  } catch {
    await writeFile(queueFile, '[]\n', 'utf8');
  }
}

export async function readQueue() {
  await ensureStore();
  try {
    const parsed = JSON.parse(await readFile(queueFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeQueue(tasks) {
  await ensureStore();
  const temp = `${queueFile}.tmp`;
  await writeFile(temp, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
  await rename(temp, queueFile);
}

export async function enqueueTask(task) {
  const tasks = await readQueue();
  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'queued',
    ...task,
  };
  tasks.push(item);
  await writeQueue(tasks);
  return item;
}

export async function updateTask(id, patch) {
  const tasks = await readQueue();
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) return null;
  tasks[index] = { ...tasks[index], ...patch, updatedAt: new Date().toISOString() };
  await writeQueue(tasks);
  return tasks[index];
}
