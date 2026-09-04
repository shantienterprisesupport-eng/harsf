import { describe, expect, it, vi } from 'vitest';
import { advanceWorkflow, decideTask, planGoal, requiresHumanApproval } from './orchestrator';

describe('human approval policy', () => {
  it('allows reversible branch coding and bug-fix work to run automatically', () => {
    expect(requiresHumanApproval('medium', 'implement code change on isolated branch')).toBe(false);
    expect(requiresHumanApproval('medium', 'apply reversible bug fixes')).toBe(false);
  });
  it('blocks merge, deploy and other protected actions', () => {
    expect(requiresHumanApproval('low', 'merge pull request')).toBe(true);
    expect(requiresHumanApproval('medium', 'deploy release')).toBe(true);
    expect(requiresHumanApproval('medium', 'delete production database')).toBe(true);
  });
  it('blocks all high and critical risk actions', () => {
    expect(requiresHumanApproval('high', 'anything')).toBe(true);
    expect(requiresHumanApproval('critical', 'anything')).toBe(true);
  });
});

describe('AI CEO workflow', () => {
  it('delegates a goal across planning, build, QA, bug-fix and review steps', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const tasks = planGoal('build inventory app');
    expect(tasks).toHaveLength(11);
    expect(tasks[0].status).toBe('running');
    expect(tasks.at(-1)?.status).toBe('approval');
    expect(tasks.some((task) => task.agentId === 'bugfix')).toBe(true);
  });

  it('advances safe work without Human CEO clicks', () => {
    const tasks = planGoal('test');
    const next = advanceWorkflow(tasks);
    expect(next[0].status).toBe('done');
    expect(next[1].status).toBe('running');
  });

  it('records the Human CEO decision for protected actions', () => {
    const task = planGoal('test').at(-1)!;
    expect(decideTask(task, true).status).toBe('approved');
    expect(decideTask(task, false).status).toBe('rejected');
  });
});
