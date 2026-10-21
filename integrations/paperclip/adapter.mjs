// HARSF optional Paperclip integration boundary.
// This module intentionally performs no network calls or subprocess execution.
// Paperclip's official interface must be verified before a live adapter is implemented.
export const PAPERCLIP_STATUS = Object.freeze({
  provider: 'paperclip',
  enabled: false,
  connected: false,
  mode: 'dry-run-only',
  verified: false,
});

const BLOCKED = /\b(deploy|publish|merge|payment|purchase|secret|credential|otp|production|delete|remove|migrate)\b/i;

export function planPaperclipHandoff({ goal, module = 'L GenZ demo' } = {}) {
  if (typeof goal !== 'string' || !goal.trim()) {
    throw new TypeError('A non-empty goal is required');
  }
  if (BLOCKED.test(goal)) {
    return { status: 'approval-required', provider: 'paperclip', executed: false, reason: 'Sensitive operation requires Human CEO review' };
  }
  return {
    status: 'dry-run',
    provider: 'paperclip',
    executed: false,
    module,
    goal: goal.trim(),
    proposedRoles: ['CEO Planner', 'Developer', 'UI Designer', 'QA Tester', 'Security Reviewer'],
    draftRoot: '.harsf-runtime/app-drafts',
    approvalRequiredBeforeExecution: true,
  };
}
