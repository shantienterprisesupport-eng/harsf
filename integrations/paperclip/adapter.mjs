// Optional Paperclip planning boundary. No external execution or network calls.
export const PAPERCLIP_STATUS = Object.freeze({
  provider: 'paperclip', enabled: false, connected: false,
  mode: 'dry-run-only', verified: false,
});

// Conservative review triggers. These are advisory; never an authorization mechanism.
const SENSITIVE = /\b(deploy(?:ment)?|publish|release|merge|push|commit|payment|pay|purchase|billing|spend|secret|credential|api[ -]?key|token|password|otp|production|prod|delete|remove|wipe|drop|migrat(?:e|ion)|database|db|live)\b|डिप्लॉय|पेमेंट|पासवर्ड|ओटीपी|डिलीट|मर्ज/i;
const ROLES = Object.freeze(['CEO Planner', 'Developer', 'UI Designer', 'QA Tester', 'Security Reviewer']);

export function planPaperclipHandoff({ goal, module = 'L GenZ demo' } = {}) {
  if (typeof goal !== 'string' || !goal.trim()) throw new TypeError('A non-empty goal is required');
  if (typeof module !== 'string' || !module.trim()) throw new TypeError('A non-empty module is required');
  const needsReview = SENSITIVE.test(goal) || SENSITIVE.test(module);
  return {
    status: needsReview ? 'approval-required' : 'dry-run',
    provider: 'paperclip',
    executed: false,
    module: module.trim(),
    goal: goal.trim(),
    proposedRoles: [...ROLES],
    draftRoot: '.harsf-runtime/app-drafts',
    approvalRequiredBeforeExecution: true,
    ...(needsReview ? { reason: 'Sensitive operation requires Human CEO review' } : {}),
  };
}
