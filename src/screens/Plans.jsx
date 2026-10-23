import { useState } from 'react';
import * as F from '../finance.js';
import { Seg, Sheet, Confirm, FIXED_CATS, parseNum, toDateInput, fmtDate } from '../components.jsx';

const ICONS = ['🏠', '🏢', '💡', '🔥', '💧', '🌐', '📱', '🎬', '🎵', '📺', '🏋️', '🚗', '🛡️', '🎓', '🐶', '🧾', '💼', '💻', '🏦', '🎁'];
const COLORS = [['violet', '#6d28d9'], ['red', '#be123c'], ['green', '#0d9488'], ['gold', '#ca8a04'], ['gray', '#4b5563']];

export default function Plans({ ctx, tab, setTab }) {
  return (
    <>
      <div className="page-title">Fijos y cuotas</div>
      <div className="hint" style={{ marginTop: 2 }}>Lo que se repite todos los meses</div>
      <div style={{ marginTop: 14 }}>
        <Seg value={tab} onChange={setTab} options={[['fijos', 'Fijos'], ['cuotas', 'Cuotas'], ['tarjetas', 'Tarjetas'], ['ingresos', 'Ingresos']]} />
      </div>
      {tab === 'fijos' && <Fixed ctx={ctx} />}
      {tab === 'cuotas' && <Installments ctx={ctx} />}
      {tab === 'tarjetas' && <Cards ctx={ctx} />}
      {tab === 'ingresos' && <Incomes ctx={ctx} />}
    </>
  );
}

const methodLabel = (m, cards) => (m === 'cash' ? 'Efectivo / transferencia' : m === 'debit' ? 'Débito automático' : `💳 ${cards.find((c) => c.id === m)?.name || 'Tarjeta'}`);

