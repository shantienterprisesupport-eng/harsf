import type { Agent, Risk, WorkflowTask } from '../types';

export const agents: Agent[] = [
  { id: 'cto', name: 'CTO Agent', role: 'Architecture & technical plan', status: 'ready' },
  { id: 'product', name: 'Product Agent', role: 'Requirements & acceptance criteria', status: 'ready' },
  { id: 'developer', name: 'Developer Agent', role: 'Implementation', status: 'ready' },
  { id: 'ux', name: 'UI/UX Agent', role: 'Interface & accessibility', status: 'ready' },
  { id: 'database', name: 'Database Agent', role: 'Schema & vector memory', status: 'ready' },
  { id: 'qa', name: 'QA Agent', role: 'Tests & regression', status: 'ready' },
  { id: 'security', name: 'Security Agent', role: 'Threat & secret review', status: 'ready' },
  { id: 'bugfix', name: 'BugFix Agent', role: 'Diagnose and propose fixes', status: 'ready' },
  { id: 'retest', name: 'Retest Agent', role: 'Verify fixes and regression safety', status: 'ready' },
  { id: 'review', name: 'Code Review Agent', role: 'Final diff review', status: 'ready' },
];

export function requiresHumanApproval(risk: Risk, action: string): boolean {
  const protectedAction = /(bug.?fix|code change|merge|deploy|secret|migration|delete|production)/i.test(action);
  return protectedAction || risk === 'high' || risk === 'critical';
}

export function planGoal(goal: string): WorkflowTask[] {
  const steps = [
    ['product', 'Define requirements', 'low'],
    ['cto', 'Design architecture', 'medium'],
    ['ux', 'Prepare user interface', 'medium'],
    ['developer', 'Implement code change', 'high'],
    ['qa', 'Run QA and regression tests', 'medium'],
    ['bugfix', 'Fix discovered bugs', 'high'],
    ['retest', 'Retest fixes and regression safety', 'medium'],
    ['security', 'Review security and secrets', 'high'],
    ['review', 'Review code and merge decision', 'critical'],
  ] as const;

  return steps.map(([agentId, title, risk], index) => ({
    id: `${Date.now()}-${index}`,
    title: `${title}: ${goal}`,
    agentId,
    risk,
    status: requiresHumanApproval(risk, title) ? 'approval' : index === 0 ? 'running' : 'queued',
    reason: requiresHumanApproval(risk, title) ? 'Human CEO approval required before execution.' : undefined,
  }));
}

export function decideTask(task: WorkflowTask, approved: boolean): WorkflowTask {
  if (task.status !== 'approval') return task;
  return { ...task, status: approved ? 'approved' : 'rejected' };
}
