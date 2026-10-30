import { useState } from 'react';
import { money, usd, monthLabel } from '../month.js';
import { RATE_TYPES, lastRateType, saveRateType } from '../rates.js';
import { CATEGORIES, Seg, Confirm, toDateInput, parseNum } from '../components.jsx';

/** Anotar (o editar) un gasto, el sueldo o un ingreso extra. */
export default function Add({ ctx, editing, fixed, kind, onDone }) {
  const { store, data, toast, rates } = ctx;
  const e = editing;
  const [type, setType] = useState(e ? (e.kind ? 'in' : 'out') : kind ? 'in' : 'out');
  const [inKind, setInKind] = useState(e?.kind || kind || 'salary');
  const [amount, setAmount] = useState(e ? String(e.amount).replace('.', ',') : fixed ? String(fixed.amount || '') : '');
  const [category, setCategory] = useState(e?.category || (fixed ? 'Pagos fijos' : lastCategory(data) || 'Súper'));
  const [note, setNote] = useState(e?.note ?? (fixed ? fixed.name : ''));
  const [date, setDate] = useState(toDateInput(e?.date || Date.now()));
  const [currency, setCurrency] = useState(e?.currency || fixed?.currency || 'ARS');
  const [rateType, setRateType] = useState(e?.rateType || (fixed?.currency === 'USD' ? 'tarjeta' : lastRateType()));
  const [rate, setRate] = useState(e?.rate ? String(e.rate) : String((rates || {})[e?.rateType || (fixed?.currency === 'USD' ? 'tarjeta' : lastRateType())] || ''));
  const [err, setErr] = useState('');
  const pickRate = (t) => { setRateType(t); if (rates?.[t]) setRate(String(rates[t])); };
  const [del, setDel] = useState(false);

  const value = parseNum(amount);
  const rateNum = parseNum(rate);
  const isUsd = currency === 'USD';
  const ts = (() => {
    if (e && date === toDateInput(e.date)) return e.date;
    if (date === toDateInput(Date.now())) return Date.now();
    return new Date(date + 'T12:00').getTime();
  })();
  const col = type === 'in' ? 'incomes' : 'expenses';

  async function save() {
    if (!(value > 0)) return setErr('Poné un monto');
    if (isUsd && !(rateNum > 0)) return setErr('Poné a cuánto está el dólar');
    const id = e?.id || store.newId(col);
    const base = { amount: value, currency, date: ts, note: note.trim(), createdAt: e?.createdAt || Date.now(),
      ...(isUsd ? { rate: rateNum, rateType } : {}) };
    if (isUsd) saveRateType(rateType);
    if (type === 'in') {
      await store.set('incomes', id, { ...base, kind: inKind });
      toast(inKind === 'salary' ? `💼 Sueldo anotado · arranca ${monthLabel(ts)}` : '💰 Ingreso anotado');
    } else {
      const fixedId = e?.fixedId || fixed?.id;
      await store.set('expenses', id, { ...base, category, ...(fixedId ? { fixedId } : {}) });
      toast(fixed ? `✅ ${fixed.name} pagado` : `✅ Gasto de ${isUsd ? usd(value) : money(value)} anotado`);
    }
    onDone();
  }

  return (
    <div>
      {!e && !fixed && <Seg value={type} onChange={setType} options={[['out', '💸 Gasto'], ['in', '💰 Ingreso']]} />}
      {type === 'in' && !e && (
        <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className={'chip g' + (inKind === 'salary' ? ' on' : '')} onClick={() => setInKind('salary')}>💼 Sueldo</button>
          <button className={'chip g' + (inKind === 'extra' ? ' on' : '')} onClick={() => setInKind('extra')}>💰 Extra</button>
        </div>
      )}
      <div className="amount">
        <span className="cur">{isUsd ? 'US$' : '$'}</span>
        <input inputMode="decimal" placeholder="0" value={amount} autoFocus aria-label="Monto"
          onChange={(ev) => { setAmount(ev.target.value.replace(/[^\d.,]/g, '')); setErr(''); }} />
      </div>
      <div className="chips" style={{ justifyContent: 'center' }}>
        {[['ARS', '🇦🇷 Pesos'], ['USD', '🇺🇸 Dólares']].map(([c, l]) => (
          <button key={c} className={'chip g' + (currency === c ? ' on' : '')} onClick={() => setCurrency(c)}>{l}</button>
        ))}
      </div>
      {isUsd && (
        <div className="usdbox">
          <div className="chips">
            {RATE_TYPES.map(([t, l]) => <button key={t} className={'chip' + (rateType === t ? ' on' : '')} onClick={() => pickRate(t)}>{l}</button>)}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>1 US$ =</span>
            <input className="input grow" inputMode="decimal" placeholder="$ cotización" aria-label="Cotización" value={rate}
              onChange={(ev) => { setRate(ev.target.value.replace(/[^\d.,]/g, '')); setErr(''); }} />
          </div>
          {value > 0 && rateNum > 0 && <div className="hint">≈ <b className="money">{money(value * rateNum)}</b> en pesos{!rates ? '' : ' · cotización de hoy, la podés cambiar'}</div>}
          {!rates && !e && <div className="hint">No pude traer la cotización (¿sin internet?). Escribila a mano.</div>}
        </div>
      )}

      {type === 'out' && !fixed && !e?.fixedId && (
        <>
          <div className="label" style={{ marginTop: 6 }}>Categoría</div>
          <div className="chips">
            {CATEGORIES.filter((c) => c.name !== 'Pagos fijos').map((c) => (
              <button key={c.name} className={'chip' + (category === c.name ? ' on' : '')} onClick={() => setCategory(c.name)}>{c.icon} {c.name}</button>
            ))}
          </div>
        </>
      )}

      {!(type === 'in' && inKind === 'salary') && (
        <input className="input" style={{ marginTop: 14 }} placeholder={type === 'in' ? 'De dónde (ej: aguinaldo, venta)' : '¿Qué fue? (opcional)'}
          aria-label="Nota" value={note} onChange={(ev) => setNote(ev.target.value)} />
      )}
      <label className="label" style={{ marginTop: 14 }}>{type === 'in' && inKind === 'salary' ? '¿Qué día cobraste?' : 'Fecha'}</label>
      <input className="input" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} aria-label="Fecha" />
      {type === 'in' && inKind === 'salary' && <div className="hint">Desde este día arranca tu mes de <b>{monthLabel(ts)}</b>.</div>}

      {err && <div className="error">{err}</div>}
      <div className="row" style={{ marginTop: 16 }}>
        {e && <button className="btn danger" onClick={() => setDel(true)}>Borrar</button>}
        <button className="btn primary grow" style={{ padding: 15 }} onClick={save}>{e ? 'Guardar cambios' : fixed ? 'Marcar como pagado' : 'Guardar'}</button>
      </div>
      {del && <Confirm text={e.kind === 'salary' ? 'Se borra este sueldo (sus gastos pasan al mes anterior).' : 'Se borra este movimiento.'} okText="Borrar" onCancel={() => setDel(false)}
        onOk={async () => { await store.remove(e.kind ? 'incomes' : 'expenses', e.id); toast('🗑 Borrado'); onDone(); }} />}
    </div>
  );
}

function lastCategory(data) {
  const last = [...(data.expenses || [])].filter((x) => !x.fixedId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  return last?.category;
}
