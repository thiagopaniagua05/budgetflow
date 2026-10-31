import { useState } from 'react';
import { money, usd, summary } from '../month.js';
import { Confirm, Sheet, Seg, parseNum, fmtInput, numToInput, fmtDate } from '../components.jsx';

const ICONS = ['🏠', '🏢', '💡', '🔥', '💧', '🌐', '📱', '🎬', '🎵', '🏋️', '🚗', '🎓', '🛡️', '📌'];
const amt = (x) => (x.currency === 'USD' ? usd(x.amount) : money(x.amount));

/** Lista de pagos fijos del mes: estado (pagado / pendiente) y botón para pagar. */
export function FixedList({ ctx, s, onEdit }) {
  if (!s.fixed.length) return <div className="empty">Todavía no cargaste pagos fijos (alquiler, luz, internet…).</div>;
  return s.fixed.map((f) => (
    <div key={f.id} className={'item fixed' + (f.paid ? ' done' : '')}>
      <button className="ic" onClick={() => onEdit?.(f)} aria-label={`Editar ${f.name}`}>{f.icon || '📌'}</button>
      <button className="grow" style={{ minWidth: 0, textAlign: 'left' }} onClick={() => onEdit?.(f)}>
        <div className="t ellipsis">{f.name}</div>
        <div className="s">{f.paid ? `Pagado el ${fmtDate(f.paid.date)}` : `Pendiente · ${amt(f)}`}</div>
      </button>
      {f.paid
        ? <button className="amt money pos" onClick={() => ctx.openAdd({ editing: f.paid })}>{amt(f.paid)} ✓</button>
        : <button className="btn small primary" onClick={() => ctx.openAdd({ fixed: f })}>Pagar</button>}
    </div>
  ));
}

/** Pestaña "Fijos" dentro de Gastos. */
export default function FixedView({ ctx }) {
  const { data, period, rates } = ctx;
  const s = summary(data, period, rates);
  const [edit, setEdit] = useState(null); // pago fijo que se está editando ({} = nuevo)
  const total = s.fixed.reduce((a, f) => a + (f.currency === 'USD' ? (+f.amount || 0) * (rates?.tarjeta || 0) : +f.amount || 0), 0);
  return (
    <>
      <section className="card">
        <div className="card-h">
          <div className="card-t">📌 Pagos fijos · {period.label}</div>
          {s.fixed.length > 0 && <span className={'pill' + (s.pending ? ' w' : ' g')}>{s.pending ? `Falta ${money(s.pending)}` : 'Todo pagado ✓'}</span>}
        </div>
        <FixedList ctx={ctx} s={s} onEdit={setEdit} />
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => setEdit({})}>+ Agregar pago fijo</button>
        {s.fixed.length > 0 && <div className="hint">Son {money(total)} por mes en total. Tocá uno para cambiarlo o borrarlo.</div>}
      </section>
      {edit && <FixedSheet ctx={ctx} f={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

export function FixedSheet({ ctx, f, onClose }) {
  const { store, toast } = ctx;
  const [name, setName] = useState(f.name || '');
  const [amount, setAmount] = useState(numToInput(f.amount));
  const [icon, setIcon] = useState(f.icon || '📌');
  const [currency, setCurrency] = useState(f.currency || 'ARS');
  const [del, setDel] = useState(false);
  const ok = name.trim() && parseNum(amount) > 0;
  const save = async () => {
    if (!ok) return;
    await store.set('fixed', f.id || store.newId('fixed'), { name: name.trim(), amount: parseNum(amount), currency, icon, createdAt: f.createdAt || Date.now() });
    toast('✅ Pago fijo guardado');
    onClose();
  };
  return (
    <Sheet title={f.id ? 'Editar pago fijo' : 'Nuevo pago fijo'} onClose={onClose}>
      <div className="chips">{ICONS.map((i) => <button key={i} className={'chip' + (icon === i ? ' on' : '')} onClick={() => setIcon(i)}>{i}</button>)}</div>
      <div className="field"><label className="label">Nombre</label><input className="input" placeholder="Ej: Alquiler, Luz, Internet" aria-label="Nombre del pago" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label className="label">Monto aproximado</label>
        <div className="row">
          <input className="input grow" inputMode="decimal" placeholder={currency === 'USD' ? 'US$' : '$'} aria-label="Monto del pago" value={amount} onChange={(e) => setAmount(fmtInput(e.target.value, amount))} />
          <div style={{ width: 150 }}><Seg value={currency} onChange={setCurrency} options={[['ARS', '$'], ['USD', 'US$']]} /></div>
        </div>
      </div>
      <div className="hint">Cuando lo pagues podés corregir el monto real.</div>
      <div className="row" style={{ marginTop: 16 }}>
        {f.id && <button className="btn danger" onClick={() => setDel(true)}>Borrar</button>}
        <button className="btn primary grow" disabled={!ok} onClick={save}>Guardar</button>
      </div>
      {del && <Confirm text={`Se borra "${f.name}" de tus pagos fijos. Lo que ya pagaste queda anotado.`} okText="Borrar" onCancel={() => setDel(false)}
        onOk={async () => { await store.remove('fixed', f.id); onClose(); }} />}
    </Sheet>
  );
}
