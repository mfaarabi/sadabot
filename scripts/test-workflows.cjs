const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Billing = vm.runInNewContext(fs.readFileSync('dist/billing.js', 'utf8') + ';Billing');
const Workflows = vm.runInNewContext(fs.readFileSync('dist/billing.js', 'utf8') + '\n' + fs.readFileSync('dist/workflows.js', 'utf8') + ';Workflows');
const tests = [];
function test(name, body) { body(); tests.push(name); }
const tenant = (start = '2026-01-01', months = 6, total = 6000000, extra = {}) => ({ id: 't1', start, day: Number(start.slice(8, 10)), endDate: undefined, agreements: [{ start, months, total, day: Number(start.slice(8, 10)) }], ...extra });
const stateFor = (t, payments = [], reminders = [], renewals = {}) => ({ tenants: [t], payments, reminders, renewals });

test('one full-term obligation for multimonth agreements; no monthly duplicates', () => {
  const out = Workflows.obligations(stateFor(tenant()), '2026-01-01');
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 't1:2026-01');
  assert.equal(out[0].months, 6);
  assert.equal(out[0].total, 6000000);
  assert.equal(out[0].end, '2026-06-30');
});

test('unresolved historic obligation remains after tenancy departure', () => {
  const out = Workflows.obligations(stateFor(tenant('2024-01-15', 3, 3000000, { endDate: '2024-02-10' })), '2026-10-30');
  assert.equal(out.length, 1);
  assert.equal(out[0].months, 2);
  assert.equal(out[0].state, 'needs_contact');
  assert.equal(out[0].total, 2000000);
});

test('agreement coverage stops before successor and renewal does not create a phantom term', () => {
  const t = tenant('2026-01-01', 6, 6000000);
  t.agreements.push({ start: '2026-04-01', months: 3, total: 4500000, day: 1 });
  const state = stateFor(t);
  const obligations = Workflows.obligations(state, '2026-01-01');
  assert.equal(obligations.length, 1);
  assert.equal(obligations[0].months, 3);
  assert.equal(obligations[0].total, 3000000);
  assert.equal(Workflows.renewalItems(state, '2026-01-01').length, 0);
});

test('pending allocations pause only covered amount; fully pending balance is under review', () => {
  const t = tenant('2026-01-01', 1, 1000);
  const partial = Workflows.obligations(stateFor(t, [{ tenant: 't1', period: '2026-01', months: 1, amount: 200, status: 'review' }]), '2026-01-01')[0];
  assert.equal(partial.pending, 200);
  assert.equal(partial.uncovered, 800);
  assert.equal(partial.state, 'needs_contact');
  const covered = Workflows.obligations(stateFor(t, [{ tenant: 't1', period: '2026-01', months: 1, amount: 1000, status: 'deferred' }]), '2026-01-01')[0];
  assert.equal(covered.state, 'under_review');
});

test('follow-up, contact, and paid collection conditions are derived independently', () => {
  const t = tenant('2026-01-10', 1, 1000);
  const sent = { tenant: 't1', period: '2026-01', date: '2026-01-01T09:00:00Z', nextFollowUp: '2026-01-10' };
  assert.equal(Workflows.obligations(stateFor(t, [], [sent]), '2026-01-10')[0].state, 'follow_up');
  assert.equal(Workflows.obligations(stateFor(t, [{ tenant: 't1', period: '2026-01', amount: 1000, status: 'paid' }], [sent]), '2026-01-10')[0].state, 'settled');
});

test('undo and rejection preserve history and release pending coverage', () => {
  const original = { id: 'p', status: 'paid', history: [{ event: 'created' }] };
  const reopened = Workflows.transitionPayment(original, 'undo', 'Wrong transfer', '2026-01-02T00:00:00Z');
  assert.equal(reopened.status, 'review');
  assert.equal(reopened.history.length, 2);
  assert.equal(original.history.length, 1);
  const rejected = Workflows.transitionPayment(reopened, 'reject', 'Funds not received', '2026-01-03T00:00:00Z');
  assert.equal(rejected.status, 'rejected');
  const again = Workflows.transitionPayment(rejected, 'reopen', 'Receipt corrected', '2026-01-04T00:00:00Z');
  assert.equal(again.status, 'review');
  assert.throws(() => Workflows.transitionPayment(original, 'undo', '', 'now'), /Reason required/);
});

test('renewals stay independent of payment status and derive renewed from successor', () => {
  const t = tenant('2026-01-01', 3, 3000);
  const state = stateFor(t, [{ tenant: 't1', period: '2026-01', months: 3, amount: 3000, status: 'paid' }]);
  const item = Workflows.renewalItems(state, '2026-03-15', 30)[0];
  assert.equal(item.state, 'needs_asking');
  assert.equal(Workflows.obligations(state, '2026-03-15')[0].state, 'settled');
  t.agreements.push({ start: '2026-04-01', months: 3, total: 3300, day: 1 });
  assert.equal(Workflows.renewalItems(state, '2026-03-15', 30)[0].state, 'renewed');
});

test('payments starting later in a term still reduce that obligation', () => {
  const t = tenant('2026-01-01', 6, 6000000);
  const item = Workflows.obligations(stateFor(t, [{ tenant: 't1', period: '2026-03', months: 2, amount: 2000000, status: 'paid' }]), '2026-05-01')[0];
  assert.equal(item.paid, 2000000);
  assert.equal(item.uncovered, 4000000);
});

test('payment defaults stop at successor and skip months already covered', () => {
  const t = tenant('2026-01-01', 6, 6000000);
  t.agreements.push({ start: '2026-04-01', months: 3, total: 4500000, day: 1 });
  const state = stateFor(t, [{ tenant: 't1', period: '2026-01', months: 1, amount: 1000000, status: 'review' }]);
  const defaults = Workflows.paymentDefaults(state, 't1', '2026-01');
  assert.equal(defaults.period, '2026-02');
  assert.equal(defaults.months, 2);
});

test('a later agreement after a gap does not silently resolve a renewal decision', () => {
  const t = tenant('2026-01-01', 1, 1000);
  t.agreements.push({ start: '2026-04-01', months: 3, total: 3300, day: 1 });
  assert.equal(Workflows.renewalItems(stateFor(t), '2026-03-01')[0].state, 'needs_asking');
});

test('deferred/rejected decisions enforce allowed events and reasons', () => {
  const p = Workflows.transitionPayment({ status: 'review' }, 'defer', 'Bank not visible', '2026-01-01');
  assert.equal(p.status, 'deferred');
  assert.equal(Workflows.transitionPayment(p, 'verify', '', '2026-01-02').status, 'paid');
  assert.throws(() => Workflows.transitionPayment(p, 'defer', 'again'), /Cannot defer/);
  assert.throws(() => Workflows.transitionPayment({ status: 'paid' }, 'verify'), /Cannot verify/);
});

test('renewals retain day 31 through February and departed tenants need no new renewal', () => {
  const t = tenant('2027-01-31', 1, 1000);
  let items = Workflows.renewalItems(stateFor(t), '2027-02-01');
  assert.equal(items[0].nextStart, '2027-02-28');
  t.agreements.push({ start: '2027-02-28', months: 1, total: 1000, day: 31 });
  items = Workflows.renewalItems(stateFor(t), '2027-03-01');
  assert.equal(items[1].nextStart, '2027-03-31');
  t.endDate = '2027-03-10';
  assert.equal(Workflows.renewalItems(stateFor(t), '2027-03-15')[1].state, 'closed');
});

console.log(`${tests.length} workflow checks passed:\n` + tests.map(name => `- ${name}`).join('\n'));
