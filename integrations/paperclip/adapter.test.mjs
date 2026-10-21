import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPERCLIP_STATUS, planPaperclipHandoff } from './adapter.mjs';

test('integration defaults to disabled', () => {
  assert.equal(PAPERCLIP_STATUS.enabled, false);
  assert.equal(PAPERCLIP_STATUS.connected, false);
});
test('demo handoff is dry run only', () => {
  const plan = planPaperclipHandoff({ goal: 'Create welcome screen' });
  assert.equal(plan.status, 'dry-run');
  assert.equal(plan.executed, false);
  assert.equal(plan.approvalRequiredBeforeExecution, true);
});
test('sensitive work requires approval', () => {
  const plan = planPaperclipHandoff({ goal: 'deploy production app' });
  assert.equal(plan.status, 'approval-required');
  assert.equal(plan.executed, false);
});
test('empty goal is rejected', () => {
  assert.throws(() => planPaperclipHandoff({ goal: '' }), TypeError);
});
