import { useState } from 'react';
import { money } from '../month.js';
import { Confirm, Seg } from '../components.jsx';
import { exportCSV } from '../export.js';
import { getTheme, setTheme } from '../theme.js';
import { RATE_TYPES } from '../rates.js';

export default function Settings({ ctx }) {
  const { data, store, user, toast } = ctx;
  const p = data.profile || {};
  const [name, setName] = useState(p.name || '');
  const [logout, setLogout] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const { rates } = ctx;

  return (
    <>
      <div className="page-title">Ajustes</div>

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
        <div className="card-t">💾 Copia de seguridad</div>
        <div className="hint" style={{ marginTop: 6 }}>Baja todos tus gastos, sueldos y ahorros en un archivo que se abre con Excel o Google Sheets.</div>
        <button className="btn block" style={{ marginTop: 12 }} onClick={() => { const c = exportCSV(data); toast(`📥 Descargado: ${c} movimientos`); }}>📥 Descargar en Excel</button>
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

      {logout && <Confirm text="Vas a tener que volver a poner tu email y contraseña." okText="Cerrar sesión" onCancel={() => setLogout(false)} onOk={() => store.logout()} />}
    </>
  );
}
