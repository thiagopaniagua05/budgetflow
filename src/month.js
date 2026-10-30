// Lógica de BudgetFlow: "el mes" arranca el día que cobrás el sueldo y dura hasta el próximo cobro.

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY = 864e5;
export const dayStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function money(n) {
  const v = Math.round(n || 0);
  return `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('es-AR')}`;
}

export const usd = (n) => `US$${(+n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

/** Monto en pesos de un movimiento: los de dólares se guardan con la cotización del momento. */
export const ars = (x) => (x?.currency === 'USD' ? (+x.amount || 0) * (+x.rate || 0) : +x?.amount || 0);

/** Nombre del mes que paga un sueldo: si cobrás el 31/10, es la plata de noviembre. */
export function monthLabel(ts, now = Date.now()) {
  const d = new Date(ts + 10 * DAY);
  return MONTHS[d.getMonth()] + (d.getFullYear() !== new Date(now).getFullYear() ? ` ${d.getFullYear()}` : '');
}

/**
 * Lista de meses (del más viejo al más nuevo). Cada sueldo abre un mes nuevo.
 * Si hay movimientos anteriores al primer sueldo, van a un mes "Antes del sueldo".
 */
export function periods(data, now = Date.now()) {
  const salaries = (data.incomes || []).filter((i) => i.kind === 'salary').sort((a, b) => a.date - b.date);
  const list = salaries.map((s, i) => ({
    id: s.id, salary: s, start: s.date,
    end: salaries[i + 1] ? salaries[i + 1].date : Infinity,
    label: monthLabel(s.date, now),
  }));
  if (!list.length) return [{ id: 'none', salary: null, start: -Infinity, end: Infinity, label: 'Este mes' }];
  const first = list[0].start;
  const before = [...(data.expenses || []), ...(data.incomes || []).filter((i) => i.kind !== 'salary')].some((x) => x.date < first);
  if (before) list.unshift({ id: 'pre', salary: null, start: -Infinity, end: first, label: 'Antes del sueldo' });
  return list;
}

export const inPeriod = (p, ts) => ts >= p.start && ts < p.end;

/** Todo lo que necesita la pantalla de un mes. */
export function summary(data, p, rates) {
  const expenses = (data.expenses || []).filter((e) => inPeriod(p, e.date)).sort((a, b) => b.date - a.date);
  const extras = (data.incomes || []).filter((i) => i.kind !== 'salary' && inPeriod(p, i.date)).sort((a, b) => b.date - a.date);
  const salary = p.salary ? ars(p.salary) : 0;
  const extra = extras.reduce((a, i) => a + ars(i), 0);
  const income = salary + extra;
  const spent = expenses.reduce((a, e) => a + ars(e), 0);
  const spentUsd = expenses.filter((e) => e.currency === 'USD').reduce((a, e) => a + (+e.amount || 0), 0);
  const fixed = (data.fixed || []).slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((f) => {
    const paid = expenses.find((e) => e.fixedId === f.id);
    return { ...f, paid };
  });
  // Los fijos en dólares se estiman con el dólar tarjeta de hoy
  const pending = fixed.filter((f) => !f.paid).reduce((a, f) => a + (f.currency === 'USD' ? (+f.amount || 0) * (rates?.tarjeta || 0) : +f.amount || 0), 0);
  const byCat = {};
  for (const e of expenses) byCat[e.category || 'Varios'] = (byCat[e.category || 'Varios'] || 0) + ars(e);
  const cats = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return { expenses, extras, salary, extra, income, spent, spentUsd, left: income - spent, fixed, pending, cats };
}
