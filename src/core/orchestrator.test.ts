import { describe, expect, it, vi } from 'vitest';
import { buildLocalAssistantReply, classifyGoal, decideTask, isAppDraftGoal, planGoal, requiresHumanApproval, summarizeWorkflow } from './orchestrator';

describe('human approval policy', () => {
  it('blocks code changes and bug fixes for Human CEO decision', () => {
    expect(requiresHumanApproval('low', 'apply code change')).toBe(true);
    expect(requiresHumanApproval('medium', 'bug-fix proposal')).toBe(true);
  });

  it('blocks payments, API keys, delete and deploy actions', () => {
    expect(requiresHumanApproval('low', 'make payment')).toBe(true);
    expect(requiresHumanApproval('low', 'update API key')).toBe(true);
    expect(requiresHumanApproval('low', 'delete production data')).toBe(true);
    expect(requiresHumanApproval('low', 'deploy app')).toBe(true);
  });

  it('allows safe read-only analysis', () => expect(requiresHumanApproval('low', 'analyze requirements')).toBe(false));

  it('blocks all high and critical risk actions', () => {
    expect(requiresHumanApproval('high', 'anything')).toBe(true);
    expect(requiresHumanApproval('critical', 'anything')).toBe(true);
  });
});

describe('Master Assistant routing', () => {
  it('recognizes software build goals', () => expect(classifyGoal('L GenZ app banao')).toBe('build'));
  it('recognizes automation goals', () => expect(classifyGoal('n8n WhatsApp workflow connect karo')).toBe('automation'));
  it('uses general mode for normal assistant tasks', () => expect(classifyGoal('mera status summarize karo')).toBe('general'));

  it('recognizes a safe new-app request for direct draft creation', () => {
    expect(isAppDraftGoal('simple booking app banao')).toBe(true);
    expect(isAppDraftGoal('create a school dashboard')).toBe(true);
  });

  it('does not auto-run protected or non-app build work', () => {
    expect(isAppDraftGoal('booking app deploy karo')).toBe(false);
    expect(isAppDraftGoal('booking app banao aur API key add karo')).toBe(false);
    expect(isAppDraftGoal('existing bug fix karo')).toBe(false);
  });

  it('creates a goal-specific local app reply instead of one fixed fallback', () => {
    const inventoryTasks = planGoal('inventory app banao');
    const bookingTasks = planGoal('booking app banao');
    const inventoryReply = buildLocalAssistantReply('inventory app banao', inventoryTasks, 'provider offline');
    const bookingReply = buildLocalAssistantReply('booking app banao', bookingTasks, 'provider offline');
    expect(inventoryReply).toContain('inventory app banao');
    expect(bookingReply).toContain('booking app banao');
    expect(inventoryReply).not.toBe(bookingReply);
  });
});

describe('AI CEO workflow', () => {
  it('delegates a build goal across specialist agents', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const tasks = planGoal('build inventory app');
    expect(tasks).toHaveLength(7);
    expect(new Set(tasks.map((task) => task.agentId)).size).toBe(7);
    expect(tasks.some((task) => task.status === 'approval')).toBe(true);
  });

  it('uses a smaller safe plan for general tasks', () => {
    const tasks = planGoal('summarize current project status');
    expect(tasks).toHaveLength(3);
    expect(tasks.every((task) => task.status !== 'approval')).toBe(true);
  });

  it('records the Human CEO decision', () => {
    const task = planGoal('test app build')[3];
    expect(decideTask(task, true).status).toBe('approved');
    expect(decideTask(task, false).status).toBe('rejected');
  });

  it('creates DONE / DOING / BLOCKED / NEXT status', () => {
    const tasks = planGoal('build inventory app');
    const status = summarizeWorkflow(tasks, true);
    expect(status.done).toContain('workflow');
    expect(status.doing).toContain('Define app requirements');
    expect(status.blocked).toContain('approval');
    expect(status.next).toBeTruthy();
  });
});
