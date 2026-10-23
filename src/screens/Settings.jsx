import { useState } from 'react';
import * as F from '../finance.js';
import { CATEGORIES, Seg, Confirm, parseNum, downloadFile, Icon } from '../components.jsx';

export default function Settings({ ctx, autoRates, refreshRates }) {
  const { data, store, user, rates, k } = ctx;
  const p = data.profile || {};
  const [name, setName] = useState(p.name || '');
  const [paydayMode, setPaydayMode] = useState(p.payday && p.payday !== 'last' ? 'day' : 'last');
  const [payday, setPayday] = useState(p.payday && p.payday !== 'last' ? String(p.payday) : '1');
  const [goal, setGoal] = useState(p.savingsGoal ? String(p.savingsGoal) : '');
  const [budgets, setBudgets] = useState(() => Object.fromEntries(CATEGORIES.map((c) => [c.name, p.budgets?.[c.name] ? String(p.budgets[c.name]) : ''])));
  const [manual, setManual] = useState(!!p.rates?.manual);
  const [tarjeta, setTarjeta] = useState(String(p.rates?.tarjeta || autoRates?.tarjeta || ''));
  const [mep, setMep] = useState(String(p.rates?.mep || autoRates?.mep || ''));
  const [logout, setLogout] = useState(false);

  const save = async () => {
    await store.set('meta', 'profile', {
      ...p, name: name.trim() || p.name, payday: paydayMode === 'last' ? 'last' : Math.min(31, Math.max(1, parseInt(payday, 10) || 1)),
      savingsGoal: parseNum(goal),
      budgets: Object.fromEntries(Object.entries(budgets).map(([c, v]) => [c, parseNum(v)]).filter(([, v]) => v > 0)),
      rates: { manual, tarjeta: parseNum(tarjeta), mep: parseNum(mep) },
    });
    ctx.toast('✅ Ajustes guardados');
  };

  return (
    <>
      <div className="row"><button className="icon-btn" onClick={() => ctx.go('home')} aria-label="Volver"><Icon.back /></button><div className="page-title">Ajustes</div></div>

      <section className="card">
        <div className="card-t">👤 Cuenta</div>
        <div className="field"><label className="label">Tu nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="hint">{user?.email} · tus datos son privados, nadie más los ve.</div>
      </section>

      <section className="card">
        <div className="card-t">📅 Día de cobro</div>
        <div className="field"><Seg value={paydayMode} onChange={setPaydayMode} options={[['last', 'Último día del mes'], ['day', 'Un día fijo']]} /></div>
        {paydayMode === 'day' && <div className="field"><label className="label">Día</label><input className="input" inputMode="numeric" value={payday} onChange={(e) => setPayday(e.target.value)} /></div>}
        <div className="hint">Cada "mes" de la app va de cobro a cobro.</div>
      </section>

      <section className="card">
        <div className="card-t">🐷 Meta de ahorro mensual</div>
        <div className="field"><input className="input" inputMode="decimal" placeholder="Ej: 100000" value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
        <div className="hint">Se descuenta del dinero libre apenas cobrás: primero ahorrás, después gastás.</div>
      </section>

      <section className="card">
        <div className="card-t">📊 Presupuesto por categoría</div>
        <div className="hint">Dejá vacío lo que no quieras controlar.</div>
        {CATEGORIES.map((c) => (
          <div key={c.name} className="row" style={{ marginTop: 10 }}>
            <span className="grow">{c.icon} {c.name}</span>
            <input className="input" style={{ width: 150 }} inputMode="decimal" placeholder="Sin límite" value={budgets[c.name]}
              onChange={(e) => setBudgets({ ...budgets, [c.name]: e.target.value })} />
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-t">💵 Dólar</div>
        <div className="hint">
          Automático (dolarapi.com): tarjeta {autoRates?.tarjeta ? F.money(autoRates.tarjeta) : '—'} · MEP {autoRates?.mep ? F.money(autoRates.mep) : '—'}
          {autoRates?.at ? ` · actualizado ${new Date(autoRates.at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
          {' '}<button className="link" onClick={refreshRates}>Actualizar</button>
        </div>
        <div className="row field"><div className="grow"><b>Usar cotización manual</b></div><button type="button" className={'switch' + (manual ? ' on' : '')} onClick={() => setManual(!manual)} aria-label="Manual" /></div>
        {manual && (
          <div className="grid2">
            <div className="field"><label className="label">Dólar tarjeta</label><input className="input" inputMode="decimal" value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} /></div>
            <div className="field"><label className="label">Dólar MEP</label><input className="input" inputMode="decimal" value={mep} onChange={(e) => setMep(e.target.value)} /></div>
          </div>
        )}
        <div className="hint">Compras con tarjeta en USD → dólar tarjeta. Ingresos y gastos en USD sin tarjeta → MEP. En uso ahora: tarjeta {F.money(rates.tarjeta)} · MEP {F.money(rates.mep)}.</div>
      </section>

      <button className="btn primary block" style={{ marginTop: 16 }} onClick={save}>Guardar ajustes</button>

      <section className="card">
        <div className="card-t">🔔 Recordatorios en tu calendario</div>
        <p className="hint">Descargá tus vencimientos (servicios, resúmenes y cuotas) y abrilos con el calendario del celular. Te avisa 3 días antes y el mismo día, aunque la app esté cerrada.</p>
        <button className="btn block" onClick={() => downloadFile('budgetflow-vencimientos.ics', F.icsForDues(F.calendarItems(data, k, rates)))}>📅 Agregar vencimientos al calendario</button>
        <div className="hint">Si después agregás servicios o cuotas nuevas, volvé a descargarlo.</div>
      </section>

      <div className="row" style={{ marginTop: 16 }}>
        {store.mode === 'demo' && <button className="btn grow" onClick={() => store.reset()}>Reiniciar demo</button>}
        <button className="btn danger grow" onClick={() => setLogout(true)}>Cerrar sesión</button>
      </div>
      {logout && <Confirm text="Vas a tener que volver a entrar con tu email y contraseña." okText="Cerrar sesión" onCancel={() => setLogout(false)} onOk={() => store.logout()} />}
    </>
  );
}
