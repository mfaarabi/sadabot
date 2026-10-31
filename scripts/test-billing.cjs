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
test('a six-million six-month agreement charges one million each month before payment', () => {
  const tenant = { id: 't', start: '2026-10-01', termStart: '2026-10-01', day: 1, term: 6, termRate: 6000000, agreements: [{ start: '2026-10-01', months: 6, total: 6000000, day: 1 }] };
  for (let i = 0; i < 6; i++) {
    const entry = Billing.ledger(tenant, [], Billing.shift('2026-10', i), 1500000);
    assert.equal(entry.charge, 1000000);
    assert.equal(entry.paid, 0);
    assert.equal(entry.balance, 1000000);
  }
});
test('paid and review transfers spread into separate ledger balances', () => {
  const tenant = { id: 't', start: '2026-10-01', term: 6, termRate: 6000000, day: 1 };
  const payment = { id: 'p', tenant: 't', period: '2026-10', months: 6, amount: 6000000, status: 'paid' };
  let total = 0;
  for (const reference of Billing.covered(payment)) {
    const entry = Billing.ledger(tenant, [payment], reference, 1500000);
    assert.equal(entry.charge, 1000000);
    assert.equal(entry.paid, 1000000);
    assert.equal(entry.balance, 0);
    total += entry.paid;
    const review = Billing.ledger(tenant, [{ ...payment, status: 'review' }], reference, 1500000);
    assert.equal(review.paid, 0);
    assert.equal(review.balance, 1000000);
  }
  assert.equal(total, payment.amount);
  assert.equal(Billing.ledger(tenant, [payment], '2027-04', 1500000).paid, 0);
});
test('rounding spreads whole rupiah and conserves a non-divisible term total', () => {
  const payment = { period: '2026-10', months: 3, amount: 1000000 };
  const amounts = Billing.covered(payment).map(reference => Billing.monthlyAmount(payment, reference));
  assert.equal(amounts.join(','), '333334,333333,333333');
  assert.equal(amounts.reduce((sum, value) => sum + value, 0), 1000000);
  assert.equal(Billing.monthlyAmount(payment, '2027-01'), 0);
});
test('saved contract history preserves older charges through a renewal price change', () => {
  const tenant = { id: 't', start: '2026-10-01', termStart: '2027-04-01', day: 1, term: 6, termRate: 9000000, agreements: [{ start: '2026-10-01', months: 6, total: 6000000, day: 1 }, { start: '2027-04-01', months: 6, total: 9000000, day: 1 }] };
  assert.equal(Billing.monthlyCharge(tenant, '2027-01', 2000000), 1000000);
  assert.equal(Billing.monthlyCharge(tenant, '2027-07', 2000000), 1500000);
  assert.equal(Billing.cycle(tenant, '2027-01').period, '2026-10');
  assert.equal(Billing.cycle(tenant, '2027-07').period, '2027-04');
  assert.equal(Billing.ledger(tenant, [], '2026-09', 2000000).active, false);
});
test('explicit payment allocations preserve different monthly contract charges', () => {
  const payment = { period: '2026-10', months: 2, amount: 2500000, allocations: [1000000, 1500000] };
  assert.equal(Billing.monthlyAmount(payment, '2026-10'), 1000000);
  assert.equal(Billing.monthlyAmount(payment, '2026-11'), 1500000);
});
test('rejected transfers release coverage so a replacement can be recorded', () => {
  const rejected = { id: 'p1', tenant: 't1', period: '2026-10', months: 6, amount: 6000000, status: 'rejected' };
  assert.equal(Billing.findPayment([rejected], 't1', '2026-12'), undefined);
  assert.equal(Billing.overlaps([rejected], { ...rejected, id: 'p2', status: 'review' }), false);
  assert.equal(Billing.overlaps([{ ...rejected, status: 'deferred' }], { ...rejected, id: 'p2' }), true);
});

test('saved terms end without phantom recurring charges and departure caps later months', () => {
  const t = { id: 't', start: '2026-01-01', term: 3, day: 1, termRate: 3000, agreements: [{ start: '2026-01-01', months: 3, total: 3000, day: 1 }] };
  assert.equal(Billing.monthlyCharge(t, '2026-03', 1000), 1000);
  assert.equal(Billing.monthlyCharge(t, '2026-04', 1000), 0);
  assert.equal(Billing.ledger(t, [], '2026-04', 1000).active, false);
  t.endDate = '2026-02-15';
  assert.equal(Billing.monthlyCharge(t, '2026-02', 1000), 1000);
  assert.equal(Billing.monthlyCharge(t, '2026-03', 1000), 0);
});

console.log(`${tests.length} billing checks passed:\n` + tests.map(name => `- ${name}`).join('\n'));
