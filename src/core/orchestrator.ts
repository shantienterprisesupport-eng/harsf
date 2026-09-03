import type { Agent, Risk, WorkflowTask } from '../types';

export const agents: Agent[] = [
  { id: 'cto', name: 'CTO Agent', role: 'Architecture & technical plan', status: 'ready' },
  { id: 'product', name: 'Product Agent', role: 'Requirements & acceptance criteria', status: 'ready' },
  { id: 'developer', name: 'Developer Agent', role: 'Implementation', status: 'ready' },
  { id: 'ux', name: 'UI/UX Agent', role: 'Interface & accessibility', status: 'ready' },
  { id: 'database', name: 'Database Agent', role: 'Schema & vector memory', status: 'ready' },
  { id: 'qa', name: 'QA Agent', role: 'Tests & regression', status: 'ready' },
  { id: 'security', name: 'Security Agent', role: 'Threat & secret review', status: 'ready' },
  { id: 'bugfix', name: 'BugFix Agent', role: 'Diagnose and apply reversible fixes', status: 'ready' },
  { id: 'review', name: 'Code Review Agent', role: 'Final diff review', status: 'ready' },
];

export function requiresHumanApproval(risk: Risk, action: string): boolean {
  const irreversibleAction = /(merge|deploy|release|production|secret|migration|delete|force.?push)/i.test(action);
  return irreversibleAction || risk === 'high' || risk === 'critical';
}

export function planGoal(goal: string): WorkflowTask[] {
  const steps = [
    ['product', 'Define requirements', 'low'],
    ['cto', 'Design architecture', 'medium'],
    ['ux', 'Prepare user interface', 'low'],
    ['database', 'Prepare data and memory plan', 'medium'],
    ['developer', 'Implement code change on isolated branch', 'medium'],
    ['qa', 'Run QA and regression tests', 'medium'],
    ['security', 'Run security review', 'medium'],
    ['bugfix', 'Apply reversible bug fixes if tests fail', 'medium'],
    ['qa', 'Retest after fixes', 'medium'],
    ['review', 'Review final diff', 'medium'],
    ['review', 'Merge or deploy release', 'critical'],
  ] as const;

  return steps.map(([agentId, title, risk], index) => ({
    id: `${Date.now()}-${index}`,
    title: `${title}: ${goal}`,
    agentId,
    risk,
    status: requiresHumanApproval(risk, title) ? 'approval' : index === 0 ? 'running' : 'queued',
    reason: requiresHumanApproval(risk, title)
      ? 'Human CEO approval required only for protected or irreversible execution.'
      : undefined,
  }));
}

export function advanceWorkflow(tasks: WorkflowTask[]): WorkflowTask[] {
  if (tasks.length === 0) return tasks;

  const runningIndex = tasks.findIndex((task) => task.status === 'running');
  if (runningIndex >= 0) {
    const next = tasks.map((task, index) => index === runningIndex ? { ...task, status: 'done' as const } : task);
    const nextQueued = next.findIndex((task, index) => index > runningIndex && task.status === 'queued');
    if (nextQueued >= 0) {
      next[nextQueued] = { ...next[nextQueued], status: 'running' };
    }
    return next;
  }

  const nextQueued = tasks.findIndex((task) => task.status === 'queued');
  if (nextQueued >= 0) {
    return tasks.map((task, index) => index === nextQueued ? { ...task, status: 'running' as const } : task);
  }

  return tasks;
}

export function decideTask(task: WorkflowTask, approved: boolean): WorkflowTask {
  if (task.status !== 'approval') return task;
  return { ...task, status: approved ? 'approved' : 'rejected' };
}
