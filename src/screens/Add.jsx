import { useState } from 'react';
import { money, usd, monthKeyFor, shiftKey, keyLabel, quickPicks } from '../month.js';
import { CATEGORIES, Seg, Confirm, toDateInput, numToInput, catInfo } from '../components.jsx';
import { useMoney, MoneyField } from '../money.jsx';

/** Anotar (o editar) un gasto, el sueldo o un ingreso extra. */
export default function Add({ ctx, editing, fixed, kind, onDone }) {
  const { store, data, toast, rates } = ctx;
  const e = editing;
  const [type, setType] = useState(e ? (e.kind ? 'in' : 'out') : kind ? 'in' : 'out');
  const [inKind, setInKind] = useState(e?.kind || kind || 'salary');
  const m = useMoney(rates, e || (fixed ? { amount: fixed.amount, currency: fixed.currency, fixed: true } : {}));
  const [category, setCategory] = useState(e?.category || (fixed ? 'Pagos fijos' : lastCategory(data) || 'Súper'));
  const [note, setNote] = useState(e?.note ?? (fixed ? fixed.name : ''));
  const [date, setDate] = useState(toDateInput(e?.date || Date.now()));
  const [monthKey, setMonthKey] = useState(e?.month || null); // null = el sugerido por la fecha
  const [err, setErr] = useState('');
  const [del, setDel] = useState(false);

  const ts = (() => {
    if (e && date === toDateInput(e.date)) return e.date;
    if (date === toDateInput(Date.now())) return Date.now();
    return new Date(date + 'T12:00').getTime();
  })();
  const suggested = monthKeyFor(ts);
  const salaryMonth = monthKey || suggested;
  const isSalary = type === 'in' && inKind === 'salary';
  const picks = !e && !fixed && type === 'out' ? quickPicks(data) : [];

  // Gasto rápido: completa monto, moneda, categoría y nota con la última vez
  const usePick = (x) => {
    m.setAmount(numToInput(x.amount));
    m.setCurrency(x.currency || 'ARS');
    if (x.currency === 'USD' && x.rateType) m.pickRate(x.rateType);
    setCategory(x.category); setNote(x.note); setErr('');
  };

  async function save() {
    const problem = m.error();
    if (problem) return setErr(problem);
    const col = type === 'in' ? 'incomes' : 'expenses';
    const id = e?.id || store.newId(col);
    const base = { ...m.fields(), date: ts, note: note.trim(), createdAt: e?.createdAt || Date.now() };
    if (type === 'in') {
      await store.set('incomes', id, { ...base, kind: inKind, ...(inKind === 'salary' ? { month: salaryMonth } : {}) });
      toast(inKind === 'salary' ? `💼 Sueldo anotado · arranca ${keyLabel(salaryMonth)}` : '💰 Ingreso anotado');
    } else {
      const fixedId = e?.fixedId || fixed?.id;
      await store.set('expenses', id, { ...base, category, ...(fixedId ? { fixedId } : {}) });
      toast(fixed ? `✅ ${fixed.name} pagado` : `✅ Gasto de ${m.isUsd ? usd(m.value) : money(m.value)} anotado`);
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
      {picks.length > 0 && (
        <div className="quick">
          <div className="label">⚡ Rápidos</div>
          <div className="chips scroll">
            {picks.map((x) => (
              <button key={x.id} className="chip qp" onClick={() => usePick(x)}>
                {catInfo(x.category).icon} {x.note} <small>{x.currency === 'USD' ? usd(x.amount) : money(x.amount)}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <MoneyField m={m} onChange={() => setErr('')} />

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

      {!isSalary && (
        <input className="input" style={{ marginTop: 14 }} placeholder={type === 'in' ? 'De dónde (ej: aguinaldo, venta)' : '¿Qué fue? (ej: Coto, SUBE)'}
          aria-label="Nota" value={note} onChange={(ev) => setNote(ev.target.value)} />
      )}
      <label className="label" style={{ marginTop: 14 }}>{isSalary ? '¿Qué día cobraste?' : 'Fecha'}</label>
      <input className="input" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} aria-label="Fecha" />
      {isSalary && <>
        <label className="label" style={{ marginTop: 14 }}>¿De qué mes es este sueldo?</label>
        <div className="chips">
          {[-1, 0, 1].map((n) => shiftKey(suggested, n)).map((k) => (
            <button key={k} className={'chip g' + (salaryMonth === k ? ' on' : '')} onClick={() => setMonthKey(k)}>{keyLabel(k)}</button>
          ))}
        </div>
        <div className="hint">Desde el día que cobraste arranca tu mes de <b>{keyLabel(salaryMonth)}</b>. Todo lo que anotes después cuenta para ese mes, hasta que anotes el próximo sueldo.</div>
      </>}

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
