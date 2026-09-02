import type { WorkflowTask } from '../types';

export type ExecutionState = 'idle' | 'running' | 'done' | 'failed';

export interface ExecutionResult {
  ok: boolean;
  summary?: string;
  threadId?: string | null;
  error?: string;
}

export async function executeApprovedTask(task: WorkflowTask): Promise<ExecutionResult> {
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: true, task }),
  });

  const data = await response.json().catch(() => ({ ok: false, error: 'Executor returned an invalid response.' }));
  if (!response.ok) {
    throw new Error(data.error || `Executor failed with HTTP ${response.status}.`);
  }
  return data as ExecutionResult;
}
