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
  { id: 'review', name: 'Code Review Agent', role: 'Final diff review', status: 'ready' },
];

const protectedAction = /(bug.?fix|code change|merge|deploy|secret|credential|api.?key|payment|purchase|migration|delete|production|publish|send money|send (?:an? )?(?:email|message)|post (?:a )?(?:message|comment)|whatsapp (?:message|send))/i;

export function requiresHumanApproval(risk: Risk, action: string): boolean {
  return protectedAction.test(action) || risk === 'high' || risk === 'critical';
}

export type GoalMode = 'build' | 'automation' | 'general';

export function classifyGoal(goal: string): GoalMode {
  if (/(n8n|automation|workflow|whatsapp|gmail|email|calendar|webhook|api connect|integrat)/i.test(goal)) return 'automation';
  if (/(build|banao|bana do|create|app|website|code|software|fix|bug|feature|ui|dashboard)/i.test(goal)) return 'build';
  return 'general';
}

export function planGoal(goal: string): WorkflowTask[] {
  const mode = classifyGoal(goal);
  const steps = mode === 'general'
    ? [
        ['product', 'Understand request and success criteria', 'low'],
        ['cto', 'Prepare safe execution plan', 'low'],
        ['qa', 'Verify answer or result', 'low'],
      ] as const
    : mode === 'automation'
      ? [
          ['product', 'Define automation outcome', 'low'],
          ['cto', 'Map workflow and integrations', 'medium'],
          ['developer', 'Implement automation or connector change', 'high'],
          ['qa', 'Test workflow and failure paths', 'medium'],
          ['security', 'Review credentials and data handling', 'high'],
          ['review', 'Review change and release decision', 'critical'],
        ] as const
      : [
          ['product', 'Define requirements', 'low'],
          ['cto', 'Design architecture', 'medium'],
          ['ux', 'Prepare user interface', 'medium'],
          ['developer', 'Implement code change', 'high'],
          ['qa', 'Run QA and regression tests', 'medium'],
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

export interface WorkflowStatus {
  done: string;
  doing: string;
  blocked: string;
  next: string;
}

function shortTitle(task?: WorkflowTask) {
  return task ? task.title.split(':')[0] : 'None';
}

export function summarizeWorkflow(tasks: WorkflowTask[], gatewayReady: boolean | null): WorkflowStatus {
  if (tasks.length === 0) {
    return {
      done: 'Assistant ready',
      doing: gatewayReady === null ? 'Checking AI connection' : 'Waiting for your command',
      blocked: gatewayReady === false ? 'AI key not connected; planning still works' : 'None',
      next: 'Speak or type a task',
    };
  }

  const approvals = tasks.filter((task) => task.status === 'approval');
  const rejected = tasks.filter((task) => task.status === 'rejected');
  const running = tasks.find((task) => task.status === 'running');
  const next = tasks.find((task) => task.status === 'queued') ?? approvals[0];
  const decided = tasks.filter((task) => task.status === 'approved' || task.status === 'rejected');

  return {
    done: decided.length ? `${decided.length} decision${decided.length === 1 ? '' : 's'} recorded` : 'Goal understood + workflow created',
    doing: shortTitle(running),
    blocked: rejected.length ? `${rejected.length} task${rejected.length === 1 ? '' : 's'} rejected` : approvals.length ? `${approvals.length} approval${approvals.length === 1 ? '' : 's'} waiting for you` : 'None',
    next: shortTitle(next),
  };
}
