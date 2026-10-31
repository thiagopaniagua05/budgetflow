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

/** Clave 'AAAA-MM' sugerida para un sueldo: si cobrás el 31/10 (o hasta 10 días antes de fin de mes), es la plata de noviembre. */
export function monthKeyFor(ts) {
  const d = new Date(ts + 10 * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function shiftKey(k, n) {
  const [y, m] = k.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function keyLabel(k, now = Date.now()) {
  const [y, m] = k.split('-').map(Number);
  return MONTHS[m - 1] + (y !== new Date(now).getFullYear() ? ` ${y}` : '');
}
/** Nombre del mes que paga un sueldo (el que elegiste al anotarlo, o el sugerido por la fecha). */
export const monthLabel = (ts, now = Date.now(), key) => keyLabel(key || monthKeyFor(ts), now);

/**
 * Lista de meses (del más viejo al más nuevo). Cada sueldo abre un mes nuevo.
 * Si hay movimientos anteriores al primer sueldo, van a un mes "Antes del sueldo".
 */
export function periods(data, now = Date.now()) {
  const salaries = (data.incomes || []).filter((i) => i.kind === 'salary').sort((a, b) => a.date - b.date);
  const list = salaries.map((s, i) => ({
    id: s.id, salary: s, start: s.date,
    end: salaries[i + 1] ? salaries[i + 1].date : Infinity,
    label: monthLabel(s.date, now, s.month),
  }));
  if (!list.length) return [{ id: 'none', salary: null, start: -Infinity, end: Infinity, label: MONTHS[new Date(now).getMonth()] }];
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
  // Lo que pasaste a ahorros sale de lo que te queda (y si sacaste, vuelve)
  const savingsMoves = (data.savings || []).filter((x) => inPeriod(p, x.date));
  const saved = savingsMoves.reduce((a, x) => a + (x.kind === 'out' ? -ars(x) : ars(x)), 0);
  return { expenses, extras, salary, extra, income, spent, spentUsd, saved, left: income - spent - saved, fixed, pending, cats };
}

/** Total ahorrado, separado en pesos y dólares. */
export function savingsTotals(data) {
  const t = { ARS: 0, USD: 0 };
  for (const x of data.savings || []) t[x.currency === 'USD' ? 'USD' : 'ARS'] += (x.kind === 'out' ? -1 : 1) * (+x.amount || 0);
  return t;
}

/**
 * Comparación con el mes anterior. En el mes actual compara "a esta altura"
 * (los mismos días desde el cobro), así no da siempre "gastaste menos".
 */
export function compare(data, ps, idx, now = Date.now()) {
  const p = ps[idx], prev = ps[idx - 1];
  if (!p || !prev || !p.salary || !prev.salary) return null;
  const sameDays = p.end === Infinity;
  const cut = sameDays ? prev.start + (Math.min(now, p.end) - p.start) : Infinity;
  const spentIn = (q, until) => (data.expenses || []).filter((e) => inPeriod(q, e.date) && e.date < until).reduce((a, e) => a + ars(e), 0);
  const a = spentIn(p, Infinity), b = spentIn(prev, cut);
  if (!(b > 0)) return null;
  return { pct: Math.round(((a - b) / b) * 100), prevLabel: prev.label, sameDays };
}

/** Resumen de todos los meses, del más nuevo al más viejo. */
export function history(data, ps, rates) {
  return ps.filter((p) => p.salary).map((p) => ({ p, ...summary(data, p, rates) })).reverse();
}

/** Gastos que se repiten (misma nota y categoría, 2+ veces en los últimos 90 días): para cargarlos con un toque. */
export function quickPicks(data, now = Date.now(), n = 6) {
  const g = new Map();
  for (const e of data.expenses || []) {
    if (e.fixedId || !e.note?.trim() || now - e.date > 90 * DAY) continue;
    const key = `${e.category}|${e.note.trim().toLowerCase()}`;
    const it = g.get(key) || { count: 0, last: null };
    it.count++;
    if (!it.last || e.date > it.last.date) it.last = e;
    g.set(key, it);
  }
  return [...g.values()].filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.date - a.last.date).slice(0, n).map((x) => x.last);
}
