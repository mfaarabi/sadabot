/* Derived collection and renewal workflows. Load after billing.js. */
const Workflows = (() => {
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const addDays = (value, days) => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return iso(date); };
  const endOf = (period, months, day) => iso(new Date(Billing.date(Billing.shift(period, months), day).getTime() - 86400000));
  const agreementsFor = tenant => (tenant.agreements || []).filter(item => item?.start && Number(item.months) > 0).slice().sort((a, b) => a.start.localeCompare(b.start));
  const capMonths = (tenant, agreement, agreements) => {
    const period = agreement.start.slice(0, 7);
    let months = Number(agreement.months);
    const next = agreements.find(item => item.start.slice(0, 7) > period);
    if (next) months = Math.min(months, Math.max(0, Billing.index(next.start.slice(0, 7)) - Billing.index(period)));
    if (tenant.endDate) months = Math.min(months, Math.max(0, Billing.index(tenant.endDate.slice(0, 7)) - Billing.index(period) + 1));
    return months;
  };
  const charge = (agreement, months, offset) => Billing.split(Number(agreement.total || 0), Number(agreement.months), offset);
  const reminderFor = (state, tenant, agreement) => {
    const id = `${tenant.id}:${agreement.start.slice(0, 7)}`;
    return (state.reminders || []).filter(item => {
      if (item.kind && !['collection', 'renewal'].includes(item.kind)) return false;
      if (item.kind === 'renewal') return false;
      return item.obligation === id || (item.tenant === tenant.id && item.period === agreement.start.slice(0, 7));
    }).slice().reverse().sort((a, b) => String(b.date || b.at || '').localeCompare(String(a.date || a.at || '')))[0] || null;
  };
  function obligations(state, todayISO) {
    const today = todayISO || iso(new Date());
    const result = [];
    for (const tenant of state.tenants || []) for (const agreement of agreementsFor(tenant)) {
      const period = agreement.start.slice(0, 7), months = capMonths(tenant, agreement, agreementsFor(tenant));
      if (!months) continue;
      const due = agreement.start, end = endOf(period, months, Number(agreement.day || Number(agreement.start.slice(8, 10))));
      const id = `${tenant.id}:${period}`, reminder = reminderFor(state, tenant, agreement);
      const monthAmounts = Array.from({ length: months }, (_, offset) => charge(agreement, months, offset));
      const total = monthAmounts.reduce((sum, amount) => sum + amount, 0);
      let paid = 0, pending = 0, hasPayment = false;
      for (const payment of state.payments || []) {
        if (payment.tenant !== tenant.id || payment.status === 'rejected') continue;
        const value = Array.from({ length: months }, (_, offset) => Billing.shift(period, offset))
          .filter(paymentPeriod => Billing.includes(payment, paymentPeriod))
          .reduce((sum, paymentPeriod) => sum + Billing.monthlyAmount(payment, paymentPeriod), 0);
        if (!value) continue;
        hasPayment = true;
        if (payment.status === 'paid' || payment.status === 'verified') paid += value;
        else if (['review', 'deferred', 'needs_review'].includes(payment.status)) pending += value;
      }
      const balance = Math.max(0, total - paid), uncovered = Math.max(0, total - paid - pending);
      let status;
      if (paid >= total) status = 'settled';
      else if (balance > 0 && pending >= balance) status = 'under_review';
      else if (uncovered > 0 && reminder?.nextFollowUp && reminder.nextFollowUp <= today) status = 'follow_up';
      else if (uncovered > 0 && reminder) status = 'awaiting_payment';
      else if (uncovered > 0 && due <= addDays(today, 3)) status = 'needs_contact';
      else status = 'outside_window';
      const qualifies = due <= addDays(today, 3) || hasPayment || !!reminder || (status !== 'settled' && end < today);
      if (!qualifies) continue;
      result.push({ id, tenant: tenant.id, total, paid, pending, balance, uncovered, state: status, followUp: reminder?.nextFollowUp || undefined, agreement, period, months, due, end });
    }
    return result;
  }
  function renewalItems(state, todayISO, windowDays = 30) {
    const today = todayISO || iso(new Date());
    const records = state.renewals || {};
    const result = [];
    for (const tenant of state.tenants || []) for (const agreement of agreementsFor(tenant)) {
      const period = agreement.start.slice(0, 7), months = capMonths(tenant, agreement, agreementsFor(tenant));
      if (!months) continue;
      const day = Number(agreement.day || Number(agreement.start.slice(8, 10))), nextStart = iso(Billing.date(Billing.shift(period, months), day));
      const end = endOf(period, months, day), id = `${tenant.id}:${period}`;
      const record = records[id];
      const successor = agreementsFor(tenant).some(item => item.start === nextStart);
      let status = record?.state || record?.status || (successor ? 'renewed' : tenant.endDate ? 'closed' : null);
      if (!status) status = end <= addDays(today, windowDays) ? 'needs_asking' : 'outside_window';
      if (status === 'outside_window' && end <= addDays(today, windowDays)) status = 'needs_asking';
      if (end <= addDays(today, windowDays) || record) result.push({ id, tenant: tenant.id, agreement, period, months, end, nextStart, state: status });
    }
    return result;
  }
  function paymentDefaults(state, tenantId, requestedStart) {
    const tenant = state.tenants.find(item => item.id === tenantId);
    if (!tenant) throw new Error('Unknown tenant');
    const agreements = agreementsFor(tenant);
    const start = requestedStart || agreements.at(-1)?.start.slice(0, 7);
    const agreement = Billing.agreement(tenant, start);
    if (!agreement) return { period: start, months: 1 };
    const anchor = agreement.start.slice(0, 7), length = capMonths(tenant, agreement, agreements);
    const covered = Array.from({ length }, (_, i) => Billing.shift(anchor, i));
    const free = month => !Billing.findPayment(state.payments, tenantId, month);
    const first = covered.find(month => month >= start && free(month));
    if (!first) return { period: start, months: 1 };
    let months = 0;
    for (const month of covered.filter(month => month >= first)) {
      if (!free(month)) break;
      months++;
    }
    return { period: first, months };
  }
  function transitionPayment(payment, event, reason, at) {
    const from = payment?.status;
    const requiredReason = ['defer', 'reject', 'undo', 'reopen'].includes(event);
    if (!payment || !['defer', 'resume', 'verify', 'reject', 'undo', 'reopen'].includes(event)) throw new Error('Invalid payment transition');
    if (requiredReason && !String(reason || '').trim()) throw new Error(`Reason required for ${event}`);
    const transitions = { defer: [['review', 'deferred']], resume: [['deferred', 'review']], verify: [['review', 'paid'], ['deferred', 'paid']], reject: [['review', 'rejected'], ['deferred', 'rejected']], undo: [['paid', 'review']], reopen: [['rejected', 'review']] };
    const next = transitions[event].find(([current]) => current === from)?.[1];
    if (!next) throw new Error(`Cannot ${event} payment in ${from || 'unknown'} state`);
    const entry = { event, from, to: next, at: at || new Date().toISOString() };
    if (reason !== undefined && String(reason).trim()) entry.reason = String(reason).trim();
    return { ...payment, status: next, history: [...(Array.isArray(payment.history) ? payment.history : []), entry] };
  }
  return { obligations, renewalItems, transitionPayment, paymentDefaults };
})();
