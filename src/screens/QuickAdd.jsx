import { useState } from 'react';
import * as F from '../finance.js';
import { CATEGORIES, Seg, Confirm, toDateInput, parseNum, fmtDate } from '../components.jsx';

/** Registro rápido de gasto (o ingreso extra). `editing` = gasto existente. */
export default function QuickAdd({ ctx, editing, onDone }) {
  const { store, data, rates } = ctx;
  const e = editing;
  const isIncome = e?.oneOff;
  const cards = data.cards || [];
  const payday = data.profile?.payday || 'last';
  const [type, setType] = useState(isIncome ? 'in' : 'out');
  const [amount, setAmount] = useState(e ? String(e.amount).replace('.', ',') : '');
  const [currency, setCurrency] = useState(e?.currency || 'ARS');
  const [category, setCategory] = useState(e?.category || lastUsed(data, 'category') || 'Súper');
  const [method, setMethod] = useState(() => {
    const m = e?.method || lastUsed(data, 'method') || 'cash';
    return m === 'cash' || m === 'debit' || cards.some((c) => c.id === m) ? m : 'cash';
  });
  const [note, setNote] = useState(e?.note || e?.name || '');
  const [date, setDate] = useState(toDateInput(e?.date || Date.now()));
  const [otherDate, setOtherDate] = useState(!!e);
  const [err, setErr] = useState('');
  const [del, setDel] = useState(false);

  const methods = [['cash', '💵 Efectivo'], ['debit', '🏦 Débito'], ...cards.map((c) => [c.id, `💳 ${c.name}`])];
  const value = parseNum(amount);
  const card = cards.find((c) => c.id === method);
  const ts = (() => { const d = new Date(date + 'T12:00'); const t = new Date(); d.setHours(t.getHours(), t.getMinutes()); return d.getTime(); })();
  const paidIn = card && type === 'out' ? F.periodPaidForCardPurchase(card, ts, payday) : null;

  async function save() {
    if (!(value > 0)) return setErr('Poné un monto');
    if (type === 'in') {
      const id = e?.id || store.newId('incomes');
      await store.set('incomes', id, { name: note.trim() || 'Ingreso extra', amount: value, currency, oneOff: true, period: F.periodOf(ts, payday), date: ts, createdAt: e?.createdAt || Date.now() });
      ctx.toast('💰 Ingreso guardado');
      return onDone();
    }
    const id = e?.id || store.newId('expenses');
    await store.set('expenses', id, { date: ts, amount: value, currency, category, method, note: note.trim(), createdAt: e?.createdAt || Date.now() });
    const ars = F.toARS(value, currency, rates, !!card);
    ctx.toast(card ? `💳 ${F.money(ars)} · se paga en el resumen de ${F.periodLabel(paidIn)}` : `✅ Gasto de ${F.money(ars)} guardado`);
    onDone();
  }

  return (
    <div>
      {!e && <Seg value={type} onChange={setType} options={[['out', '💸 Gasto'], ['in', '💰 Ingreso extra']]} />}
      <div className="amount">
        <span className="cur">{currency === 'USD' ? 'US$' : '$'}</span>
        <input inputMode="decimal" placeholder="0" value={amount} autoFocus aria-label="Monto"
          onChange={(ev) => { setAmount(ev.target.value.replace(/[^\d.,]/g, '')); setErr(''); }} />
      </div>
      {currency === 'USD' && value > 0 && (
        <div className="hint" style={{ textAlign: 'center', marginTop: 0 }}>≈ {F.money(F.toARS(value, 'USD', rates, !!card))} {card ? '(dólar tarjeta)' : '(dólar MEP)'}</div>
      )}
      <div className="chips" style={{ justifyContent: 'center', marginTop: 6 }}>
        {['ARS', 'USD'].map((c) => <button key={c} className={'chip g' + (currency === c ? ' on' : '')} onClick={() => setCurrency(c)}>{c}</button>)}
      </div>

      {type === 'out' && (
        <>
          <div className="label" style={{ marginTop: 14 }}>Categoría</div>
          <div className="chips">
            {CATEGORIES.map((c) => <button key={c.name} className={'chip' + (category === c.name ? ' on' : '')} onClick={() => setCategory(c.name)}>{c.icon} {c.name}</button>)}
          </div>
          <div className="label" style={{ marginTop: 14 }}>Cómo pagaste</div>
          <div className="chips">
            {methods.map(([v, l]) => <button key={v} className={'chip g' + (method === v ? ' on' : '')} onClick={() => setMethod(v)}>{l}</button>)}
          </div>
          {paidIn && <div className="hint">💳 Entra en el resumen que vence en {F.periodLabel(paidIn)} ({fmtDate(F.statementFor(card, paidIn, payday).due)}).</div>}
        </>
      )}

      <input className="input" style={{ marginTop: 14 }} placeholder={type === 'in' ? 'De dónde (ej: venta, aguinaldo)' : 'Nota rápida (opcional)'} value={note} onChange={(ev) => setNote(ev.target.value)} />
      {otherDate
        ? <input className="input" style={{ marginTop: 10 }} type="date" value={date} onChange={(ev) => setDate(ev.target.value)} aria-label="Fecha" />
        : <button className="link" style={{ marginTop: 10 }} onClick={() => setOtherDate(true)}>📅 Hoy · cambiar fecha</button>}

      {err && <div className="error">{err}</div>}
      <div className="row" style={{ marginTop: 16 }}>
        {e && <button className="btn danger" onClick={() => setDel(true)}>Borrar</button>}
        <button className="btn primary grow" style={{ padding: 15 }} onClick={save}>{e ? 'Guardar cambios' : type === 'in' ? 'Guardar ingreso' : 'Guardar gasto'}</button>
      </div>
      {del && <Confirm text="Se borra este movimiento." okText="Borrar" onCancel={() => setDel(false)}
        onOk={async () => { await store.remove(isIncome ? 'incomes' : 'expenses', e.id); ctx.toast('🗑 Borrado'); onDone(); }} />}
    </div>
  );
}

function lastUsed(data, field) {
  const last = [...(data.expenses || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  return last?.[field];
}
