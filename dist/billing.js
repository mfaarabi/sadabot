/* Calendar-month billing and coverage, shared by views and payment validation. */
const Billing = (() => {
  const termOptions = [1, 3, 6, 12];
  const count = payment => Number(payment.months || 1);
  const term = tenant => termOptions.includes(Number(tenant.term)) ? Number(tenant.term) : 1;
  const index = period => { const [year, month] = period.split('-').map(Number); return year * 12 + month - 1; };
  const fromIndex = value => `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, '0')}`;
  const shift = (period, months) => fromIndex(index(period) + months);
  const covered = payment => Array.from({ length: count(payment) }, (_, i) => shift(payment.period, i));
  const includes = (payment, period) => covered(payment).includes(period);
  // Allocate whole rupiah without losing or inventing money when totals do not divide evenly.
  const split = (total, months, offset) => Math.floor(total / months) + (offset < total % months ? 1 : 0);
  const monthlyAmount = (payment, reference = payment.period) => {
    const offset = index(reference) - index(payment.period);
    if (offset < 0 || offset >= count(payment)) return 0;
    return payment.allocations?.[offset] ?? split(payment.amount, count(payment), offset);
  };
  function agreement(tenant, reference) {
    const history = (tenant.agreements || []).filter(item => item.start.slice(0, 7) <= reference);
    return history.sort((a, b) => b.start.localeCompare(a.start))[0] || null;
  }
  function effectiveTenant(tenant, reference) {
    const saved = agreement(tenant, reference);
    return saved ? { ...tenant, term: saved.months, termStart: saved.start, day: saved.day } : tenant;
  }
  function monthlyCharge(tenant, reference, fallbackMonthlyRate) {
    if (reference < tenant.start.slice(0, 7)) return 0;
    const saved = agreement(tenant, reference);
    if (saved && index(reference) >= index(saved.start.slice(0, 7)) + Number(saved.months)) return 0;
    if (tenant.endDate && reference > tenant.endDate.slice(0, 7)) return 0;
    const current = effectiveTenant(tenant, reference);
    const bill = cycle(current, reference);
    const total = saved?.total ?? tenant.termRate ?? fallbackMonthlyRate * bill.months;
    return split(total, bill.months, index(reference) - index(bill.period));
  }
  function ledger(tenant, payments, reference, fallbackMonthlyRate) {
    if (reference < tenant.start.slice(0, 7)) return { charge: 0, paid: 0, balance: 0, payment: null, active: false };
    const payment = findPayment(payments, tenant.id, reference);
    const charge = payment ? monthlyAmount(payment, reference) : monthlyCharge(tenant, reference, fallbackMonthlyRate);
    const paid = payment?.status === 'paid' ? charge : 0;
    return { charge, paid, balance: charge - paid, payment, active: charge > 0 };
  }
  function date(period, day) {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));
  }
  function cycle(tenant, reference) {
    tenant = effectiveTenant(tenant, reference);
    const anchor = (tenant.termStart || tenant.start).slice(0, 7);
    const months = term(tenant);
    const elapsed = Math.max(0, index(reference) - index(anchor));
    const period = shift(anchor, Math.floor(elapsed / months) * months);
    const day = tenant.day || Number((tenant.termStart || tenant.start).slice(8, 10));
    return { period, months, due: date(period, day), next: date(shift(period, months), day) };
  }
  function findPayment(payments, tenantId, period) {
    return payments.find(payment => payment.tenant === tenantId && payment.status !== 'rejected' && includes(payment, period));
  }
  function overlaps(payments, candidate) {
    const periods = covered(candidate);
    return payments.some(payment => payment.status !== 'rejected' && payment.id !== candidate.id && payment.tenant === candidate.tenant && covered(payment).some(period => periods.includes(period)));
  }
  return { termOptions, count, term, index, shift, covered, includes, split, monthlyAmount, monthlyCharge, ledger, agreement, date, cycle, findPayment, overlaps };
})();
