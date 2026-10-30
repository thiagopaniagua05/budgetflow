import { useState } from 'react';
import { money, usd } from '../month.js';
import { Confirm, Sheet, Seg, parseNum } from '../components.jsx';
import { getTheme, setTheme } from '../theme.js';
import { RATE_TYPES } from '../rates.js';

const ICONS = ['🏠', '🏢', '💡', '🔥', '💧', '🌐', '📱', '🎬', '🎵', '🏋️', '🚗', '🎓', '🛡️', '📌'];

export default function Settings({ ctx }) {
  const { data, store, user, toast } = ctx;
  const p = data.profile || {};
  const [name, setName] = useState(p.name || '');
  const [edit, setEdit] = useState(null); // pago fijo que se está editando ({} = nuevo)
  const [logout, setLogout] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const { rates } = ctx;
  const fixed = [...(data.fixed || [])].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const total = fixed.reduce((a, f) => a + (f.currency === 'USD' ? (+f.amount || 0) * (rates?.tarjeta || 0) : +f.amount || 0), 0);

  return (
    <>
      <div className="page-title">Ajustes</div>

      <section className="card">
        <div className="card-h">
          <div className="card-t">📌 Pagos fijos</div>
          {fixed.length > 0 && <span className="pill">{money(total)} / mes</span>}
        </div>
        <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>Lo que pagás todos los meses. En Inicio los vas tildando a medida que los pagás.</div>
        {fixed.map((f) => (
          <button key={f.id} className="item" onClick={() => setEdit(f)}>
            <div className="ic">{f.icon || '📌'}</div>
            <div className="grow t ellipsis">{f.name}</div>
            <div className="amt money">{f.currency === 'USD' ? usd(f.amount) : money(f.amount)}</div>
          </button>
        ))}
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => setEdit({})}>+ Agregar pago fijo</button>
      </section>

      <section className="card">
        <div className="card-t">🎨 Apariencia</div>
        <div className="field">
          <Seg value={theme} onChange={(t) => { setThemeState(t); setTheme(t); }} options={[['auto', '📱 Auto'], ['light', '☀️ Claro'], ['dark', '🌙 Oscuro']]} />
        </div>
        <div className="hint">Automático usa el mismo modo que tu celular.</div>
      </section>

      <section className="card">
        <div className="card-h">
          <div className="card-t">💵 Dólar hoy</div>
          <button className="link" onClick={ctx.refreshRates}>Actualizar</button>
        </div>
        {rates ? (
          <div className="rategrid">
            {RATE_TYPES.map(([t, l]) => <div key={t}><span>{l}</span><b className="money">{money(rates[t])}</b></div>)}
          </div>
        ) : <div className="hint" style={{ marginTop: 0 }}>No se pudo traer la cotización. Revisá tu conexión.</div>}
        {rates?.at && <div className="hint">Actualizado {new Date(rates.at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · fuente: dolarapi.com</div>}
      </section>

      <section className="card">
        <div className="card-t">👤 Cuenta</div>
        <div className="field"><label className="label">Tu nombre</label>
          <div className="row">
            <input className="input grow" value={name} aria-label="Tu nombre" onChange={(e) => setName(e.target.value)} />
            {name.trim() && name.trim() !== p.name && <button className="btn small primary" onClick={async () => { await store.set('meta', 'profile', { ...p, name: name.trim() }); toast('✅ Guardado'); }}>Guardar</button>}
          </div>
        </div>
        <div className="hint">{user?.email} · tus datos son privados, nadie más los ve.</div>
        <div className="row" style={{ marginTop: 14 }}>
          {store.mode === 'demo' && <button className="btn grow" onClick={() => store.reset()}>Reiniciar demo</button>}
          <button className="btn danger grow" onClick={() => setLogout(true)}>Cerrar sesión</button>
        </div>
      </section>

      {edit && <FixedSheet ctx={ctx} f={edit} onClose={() => setEdit(null)} />}
      {logout && <Confirm text="Vas a tener que volver a poner tu email y contraseña." okText="Cerrar sesión" onCancel={() => setLogout(false)} onOk={() => store.logout()} />}
    </>
  );
}

function FixedSheet({ ctx, f, onClose }) {
  const { store, toast } = ctx;
  const [name, setName] = useState(f.name || '');
  const [amount, setAmount] = useState(f.amount ? String(f.amount) : '');
  const [icon, setIcon] = useState(f.icon || '📌');
  const [currency, setCurrency] = useState(f.currency || 'ARS');
  const [del, setDel] = useState(false);
  const save = async () => {
    if (!name.trim() || !(parseNum(amount) > 0)) return;
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
          <input className="input grow" inputMode="decimal" placeholder={currency === 'USD' ? 'US$' : '$'} aria-label="Monto del pago" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
          <div style={{ width: 150 }}><Seg value={currency} onChange={setCurrency} options={[['ARS', '$'], ['USD', 'US$']]} /></div>
        </div>
      </div>
      <div className="hint">Cuando lo pagues podés corregir el monto real.</div>
      <div className="row" style={{ marginTop: 16 }}>
        {f.id && <button className="btn danger" onClick={() => setDel(true)}>Borrar</button>}
        <button className="btn primary grow" disabled={!name.trim() || !(parseNum(amount) > 0)} onClick={save}>Guardar</button>
      </div>
      {del && <Confirm text={`Se borra "${f.name}" de tus pagos fijos. Lo que ya pagaste queda anotado.`} okText="Borrar" onCancel={() => setDel(false)}
        onOk={async () => { await store.remove('fixed', f.id); onClose(); }} />}
    </Sheet>
  );
}
