// =====================================================================
//  Lógica financiera de BudgetFlow
//  - Un "período" va de cobro a cobro y se nombra por el mes que financia
//    (cobrás el 30/09 → período "2026-10" = Octubre, hasta el 30/10).
//  - Las cuotas se calculan solas: se guarda en qué período se paga la
//    primera y cuántas son. Nunca hace falta "restar" nada a mano.
//  - Tarjetas reales: lo que comprás hoy se paga en el resumen que vence
//    después del próximo cierre.
// =====================================================================

const DAY = 864e5;
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ---------- Fechas y períodos ----------
export const keyOf = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`; // m: 0-11
export const parseKey = (k) => { const [y, m] = k.split('-').map(Number); return { y, m: m - 1 }; };
export const addMonths = (k, n) => { const { y, m } = parseKey(k); const d = new Date(y, m + n, 1); return keyOf(d.getFullYear(), d.getMonth()); };
export const monthsBetween = (a, b) => { const A = parseKey(a), B = parseKey(b); return (B.y - A.y) * 12 + (B.m - A.m); };
export const periodLabel = (k) => MONTHS[parseKey(k).m] + (parseKey(k).y !== new Date().getFullYear() ? ` ${parseKey(k).y}` : '');
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const dayStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Fecha (00:00) del día `day` en el mes y/m, ajustado si el mes es más corto. day = 'last' → último día. */
export function dateIn(y, m, day) {
  const d = day === 'last' ? daysIn(y, m) : Math.min(Number(day) || 1, daysIn(y, m));
  return new Date(y, m, d).getTime();
}

/** Inicio del período `k`: el día de cobro del mes anterior. */
export function periodStart(k, payday = 'last') {
  const { y, m } = parseKey(addMonths(k, -1));
  return dateIn(y, m, payday);
}
export const periodEnd = (k, payday) => periodStart(addMonths(k, 1), payday); // exclusivo

/** Período al que pertenece una fecha. */
export function periodOf(ts, payday = 'last') {
  const d = new Date(ts);
  let k = keyOf(d.getFullYear(), d.getMonth());
  if (ts >= periodStart(addMonths(k, 1), payday)) return addMonths(k, 1);
  if (ts >= periodStart(k, payday)) return k;
  return addMonths(k, -1);
}

/** Fecha del día `day` que cae dentro del período `k`. */
export function occurrenceInPeriod(day, k, payday = 'last') {
  const s = periodStart(k, payday), e = periodEnd(k, payday);
  const sd = new Date(s);
  for (let i = 0; i < 2; i++) {
    const t = dateIn(sd.getFullYear(), sd.getMonth() + i, day);
    if (t >= s && t < e) return t;
  }
  return dateIn(sd.getFullYear(), sd.getMonth() + 1, day); // por si acaso
}

export const daysUntil = (ts, now) => Math.round((dayStart(ts) - dayStart(now)) / DAY);

// ---------- Monedas ----------
/** Convierte a pesos. Compras con tarjeta en USD → dólar tarjeta; el resto → MEP. */
export function toARS(amount, currency, rates, viaCard = false) {
  if (currency !== 'USD') return amount || 0;
  const r = viaCard ? rates?.tarjeta : rates?.mep;
  return (amount || 0) * (r || 0);
}
const isCard = (method, cards) => cards.some((c) => c.id === method);

// ---------- Tarjetas ----------
/** Resumen de la tarjeta que se PAGA dentro del período k: fechas de cierre y vencimiento, y rango de compras. */
export function statementFor(card, k, payday) {
  const due = occurrenceInPeriod(card.dueDay, k, payday);
  const dd = new Date(due);
  // El cierre es antes del vencimiento: mismo mes si closeDay < dueDay, si no el mes anterior
  const closeMonthOffset = Number(card.closeDay) < Number(card.dueDay) ? 0 : -1;
  const close = dateIn(dd.getFullYear(), dd.getMonth() + closeMonthOffset, card.closeDay);
  const cd = new Date(close);
  const prevClose = dateIn(cd.getFullYear(), cd.getMonth() - 1, card.closeDay);
  return { due, close, from: prevClose + DAY, to: close + DAY }; // compras en [from, to)
}

/** En qué período se paga una compra hecha con tarjeta en la fecha `ts`. */
export function periodPaidForCardPurchase(card, ts, payday) {
  let k = periodOf(ts, payday);
  for (let i = 0; i < 4; i++) {
    const st = statementFor(card, k, payday);
    if (ts >= st.from && ts < st.to) return k;
    k = addMonths(k, 1);
  }
  return addMonths(periodOf(ts, payday), 1);
}

// ---------- Cuotas ----------
/** Número de cuota que se paga en el período k (null si no corresponde). */
export function installmentNumber(inst, k) {
  const n = monthsBetween(inst.startPeriod, k) + 1;
  return n >= 1 && n <= inst.total ? n : null;
}
export function installmentStatus(inst, k) {
  const n = monthsBetween(inst.startPeriod, k) + 1;
  if (n > inst.total) return { state: 'done', paid: inst.total, left: 0 };
  if (n < 1) return { state: 'future', paid: 0, left: inst.total };
  return { state: 'active', current: n, paid: n - 1, left: inst.total - n + 1 };
}
/** Período de la primera cuota a partir de "voy por la cuota X" en el período k. */
export const startFromCurrent = (k, current) => addMonths(k, -(Math.max(1, current) - 1));

// ---------- Ingresos ----------
export function incomeFor(inc, k, receipts) {
  if (inc.oneOff) return inc.period === k ? { amount: inc.amount, confirmed: true } : null;
  if (inc.active === false) return null;
  const r = receipts.find((x) => x.incomeId === inc.id && x.period === k);
  return r ? { amount: r.amount, confirmed: true, receipt: r } : { amount: inc.amount, confirmed: false };
}

/** Desde qué período existe algo (para no inventar historia anterior a cuando lo cargaste). */
const sinceOf = (x, payday) => x.fromPeriod || (x.createdAt ? periodOf(x.createdAt, payday) : null);
const existsIn = (x, k, payday) => { const s = sinceOf(x, payday); return !s || monthsBetween(s, k) >= 0; };

// ---------- El cálculo principal ----------
/**
 * Calcula todo lo del período k.
 * data = { incomes, receipts, fixed, installments, cards, expenses, payments, savings, profile }
 */
export function computePeriod(data, k, now, rates) {
  const payday = data.profile?.payday || 'last';
  const cards = data.cards || [];
  const conv = (amount, currency, method) => toARS(amount, currency, rates, isCard(method, cards));
  const paidKey = (kind, id) => `${kind}_${id}_${k}`;
  const isPaid = (kind, id) => (data.payments || []).some((p) => p.id === paidKey(kind, id));

  // Ingresos
  const incomes = (data.incomes || []).filter((inc) => inc.oneOff || existsIn(inc, k, payday)).map((inc) => ({ inc, ...incomeFor(inc, k, data.receipts || []) })).filter((x) => x.amount != null);
  const incomeTotal = incomes.reduce((a, x) => a + toARS(x.amount, x.inc.currency, rates), 0);

  // Fijos activos
  const fixed = (data.fixed || []).filter((f) => f.active !== false && existsIn(f, k, payday));
  const fixedItems = fixed.map((f) => ({ f, ars: conv(f.amount, f.currency, f.method), onCard: isCard(f.method, cards) }));

  // Cuotas del período
  const instItems = (data.installments || []).map((i) => ({ i, n: installmentNumber(i, k) })).filter((x) => x.n)
    .map((x) => ({ ...x, ars: conv(x.i.amountPer, x.i.currency, x.i.method), onCard: isCard(x.i.method, cards) }));

  // Gastos variables: los que se pagan en este período
  const expenses = data.expenses || [];
  const directExpenses = expenses.filter((e) => !isCard(e.method, cards) && periodOf(e.date, payday) === k);
  const variableDirect = directExpenses.reduce((a, e) => a + conv(e.amount, e.currency, e.method), 0);

  // Resúmenes de tarjeta que vencen en este período
  const statements = cards.map((c) => {
    const st = statementFor(c, k, payday);
    const consumos = expenses.filter((e) => e.method === c.id && e.date >= st.from && e.date < st.to);
    const consARS = consumos.reduce((a, e) => a + conv(e.amount, e.currency, e.method), 0);
    const consUSD = consumos.filter((e) => e.currency === 'USD').reduce((a, e) => a + e.amount, 0);
    const cuotas = instItems.filter((x) => x.i.method === c.id);
    const fijos = fixedItems.filter((x) => x.f.method === c.id);
    const total = consARS + cuotas.reduce((a, x) => a + x.ars, 0) + fijos.reduce((a, x) => a + x.ars, 0);
    const usd = consUSD + cuotas.filter((x) => x.i.currency === 'USD').reduce((a, x) => a + x.i.amountPer, 0)
      + fijos.filter((x) => x.f.currency === 'USD').reduce((a, x) => a + x.f.amount, 0);
    return { card: c, ...st, consumos, consARS, cuotas, fijos, total, usd, paid: isPaid('card', c.id) };
  });

  const fixedTotal = fixedItems.reduce((a, x) => a + x.ars, 0);
  const instTotal = instItems.reduce((a, x) => a + x.ars, 0);
  const cardConsumos = statements.reduce((a, s) => a + s.consARS, 0);
  const variableTotal = variableDirect + cardConsumos;
  const savingGoal = Number(data.profile?.savingsGoal) || 0;
  const free = incomeTotal - fixedTotal - instTotal - variableTotal - savingGoal;

  const start = periodStart(k, payday), end = periodEnd(k, payday);
  const isCurrent = now >= start && now < end;
  const daysLeft = Math.max(1, daysUntil(end, now));
  const daily = isCurrent ? free / daysLeft : null;

  // Vencimientos del período (pagos que no son con tarjeta + resúmenes)
  const dues = [
    ...fixedItems.filter((x) => !x.onCard).map((x) => ({
      kind: 'fixed', id: x.f.id, title: x.f.name, sub: 'Servicio fijo', icon: x.f.icon || '🧾', ars: x.ars,
      currency: x.f.currency, original: x.f.amount, due: occurrenceInPeriod(x.f.dueDay, k, payday), paid: isPaid('fixed', x.f.id),
    })),
    ...instItems.filter((x) => !x.onCard).map((x) => ({
      kind: 'inst', id: x.i.id, title: x.i.name, sub: `Cuota ${x.n} de ${x.i.total}`, icon: '🧾', ars: x.ars,
      currency: x.i.currency, original: x.i.amountPer, due: occurrenceInPeriod(x.i.dueDay || 10, k, payday), paid: isPaid('inst', x.i.id),
    })),
    ...statements.filter((s) => s.total > 0).map((s) => ({
      kind: 'card', id: s.card.id, title: s.card.name, sub: `Resumen · ${s.cuotas.length} cuota${s.cuotas.length === 1 ? '' : 's'}`,
      icon: '💳', ars: s.total, due: s.due, paid: s.paid,
    })),
  ].sort((a, b) => a.due - b.due);

  // Consumo por categoría (por fecha de compra, todos los medios de pago)
  const spentIn = expenses.filter((e) => e.date >= start && e.date < end);
  const byCat = {};
  for (const e of spentIn) byCat[e.category] = (byCat[e.category] || 0) + conv(e.amount, e.currency, e.method);
  const spentVariable = Object.values(byCat).reduce((a, v) => a + v, 0);

  return {
    k, start, end, isCurrent, daysLeft, payday,
    incomes, incomeTotal, fixedItems, fixedTotal, instItems, instTotal,
    directExpenses, variableDirect, statements, cardConsumos, variableTotal,
    savingGoal, free, daily, dues, byCat, spentVariable, spentIn,
  };
}

/** Lo que ya está comprometido para el período siguiente (compras con tarjeta del período actual, cuotas, fijos). */
export function nextPeriodCommitted(data, k, now, rates) {
  const next = computePeriod(data, addMonths(k, 1), now, rates);
  return { cards: next.statements.reduce((a, s) => a + s.total, 0), fixed: next.fixedTotal, inst: next.instTotal, statements: next.statements };
}

/** Ritmo de gasto: promedio diario de los últimos 5 días vs lo que te alcanza por día. */
export function pace(pd, data, now, rates) {
  if (!pd.isCurrent || pd.daily == null) return null;
  const cards = data.cards || [];
  const from = Math.max(pd.start, dayStart(now) - 4 * DAY);
  const days = Math.max(1, Math.round((dayStart(now) - from) / DAY) + 1);
  const spent = (data.expenses || []).filter((e) => e.date >= from && e.date <= now)
    .reduce((a, e) => a + toARS(e.amount, e.currency, rates, isCard(e.method, cards)), 0);
  const avg = spent / days;
  const allowed = Math.max(0, pd.daily);
  return { avg, allowed, over: allowed > 0 ? avg / allowed - 1 : avg > 0 ? 1 : 0, shortfall: Math.max(0, avg * pd.daysLeft - Math.max(0, pd.free)) };
}

/** Notificaciones y alertas calculadas. */
export function alerts(pd, data, now, rates) {
  const out = [];
  const payday = pd.payday;
  // Día de cobro
  const nextPay = pd.end;
  if (daysUntil(pd.start, now) === 0) {
    const pending = pd.incomes.filter((x) => !x.confirmed && !x.inc.oneOff);
    out.push({ type: 'pay', icon: '💰', text: pending.length ? '¡Hoy cobrás! Confirmá cuánto entró para arrancar el mes.' : '¡Arrancó un mes nuevo! Tu presupuesto se reinició.' });
  } else if (pd.isCurrent && pd.incomes.some((x) => !x.confirmed && !x.inc.oneOff)) {
    out.push({ type: 'confirm', icon: '💰', text: 'Tenés ingresos sin confirmar: tocá "Ingresos" para cargar cuánto cobraste.' });
  }
  // Vencidos y por vencer
  for (const d of pd.dues.filter((d) => !d.paid)) {
    const n = daysUntil(d.due, now);
    if (n < 0 && pd.isCurrent) out.push({ type: 'late', icon: '🔴', text: `${d.title} venció hace ${-n} día${n === -1 ? '' : 's'}. ¿Ya lo pagaste?` });
    else if (n === 0) out.push({ type: 'today', icon: '⏰', text: `Hoy vence ${d.title}.` });
    else if (n > 0 && n <= 3) out.push({ type: 'soon', icon: '📅', text: `${d.title} vence en ${n} día${n === 1 ? '' : 's'}.` });
  }
  // Tarjetas por cerrar
  for (const c of data.cards || []) {
    const st = statementFor(c, addMonths(pd.k, 1), payday);
    const n = daysUntil(st.close, now);
    if (pd.isCurrent && n >= 0 && n <= 2) out.push({ type: 'close', icon: '💳', text: `${c.name} cierra ${n === 0 ? 'hoy' : `en ${n} día${n === 1 ? '' : 's'}`}: lo que compres después se paga un mes más tarde.` });
  }
  // Presupuestos
  const budgets = data.profile?.budgets || {};
  for (const [cat, limit] of Object.entries(budgets)) {
    const v = pd.byCat[cat] || 0;
    if (limit > 0 && v > limit) out.push({ type: 'budget', icon: '⚠️', text: `Te pasaste del presupuesto de ${cat}: ${money(v)} de ${money(limit)}.` });
  }
  // Ritmo
  const p = pace(pd, data, now, rates);
  if (p && p.over > 0.1) out.push({ type: 'pace', icon: '⚡', text: `Vas un ${Math.round(p.over * 100)}% arriba del ritmo: gastás ${money(p.avg)}/día y te alcanza para ${money(p.allowed)}/día.` });
  if (pd.isCurrent && pd.free < 0) out.push({ type: 'neg', icon: '🚨', text: `Este mes estás ${money(-pd.free)} abajo. Revisá gastos o el ahorro apartado.` });
  void nextPay;
  return out;
}

// ---------- Historial ----------
export function history(data, k, n, now, rates) {
  return Array.from({ length: n }, (_, i) => addMonths(k, i - n + 1)).map((pk) => {
    const p = computePeriod(data, pk, now, rates);
    const saved = (data.savings || []).filter((s) => s.period === pk).reduce((a, s) => a + s.amount, 0);
    return { k: pk, income: p.incomeTotal, fixed: p.fixedTotal, inst: p.instTotal, variable: p.spentVariable, byCat: p.byCat, saved };
  });
}

// ---------- Calendario (.ics con recordatorios 3 días antes y el mismo día) ----------
const icsDay = (ts) => { const d = new Date(ts); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
export function icsForDues(items) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BudgetFlow//ES', 'CALSCALE:GREGORIAN'];
  for (const it of items) {
    L.push('BEGIN:VEVENT', `UID:${it.uid}@budgetflow`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART:${icsDay(it.first)}T100000`, `DTEND:${icsDay(it.first)}T103000`, `SUMMARY:💸 Vence: ${it.title}`,
      `DESCRIPTION:${it.desc || 'Recordatorio de BudgetFlow'}`);
    if (it.count !== 1) L.push(`RRULE:FREQ=MONTHLY${it.count ? `;COUNT=${it.count}` : ''}`);
    L.push('BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', `DESCRIPTION:En 3 días vence ${it.title}`, 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:Hoy vence ${it.title}`, 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
/** Arma la lista de vencimientos recurrentes para exportar. */
export function calendarItems(data, k, rates) {
  const payday = data.profile?.payday || 'last';
  const cards = data.cards || [];
  const items = [];
  for (const f of (data.fixed || []).filter((f) => f.active !== false && !isCard(f.method, cards)))
    items.push({ uid: 'f' + f.id, title: f.name, first: occurrenceInPeriod(f.dueDay, k, payday), desc: money(toARS(f.amount, f.currency, rates)) });
  for (const c of cards) items.push({ uid: 'c' + c.id, title: `Resumen ${c.name}`, first: statementFor(c, k, payday).due, desc: 'Pagar el resumen de la tarjeta' });
  for (const i of (data.installments || []).filter((i) => !isCard(i.method, cards))) {
    const st = installmentStatus(i, k);
    if (st.state === 'done') continue;
    const fromK = st.state === 'future' ? i.startPeriod : k;
    items.push({ uid: 'i' + i.id, title: `${i.name} (cuota)`, first: occurrenceInPeriod(i.dueDay || 10, fromK, payday), count: st.left, desc: `${st.left} cuotas restantes` });
  }
  return items;
}

export function money(n, opts = {}) {
  const v = Math.round(n || 0);
  const s = Math.abs(v).toLocaleString('es-AR');
  return `${v < 0 ? '−' : ''}${opts.usd ? 'US$' : '$'}${s}`;
}
export const usd = (n) => `US$${(+n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
