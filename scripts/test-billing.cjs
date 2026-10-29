const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Billing = vm.runInNewContext(fs.readFileSync('dist/billing.js', 'utf8') + ';Billing');
const tests = [];
function test(name, body) { body(); tests.push(name); }
const local = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
const tenant = { start: '2026-10-01', termStart: '2026-10-31', day: 31, term: 3 };
test('3/6/12-month renewal deadlines cross year boundaries', () => {
  for (const months of [3, 6, 12]) {
    const bill = Billing.cycle({ ...tenant, term: months }, '2026-10');
    assert.equal(bill.period, '2026-10');
    assert.equal(Billing.index(Billing.shift(bill.period, months)) - Billing.index(bill.period), months);
  }
  assert.equal(local(Billing.cycle(tenant, '2026-12').next), '2027-1-31');
  assert.equal(Billing.cycle(tenant, '2027-01').period, '2027-01');
});
test('short months clamp day but later cycles retain the original day', () => {
  assert.equal(local(Billing.date('2027-02', 31)), '2027-2-28');
  assert.equal(local(Billing.date('2028-02', 31)), '2028-2-29');
  assert.equal(local(Billing.cycle({ ...tenant, term: 1 }, '2027-03').due), '2027-3-31');
});
test('new term anchor governs renewal after a tenure change', () => {
  const changed = { ...tenant, termStart: '2027-01-31', term: 6 };
  assert.equal(Billing.cycle(changed, '2027-06').period, '2027-01');
  assert.equal(local(Billing.cycle(changed, '2027-06').next), '2027-7-31');
});
test('legacy monthly payments retain their exact coverage and amount', () => {
  const p = { tenant: 't1', period: '2026-10', amount: 1250000 };
  assert.equal(Billing.count(p), 1);
  assert.equal(Billing.monthlyAmount(p), 1250000);
  assert.equal(Billing.includes(p, '2026-10'), true);
  assert.equal(Billing.includes(p, '2026-11'), false);
});
test('multi-month allocation preserves the transfer total', () => {
  for (const months of [2, 3, 6, 12]) {
    const p = { tenant: 't1', period: '2026-10', months, amount: 1250000 * months };
    assert.equal(Billing.covered(p).length, months);
    assert.equal(Billing.monthlyAmount(p), 1250000);
    assert.equal(Billing.covered(p).reduce(total => total + Billing.monthlyAmount(p), 0), p.amount);
    assert.equal(Billing.includes(p, Billing.shift(p.period, months)), false);
  }
});
test('the same payment is found in each covered monthly view', () => {
  const p = { id: 'p1', tenant: 't1', period: '2026-11', months: 3, amount: 3750000 };
  for (const period of ['2026-11', '2026-12', '2027-01']) assert.equal(Billing.findPayment([p], 't1', period), p);
  assert.equal(Billing.findPayment([p], 't1', '2027-02'), undefined);
  assert.equal(Billing.findPayment([p], 't2', '2026-12'), undefined);
});
test('overlap is blocked for paid and review records, but not adjacent coverage', () => {
  for (const status of ['paid', 'review']) {
    const p = { id: 'p1', tenant: 't1', period: '2026-10', months: 3, status };
    assert.equal(Billing.overlaps([p], { id: 'new', tenant: 't1', period: '2026-12', months: 3 }), true);
    assert.equal(Billing.overlaps([p], { id: 'new', tenant: 't1', period: '2027-01', months: 3 }), false);
    assert.equal(Billing.overlaps([p], { ...p }), false);
    assert.equal(Billing.overlaps([p], { id: 'new', tenant: 't2', period: '2026-10', months: 3 }), false);
  }
});
console.log(`${tests.length} billing checks passed:\n` + tests.map(name => `- ${name}`).join('\n'));
