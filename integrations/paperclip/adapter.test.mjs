import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPERCLIP_STATUS, planPaperclipHandoff } from './adapter.mjs';

test('integration is disabled and disconnected', () => {
  assert.equal(PAPERCLIP_STATUS.enabled, false);
  assert.equal(PAPERCLIP_STATUS.connected, false);
  assert.equal(PAPERCLIP_STATUS.verified, false);
});
test('demo plan never executes', () => {
  const plan = planPaperclipHandoff({ goal: 'Create welcome screen' });
  assert.equal(plan.status, 'dry-run');
  assert.equal(plan.executed, false);
  assert.equal(plan.approvalRequiredBeforeExecution, true);
});
for (const goal of ['deploy production app', 'commit code', 'push to GitHub', 'delete database', 'use API key', 'पेमेंट करो']) {
  test('review required: ' + goal, () => {
    const plan = planPaperclipHandoff({ goal });
    assert.equal(plan.status, 'approval-required');
    assert.equal(plan.executed, false);
  });
}
test('module also requires review when sensitive', () => {
  assert.equal(planPaperclipHandoff({ goal: 'Create screen', module: 'production database' }).status, 'approval-required');
});
test('invalid inputs rejected', () => {
  assert.throws(() => planPaperclipHandoff({ goal: '' }), TypeError);
  assert.throws(() => planPaperclipHandoff({ goal: 1 }), TypeError);
  assert.throws(() => planPaperclipHandoff({ goal: 'ok', module: '' }), TypeError);
});
