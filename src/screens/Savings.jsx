import { useState } from 'react';
import { money, usd, ars, savingsTotals } from '../month.js';
import { Seg, Confirm, toDateInput, fmtDate } from '../components.jsx';
import { useMoney, MoneyField } from '../money.jsx';

const PLACES = ['Cuenta remunerada', 'Plazo fijo', 'Dólares', 'Fondo (FCI)', 'Efectivo'];

/** Lo que va adentro de la sección "Ahorros" de Inicio. */
export function SavingsPanel({ ctx }) {
  const { data } = ctx;
  const t = savingsTotals(data);
  const moves = [...(data.savings || [])].sort((a, b) => b.date - a.date).slice(0, 4);
  return (
    <>
      <div className="savetot">
        <div><span>En pesos</span><b className="money">{money(t.ARS)}</b></div>
        <div><span>En dólares</span><b className="money">{usd(t.USD)}</b></div>
      </div>
      {moves.map((x) => (
        <button key={x.id} className="item" onClick={() => ctx.openSave({ editing: x })}>
          <div className="ic">{x.kind === 'out' ? '↩️' : '🐷'}</div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="t ellipsis">{x.note || (x.kind === 'out' ? 'Saqué de ahorros' : 'Guardé')}</div>
            <div className="s">{fmtDate(x.date)}</div>
          </div>
          <div className={'amt money' + (x.kind === 'out' ? '' : ' pos')}>
            {x.kind === 'out' ? '−' : '+'}{x.currency === 'USD' ? usd(x.amount) : money(x.amount)}
            {x.currency === 'USD' && <small>≈ {money(ars(x))}</small>}
          </div>
        </button>
      ))}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn grow" onClick={() => ctx.openSave({ kind: 'out' })}>Sacar</button>
        <button className="btn primary grow" onClick={() => ctx.openSave({})}>🐷 Guardar plata</button>
      </div>
    </>
  );
}

/** Guardar en (o sacar de) ahorros. `amount`/`date` sirven para guardar lo que sobró de un mes. */
export function SaveSheet({ ctx, editing, kind, amount, date, onDone }) {
  const { store, toast, rates } = ctx;
  const e = editing;
  const [k, setK] = useState(e?.kind || kind || 'in');
  const m = useMoney(rates, e || { amount });
  const [note, setNote] = useState(e?.note || '');
  const [day, setDay] = useState(toDateInput(e?.date || date || Date.now()));
  const [err, setErr] = useState('');
  const [del, setDel] = useState(false);

  const ts = (() => {
    if (e && day === toDateInput(e.date)) return e.date;
    if (date && day === toDateInput(date)) return date;
    if (day === toDateInput(Date.now())) return Date.now();
    return new Date(day + 'T12:00').getTime();
  })();

  async function save() {
    const problem = m.error();
    if (problem) return setErr(problem);
    await store.set('savings', e?.id || store.newId('savings'), { ...m.fields(), kind: k, note: note.trim(), date: ts, createdAt: e?.createdAt || Date.now() });
    toast(k === 'out' ? '↩️ Anotado: sacaste de tus ahorros' : '🐷 ¡Guardado en tus ahorros!');
    onDone();
  }

  return (
    <div>
      {!e && <Seg value={k} onChange={setK} options={[['in', '🐷 Guardar'], ['out', '↩️ Sacar']]} />}
      <MoneyField m={m} onChange={() => setErr('')} autoFocus={!amount} />
      <label className="label" style={{ marginTop: 14 }}>{k === 'out' ? '¿De dónde la sacaste?' : '¿Dónde la guardás?'}</label>
      <div className="chips">
        {PLACES.map((p) => <button key={p} className={'chip' + (note === p ? ' on' : '')} onClick={() => setNote(p)}>{p}</button>)}
      </div>
      <input className="input" style={{ marginTop: 10 }} placeholder="U otra cosa (ej: Mercado Pago, banco)" aria-label="Dónde" value={note} onChange={(ev) => setNote(ev.target.value)} />
      <label className="label" style={{ marginTop: 14 }}>Fecha</label>
      <input className="input" type="date" value={day} onChange={(ev) => setDay(ev.target.value)} aria-label="Fecha" />
      <div className="hint">{k === 'out'
        ? 'Lo que sacás vuelve a sumar a lo que te queda en el mes.'
        : 'Lo que guardás se descuenta de lo que te queda en el mes, así no lo gastás sin darte cuenta.'}</div>
      {err && <div className="error">{err}</div>}
      <div className="row" style={{ marginTop: 16 }}>
        {e && <button className="btn danger" onClick={() => setDel(true)}>Borrar</button>}
        <button className="btn primary grow" style={{ padding: 15 }} onClick={save}>{e ? 'Guardar cambios' : k === 'out' ? 'Sacar' : 'Guardar'}</button>
      </div>
      {del && <Confirm text="Se borra este movimiento de ahorros." okText="Borrar" onCancel={() => setDel(false)}
        onOk={async () => { await store.remove('savings', e.id); toast('🗑 Borrado'); onDone(); }} />}
    </div>
  );
}
