import { describe, expect, it, vi } from 'vitest';
import { decideTask, planGoal, requiresHumanApproval } from './orchestrator';

describe('human approval policy', () => {
  it('blocks code changes and bug fixes for Human CEO decision', () => {
    expect(requiresHumanApproval('low', 'apply code change')).toBe(true);
    expect(requiresHumanApproval('medium', 'bug-fix proposal')).toBe(true);
  });
  it('allows safe read-only analysis', () => expect(requiresHumanApproval('low', 'analyze requirements')).toBe(false));
  it('blocks all high and critical risk actions', () => {
    expect(requiresHumanApproval('high', 'anything')).toBe(true);
    expect(requiresHumanApproval('critical', 'anything')).toBe(true);
  });
});

describe('AI CEO workflow', () => {
  it('delegates a goal across specialist agents', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const tasks = planGoal('build inventory app');
    expect(tasks).toHaveLength(7);
    expect(new Set(tasks.map((task) => task.agentId)).size).toBe(7);
    expect(tasks.some((task) => task.status === 'approval')).toBe(true);
  });
  it('records the Human CEO decision', () => {
    const task = planGoal('test')[3];
    expect(decideTask(task, true).status).toBe('approved');
    expect(decideTask(task, false).status).toBe('rejected');
  });
});