function MethodPicker({ value, onChange, cards }) {
  return (
    <div className="chips">
      {[['cash', '💵 Efectivo/transf.'], ['debit', '🏦 Débito'], ...cards.map((c) => [c.id, `💳 ${c.name}`])].map(([v, l]) => (
        <button key={v} type="button" className={'chip g' + (value === v ? ' on' : '')} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
function CurrencyAmount({ amount, setAmount, currency, setCurrency, label = 'Monto' }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="row">
        <input className="input grow" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        <div className="seg" style={{ width: 120, flex: 'none' }}>
          {['ARS', 'USD'].map((c) => <button key={c} type="button" className={currency === c ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>)}
        </div>
      </div>
    </div>
  );
}
function Footer({ onDelete, onSave, label = 'Guardar' }) {
  const [c, setC] = useState(false);
  return (
    <>
      <div className="row" style={{ marginTop: 18 }}>
        {onDelete && <button className="btn danger" onClick={() => setC(true)}>Borrar</button>}
        <button className="btn primary grow" onClick={onSave}>{label}</button>
      </div>
      {c && <Confirm text="Se borra para siempre." okText="Borrar" onCancel={() => setC(false)} onOk={onDelete} />}
    </>
  );
}

// ---------------- Fijos ----------------
function Fixed({ ctx }) {
  const { data, rates, k } = ctx;
  const [edit, setEdit] = useState(null);
  const cards = data.cards || [];
  const list = [...(data.fixed || [])].sort((a, b) => (b.active !== false) - (a.active !== false) || a.dueDay - b.dueDay);
  const total = list.filter((f) => f.active !== false).reduce((a, f) => a + F.toARS(f.amount, f.currency, rates, cards.some((c) => c.id === f.method)), 0);
  const paid = (f) => (data.payments || []).some((p) => p.id === `fixed_${f.id}_${k}`);
  return (
    <>
      <section className="card">
        <div className="row"><div className="grow"><div className="card-t">Total fijo por mes</div><div style={{ fontSize: 26, fontWeight: 900 }} className="money">{F.money(total)}</div></div>
          <button className="btn primary small" onClick={() => setEdit({})}>+ Agregar</button></div>
      </section>
      <section className="card" style={{ padding: '4px 14px' }}>
        {!list.length && <div className="empty">Cargá alquiler, expensas, servicios, suscripciones…</div>}
        {list.map((f) => {
          const onCard = cards.some((c) => c.id === f.method);
          return (
            <button key={f.id} className="item" onClick={() => setEdit(f)} style={{ opacity: f.active === false ? 0.45 : 1 }}>
              <div className="ic">{f.icon || '🧾'}</div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="t ellipsis">{f.name}</div>
                <div className="s ellipsis">{f.active === false ? 'Pausado' : onCard ? methodLabel(f.method, cards) : `Vence el ${f.dueDay} · ${methodLabel(f.method, cards)}`}{!onCard && paid(f) ? ' · ✓ pagado' : ''}</div>
              </div>
              <div className="amt money">{F.money(F.toARS(f.amount, f.currency, rates, onCard))}{f.currency === 'USD' && <small>{F.usd(f.amount)}</small>}</div>
            </button>
          );
        })}
      </section>
      {edit && <FixedForm ctx={ctx} f={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </>
  );
}
function FixedForm({ ctx, f, onClose }) {
  const { store, data } = ctx;
  const [name, setName] = useState(f?.name || '');
  const [icon, setIcon] = useState(f?.icon || '🏠');
  const [amount, setAmount] = useState(f ? String(f.amount).replace('.', ',') : '');
  const [currency, setCurrency] = useState(f?.currency || 'ARS');
  const [dueDay, setDueDay] = useState(String(f?.dueDay || 10));
  const [method, setMethod] = useState(f?.method || 'cash');
  const [category, setCategory] = useState(f?.category || 'Servicios');
  const [active, setActive] = useState(f?.active !== false);
  const [err, setErr] = useState('');
  const onCard = (data.cards || []).some((c) => c.id === method);
  const save = async () => {
    if (!name.trim()) return setErr('Poné un nombre');
    if (!(parseNum(amount) > 0)) return setErr('Poné el monto');
    const d = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1));
    await store.set('fixed', f?.id || store.newId('fixed'), { name: name.trim(), icon, amount: parseNum(amount), currency, dueDay: d, method, category, active, createdAt: f?.createdAt || Date.now() });
    ctx.toast('✅ Guardado'); onClose();
  };
  return (
    <Sheet title={f ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onClose={onClose}>
      <div className="chips scroll">{ICONS.map((i) => <button key={i} type="button" className={'chip' + (icon === i ? ' on' : '')} onClick={() => setIcon(i)}>{i}</button>)}</div>
      <div className="field"><label className="label">Nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Alquiler, Netflix" /></div>
      <CurrencyAmount amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} label="Monto mensual" />
      <div className="field"><span className="label">Cómo lo pagás</span><MethodPicker value={method} onChange={setMethod} cards={data.cards || []} /></div>
      {!onCard
        ? <div className="field"><label className="label">Día de vencimiento</label><input className="input" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
        : <div className="hint">Se suma solo al resumen de la tarjeta todos los meses.</div>}
      <div className="field"><span className="label">Categoría</span><div className="chips">{FIXED_CATS.map((c) => <button key={c} type="button" className={'chip' + (category === c ? ' on' : '')} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
      <div className="row field"><div className="grow"><b>Activo</b><div className="hint" style={{ marginTop: 0 }}>Pausalo si lo das de baja por un tiempo</div></div><button type="button" className={'switch' + (active ? ' on' : '')} onClick={() => setActive(!active)} aria-label="Activo" /></div>
      {err && <div className="error">{err}</div>}
      <Footer onSave={save} onDelete={f ? async () => { await store.remove('fixed', f.id); onClose(); } : null} />
    </Sheet>
  );
}

// ---------------- Cuotas ----------------
function Installments({ ctx }) {
  const { data, k, rates } = ctx;
  const [edit, setEdit] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const cards = data.cards || [];
  const all = (data.installments || []).map((i) => ({ i, st: F.installmentStatus(i, k), ars: F.toARS(i.amountPer, i.currency, rates, cards.some((c) => c.id === i.method)) }));
  const active = all.filter((x) => x.st.state !== 'done').sort((a, b) => a.st.left - b.st.left);
  const done = all.filter((x) => x.st.state === 'done');
  const monthTotal = active.filter((x) => x.st.state === 'active').reduce((a, x) => a + x.ars, 0);
  const debt = active.reduce((a, x) => a + x.ars * x.st.left, 0);
  return (
    <>
      <section className="card">
        <div className="row">
          <div className="grow"><div className="card-t">Cuotas de {F.periodLabel(k)}</div><div style={{ fontSize: 26, fontWeight: 900 }} className="money">{F.money(monthTotal)}</div>
            <div className="hint" style={{ marginTop: 0 }}>Deuda total en cuotas: {F.money(debt)}</div></div>
          <button className="btn primary small" onClick={() => setEdit({})}>+ Agregar</button>
        </div>
      </section>
      <section className="card">
        {!active.length && <div className="empty">No tenés compras en cuotas activas 🎉</div>}
        {active.map(({ i, st, ars }) => (
          <button key={i.id} className="inst" style={{ width: '100%', textAlign: 'left', display: 'block' }} onClick={() => setEdit(i)}>
            <div className="row"><span className="grow ellipsis" style={{ fontWeight: 700 }}>{i.icon || '🧾'} {i.name}</span><b className="money">{F.money(ars)}/mes</b></div>
            <div className="sub">
              {methodLabel(i.method, cards)} · {st.state === 'future' ? `Empieza en ${F.periodLabel(i.startPeriod)}` : `Cuota ${st.current} de ${i.total}`} ·{' '}
              {st.left - (st.state === 'active' ? 1 : 0) === 0 ? 'última 🎉' : `termina en ${F.periodLabel(F.addMonths(i.startPeriod, i.total - 1))}`}
            </div>
            <div className="prog"><div style={{ width: `${((st.current || 0) / i.total) * 100}%` }} /></div>
          </button>
        ))}
      </section>
      {done.length > 0 && (
        <>
          <button className="link" style={{ marginTop: 12 }} onClick={() => setShowDone(!showDone)}>{showDone ? 'Ocultar' : `Ver ${done.length} saldada${done.length === 1 ? '' : 's'} ✓`}</button>
          {showDone && (
            <section className="card">
              {done.map(({ i, ars }) => (
                <button key={i.id} className="inst" style={{ width: '100%', textAlign: 'left', display: 'block' }} onClick={() => setEdit(i)}>
                  <div className="row"><span className="grow ellipsis" style={{ fontWeight: 700 }}>{i.icon || '🧾'} {i.name}</span><span className="pill g">Saldada 🎉</span></div>
                  <div className="sub">{i.total} cuotas de {F.money(ars)} · terminó en {F.periodLabel(F.addMonths(i.startPeriod, i.total - 1))}</div>
                  <div className="prog done"><div style={{ width: '100%' }} /></div>
                </button>
              ))}
            </section>
          )}
        </>
      )}
      {edit && <InstForm ctx={ctx} inst={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </>
  );
}
function InstForm({ ctx, inst, onClose }) {
  const { store, data, k } = ctx;
  const cards = data.cards || [];
  const payday = data.profile?.payday || 'last';
  const [name, setName] = useState(inst?.name || '');
  const [icon, setIcon] = useState(inst?.icon || '🧾');
  const [mode, setMode] = useState('cuota');
  const [amount, setAmount] = useState(inst ? String(inst.amountPer).replace('.', ',') : '');
  const [currency, setCurrency] = useState(inst?.currency || 'ARS');
  const [total, setTotal] = useState(String(inst?.total || 6));
  const [method, setMethod] = useState(inst?.method || cards[0]?.id || 'cash');
  const [dueDay, setDueDay] = useState(String(inst?.dueDay || 10));
  const [when, setWhen] = useState(inst ? 'current' : 'new');
  const [date, setDate] = useState(toDateInput(Date.now()));
  const cur0 = inst ? F.installmentStatus(inst, k) : null;
  const [current, setCurrent] = useState(String(cur0?.current || cur0?.paid || 1));
  const [err, setErr] = useState('');
  const card = cards.find((c) => c.id === method);
  const n = Math.max(1, parseInt(total, 10) || 1);
  const per = mode === 'cuota' ? parseNum(amount) : parseNum(amount) / n;

  const startPeriod = (() => {
    if (when === 'current') return F.startFromCurrent(k, Math.min(n, Math.max(1, parseInt(current, 10) || 1)));
    const ts = new Date(date + 'T12:00').getTime();
    if (card) return F.periodPaidForCardPurchase(card, ts, payday);
    let pk = F.periodOf(ts, payday);
    for (let i = 0; i < 3; i++) { if (F.occurrenceInPeriod(dueDay, pk, payday) >= ts) return pk; pk = F.addMonths(pk, 1); }
    return pk;
  })();

  const save = async () => {
    if (!name.trim()) return setErr('Poné qué compraste');
    if (!(per > 0)) return setErr('Poné el monto');
    await store.set('installments', inst?.id || store.newId('installments'), {
      name: name.trim(), icon, amountPer: Math.round(per * 100) / 100, currency, total: n, method, startPeriod,
      ...(card ? {} : { dueDay: Math.min(31, Math.max(1, parseInt(dueDay, 10) || 10)) }), createdAt: inst?.createdAt || Date.now(),
    });
    ctx.toast('✅ Cuotas guardadas'); onClose();
  };
  return (
    <Sheet title={inst ? 'Editar compra en cuotas' : 'Nueva compra en cuotas'} onClose={onClose}>
      <div className="chips scroll">{['🧾', '👟', '📱', '💻', '📺', '🧊', '🛋️', '🚗', '✈️', '🎮', '👕', '🏍️'].map((i) => <button key={i} type="button" className={'chip' + (icon === i ? ' on' : '')} onClick={() => setIcon(i)}>{i}</button>)}</div>
      <div className="field"><label className="label">¿Qué compraste?</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Zapatillas Nike" /></div>
      <div className="field"><Seg value={mode} onChange={setMode} options={[['cuota', 'Valor de cada cuota'], ['total', 'Valor total']]} /></div>
      <CurrencyAmount amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} label={mode === 'cuota' ? 'Valor de cada cuota' : 'Valor total'} />
      <div className="field"><label className="label">Cantidad de cuotas</label>
        <div className="chips">{[1, 3, 6, 9, 12, 18, 24].map((x) => <button key={x} type="button" className={'chip' + (n === x ? ' on' : '')} onClick={() => setTotal(String(x))}>{x}</button>)}
          <input className="input" style={{ width: 80 }} inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} aria-label="Cuotas" /></div>
        {mode === 'total' && per > 0 && <div className="hint">= {n} cuotas de {currency === 'USD' ? F.usd(per) : F.money(per)}</div>}
      </div>
      <div className="field"><span className="label">¿Con qué la pagás?</span><MethodPicker value={method} onChange={setMethod} cards={cards} /></div>
      {!card && <div className="field"><label className="label">Día de vencimiento</label><input className="input" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>}
      <div className="field"><Seg value={when} onChange={setWhen} options={[['new', 'Compra nueva'], ['current', 'Ya la venía pagando']]} /></div>
      {when === 'new'
        ? <div className="field"><label className="label">Fecha de compra</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        : <div className="field"><label className="label">¿Qué cuota pagás en {F.periodLabel(k)}?</label><input className="input" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>}
      <div className="alert vio" style={{ marginTop: 12 }}>📆<div>Primera cuota en <b>{F.periodLabel(startPeriod)}</b>{card ? ` (resumen ${card.name})` : ''} y la última en <b>{F.periodLabel(F.addMonths(startPeriod, n - 1))}</b>. Después se salda sola.</div></div>
      {err && <div className="error">{err}</div>}
      <Footer onSave={save} onDelete={inst ? async () => { await store.remove('installments', inst.id); onClose(); } : null} />
    </Sheet>
  );
}

// ---------------- Tarjetas ----------------
function Cards({ ctx }) {
  const { data, k, now, rates, store } = ctx;
  const [edit, setEdit] = useState(null);
  const pd = F.computePeriod(data, k, now, rates);
  const nx = F.nextPeriodCommitted(data, k, now, rates);
  return (
    <>
      <div className="row" style={{ marginTop: 14 }}>
        <div className="hint grow" style={{ marginTop: 0 }}>Con la fecha de cierre la app sabe en qué resumen cae cada compra.</div>
        <button className="btn primary small" onClick={() => setEdit({})}>+ Tarjeta</button>
      </div>
      {!(data.cards || []).length && <div className="card empty">Agregá tus tarjetas de crédito con su día de cierre y vencimiento.</div>}
      {(data.cards || []).map((c) => {
        const s = pd.statements.find((x) => x.card.id === c.id);
        const n = nx.statements.find((x) => x.card.id === c.id);
        return (
          <section key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button className={'ccard ' + (c.color || 'violet')} style={{ width: '100%', borderRadius: 0 }} onClick={() => setEdit(c)}>
              <div className="row"><div className="nm grow">{c.name}</div><span style={{ fontSize: 12, opacity: 0.8 }}>Editar ✎</span></div>
              <div><div className="am money">{F.money(s.total)}</div><div className="ds">Resumen de {F.periodLabel(k)} · cerró {fmtDate(s.close)} · vence {fmtDate(s.due)}</div></div>
            </button>
            <div style={{ padding: '6px 16px 14px' }}>
              <div className="r" style={{ padding: '6px 0' }}><span className="muted">Consumos ({s.consumos.length})</span><b className="money">{F.money(s.consARS)}</b></div>
              <div className="r" style={{ padding: '6px 0' }}><span className="muted">Cuotas ({s.cuotas.length})</span><b className="money">{F.money(s.cuotas.reduce((a, x) => a + x.ars, 0))}</b></div>
              <div className="r" style={{ padding: '6px 0' }}><span className="muted">Fijos / suscripciones ({s.fijos.length})</span><b className="money">{F.money(s.fijos.reduce((a, x) => a + x.ars, 0))}</b></div>
              {s.usd > 0 && <div className="hint">Incluye {F.usd(s.usd)} al dólar tarjeta.</div>}
              <div className="row" style={{ marginTop: 8 }}>
                <div className="grow hint" style={{ marginTop: 0 }}>Próximo ({F.periodLabel(F.addMonths(k, 1))}): <b style={{ color: 'var(--text)' }}>{F.money(n?.total || 0)}</b> hasta ahora</div>
                <button className={'btn small' + (s.paid ? '' : ' primary')} onClick={async () => {
                  const id = `card_${c.id}_${k}`;
                  if (s.paid) await store.remove('payments', id); else { await store.set('payments', id, { at: Date.now() }); ctx.toast('✅ Resumen pagado'); }
                }}>{s.paid ? '↺ Pagado' : '✓ Pagado'}</button>
              </div>
            </div>
          </section>
        );
      })}
      {edit && <CardForm ctx={ctx} c={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </>
  );
}
function CardForm({ ctx, c, onClose }) {
  const { store } = ctx;
  const [name, setName] = useState(c?.name || '');
  const [closeDay, setCloseDay] = useState(String(c?.closeDay || 25));
  const [dueDay, setDueDay] = useState(String(c?.dueDay || 5));
  const [color, setColor] = useState(c?.color || 'violet');
  const [err, setErr] = useState('');
  const save = async () => {
    if (!name.trim()) return setErr('Poné un nombre, ej: Visa Galicia');
    const cd = parseInt(closeDay, 10), dd = parseInt(dueDay, 10);
    if (!(cd >= 1 && cd <= 31 && dd >= 1 && dd <= 31)) return setErr('Los días tienen que ser entre 1 y 31');
    await store.set('cards', c?.id || store.newId('cards'), { name: name.trim(), closeDay: cd, dueDay: dd, color, createdAt: c?.createdAt || Date.now() });
    ctx.toast('💳 Tarjeta guardada'); onClose();
  };
  return (
    <Sheet title={c ? 'Editar tarjeta' : 'Nueva tarjeta'} onClose={onClose}>
      <div className="field" style={{ marginTop: 0 }}><label className="label">Nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Visa Galicia" /></div>
      <div className="grid2">
        <div className="field"><label className="label">Día de cierre</label><input className="input" inputMode="numeric" value={closeDay} onChange={(e) => setCloseDay(e.target.value)} /></div>
        <div className="field"><label className="label">Día de vencimiento</label><input className="input" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
      </div>
      <div className="hint">Los encontrás en el resumen o en la app del banco. Si cambian un poco cada mes, poné los habituales.</div>
      <div className="field"><span className="label">Color</span><div className="chips">{COLORS.map(([v, col]) => (
        <button key={v} type="button" onClick={() => setColor(v)} aria-label={v} style={{ width: 38, height: 38, borderRadius: 12, background: col, outline: color === v ? '3px solid #fff' : 'none', outlineOffset: 2 }} />))}</div></div>
      {err && <div className="error">{err}</div>}
      <Footer onSave={save} onDelete={c ? async () => { await store.remove('cards', c.id); onClose(); } : null} />
    </Sheet>
  );
}

// ---------------- Ingresos ----------------
function Incomes({ ctx }) {
  const { data, k, now, rates, store } = ctx;
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const pd = F.computePeriod(data, k, now, rates);
  const recurring = (data.incomes || []).filter((i) => !i.oneOff);
  const extras = (data.incomes || []).filter((i) => i.oneOff && i.period === k);
  return (
    <>
      <section className="card">
        <div className="row">
          <div className="grow"><div className="card-t">Ingresos de {F.periodLabel(k)}</div><div style={{ fontSize: 26, fontWeight: 900 }} className="money pos">{F.money(pd.incomeTotal)}</div>
            <div className="hint" style={{ marginTop: 0 }}>Cobrás {data.profile?.payday === 'last' || !data.profile?.payday ? 'el último día de cada mes' : `el día ${data.profile.payday}`} · se cambia en Ajustes</div></div>
          <button className="btn primary small" onClick={() => setEdit({})}>+ Agregar</button>
        </div>
      </section>
      <section className="card" style={{ padding: '4px 14px' }}>
        {!recurring.length && <div className="empty">Cargá tu sueldo y otros ingresos fijos.</div>}
        {recurring.map((inc) => {
          const x = F.incomeFor(inc, k, data.receipts || []);
          return (
            <div key={inc.id} className="item">
              <button className="ic" onClick={() => setEdit(inc)}>{inc.icon || '💼'}</button>
              <button className="grow" style={{ minWidth: 0, textAlign: 'left' }} onClick={() => setEdit(inc)}>
                <div className="t ellipsis">{inc.name}</div>
                <div className="s">{inc.active === false ? 'Pausado' : x?.confirmed ? '✓ Cobrado' : `Esperado: ${inc.currency === 'USD' ? F.usd(inc.amount) : F.money(inc.amount)}`}</div>
              </button>
              {inc.active !== false && (x?.confirmed
                ? <button className="amt money pos" onClick={() => setConfirm(inc)}>{inc.currency === 'USD' ? F.usd(x.amount) : F.money(x.amount)}<small>editar</small></button>
                : <button className="btn small primary" onClick={() => setConfirm(inc)}>Confirmar</button>)}
            </div>
          );
        })}
      </section>
      {extras.length > 0 && (
        <section className="card" style={{ padding: '4px 14px' }}>
          {extras.map((i) => (
            <button key={i.id} className="item" onClick={() => ctx.openQuickAdd(i)}>
              <div className="ic">💰</div><div className="grow"><div className="t">{i.name}</div><div className="s">Ingreso extra</div></div>
              <div className="amt money pos">+{i.currency === 'USD' ? F.usd(i.amount) : F.money(i.amount)}</div>
            </button>
          ))}
        </section>
      )}
      <div className="hint" style={{ marginTop: 10 }}>Para un ingreso de una sola vez (aguinaldo, una venta) usá el botón + y elegí "Ingreso extra".</div>
      {edit && <IncomeForm ctx={ctx} inc={edit.id ? edit : null} onClose={() => setEdit(null)} />}
      {confirm && <ConfirmIncome ctx={ctx} inc={confirm} onClose={() => setConfirm(null)} />}
    </>
  );
}
function IncomeForm({ ctx, inc, onClose }) {
  const { store } = ctx;
  const [name, setName] = useState(inc?.name || 'Sueldo');
  const [icon, setIcon] = useState(inc?.icon || '💼');
  const [amount, setAmount] = useState(inc ? String(inc.amount).replace('.', ',') : '');
  const [currency, setCurrency] = useState(inc?.currency || 'ARS');
  const [active, setActive] = useState(inc?.active !== false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!(parseNum(amount) > 0)) return setErr('Poné el monto esperado');
    await store.set('incomes', inc?.id || store.newId('incomes'), { name: name.trim() || 'Ingreso', icon, amount: parseNum(amount), currency, active, fromPeriod: inc?.fromPeriod || ctx.k, createdAt: inc?.createdAt || Date.now() });
    ctx.toast('✅ Ingreso guardado'); onClose();
  };
  return (
    <Sheet title={inc ? 'Editar ingreso' : 'Nuevo ingreso mensual'} onClose={onClose}>
      <div className="chips scroll">{['💼', '💻', '🏠', '📈', '🎓', '🤝', '💵'].map((i) => <button key={i} type="button" className={'chip' + (icon === i ? ' on' : '')} onClick={() => setIcon(i)}>{i}</button>)}</div>
      <div className="field"><label className="label">Nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <CurrencyAmount amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} label="Monto esperado por mes" />
      <div className="hint">Cada mes confirmás cuánto entró de verdad. Mientras no lo confirmes se usa este monto.</div>
      <div className="row field"><div className="grow"><b>Activo</b></div><button type="button" className={'switch' + (active ? ' on' : '')} onClick={() => setActive(!active)} aria-label="Activo" /></div>
      {err && <div className="error">{err}</div>}
      <Footer onSave={save} onDelete={inc ? async () => { await store.remove('incomes', inc.id); onClose(); } : null} />
    </Sheet>
  );
}
function ConfirmIncome({ ctx, inc, onClose }) {
  const { store, k, data } = ctx;
  const r = (data.receipts || []).find((x) => x.incomeId === inc.id && x.period === k);
  const [amount, setAmount] = useState(String(r?.amount ?? inc.amount).replace('.', ','));
  const id = `${inc.id}_${k}`;
  return (
    <Sheet title={`¿Cuánto cobraste de ${inc.name}?`} onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>Para {F.periodLabel(k)}. Esperado: {inc.currency === 'USD' ? F.usd(inc.amount) : F.money(inc.amount)}.</p>
      <div className="amount"><span className="cur">{inc.currency === 'USD' ? 'US$' : '$'}</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus aria-label="Monto cobrado" /></div>
      <div className="row" style={{ marginTop: 12 }}>
        {r && <button className="btn" onClick={async () => { await store.remove('receipts', id); onClose(); }}>Desconfirmar</button>}
        <button className="btn primary grow" onClick={async () => {
          await store.set('receipts', id, { incomeId: inc.id, period: k, amount: parseNum(amount), at: Date.now() });
          ctx.toast('💰 Cobro confirmado'); onClose();
        }}>Confirmar cobro</button>
      </div>
    </Sheet>
  );
}
