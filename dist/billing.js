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
  const monthlyAmount = payment => payment.amount / count(payment);
  function date(period, day) {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));
  }
  function cycle(tenant, reference) {
    const anchor = (tenant.termStart || tenant.start).slice(0, 7);
    const months = term(tenant);
    const elapsed = Math.max(0, index(reference) - index(anchor));
    const period = shift(anchor, Math.floor(elapsed / months) * months);
    const day = tenant.day || Number((tenant.termStart || tenant.start).slice(8, 10));
    return { period, months, due: date(period, day), next: date(shift(period, months), day) };
  }
  function findPayment(payments, tenantId, period) {
    return payments.find(payment => payment.tenant === tenantId && includes(payment, period));
  }
  function overlaps(payments, candidate) {
    const periods = covered(candidate);
    return payments.some(payment => payment.id !== candidate.id && payment.tenant === candidate.tenant && covered(payment).some(period => periods.includes(period)));
  }
  return { termOptions, count, term, index, shift, covered, includes, monthlyAmount, date, cycle, findPayment, overlaps };
})();
