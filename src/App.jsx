import { useEffect, useMemo, useState } from 'react';
import * as F from './finance.js';
import { fetchRates, effectiveRates } from './rates.js';
import { Icon, Sheet, parseNum } from './components.jsx';
import { authErrorText } from './store/firebase.js';
import Home from './screens/Home.jsx';
import QuickAdd from './screens/QuickAdd.jsx';
import Movements from './screens/Movements.jsx';
import Plans from './screens/Plans.jsx';
import Analysis from './screens/Analysis.jsx';
import Settings from './screens/Settings.jsx';

const COLS = ['incomes', 'receipts', 'fixed', 'installments', 'cards', 'expenses', 'payments', 'savings'];

export default function App({ store }) {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState({ loaded: {} });
  const [tab, setTab] = useState('home');
  const [plansTab, setPlansTab] = useState('fijos');
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [k, setK] = useState(null);
  const [autoRates, setAutoRates] = useState(null);

  useEffect(() => store.onAuth((u) => { setUser(u); setData({ loaded: {} }); setK(null); setTab('home'); setSheet(null); }), [store]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { fetchRates().then(setAutoRates); }, []);
  useEffect(() => {
    if (!user) return;
    const unsubs = COLS.map((c) => store.subscribe(c, (rows) => setData((d) => ({ ...d, [c]: rows, loaded: { ...d.loaded, [c]: true } }))));
    unsubs.push(store.subscribeDoc('meta', 'profile', (p) => setData((d) => ({ ...d, profile: p, loaded: { ...d.loaded, profile: true } }))));
    return () => unsubs.forEach((u) => u && u());
  }, [user, store]);

  const toast = (m) => { setToastMsg(m); clearTimeout(toast.t); toast.t = setTimeout(() => setToastMsg(null), 3200); };
  const rates = useMemo(() => effectiveRates(autoRates, data.profile), [autoRates, data.profile]);

  if (user === undefined) return <div className="splash"><div className="spinner" /></div>;
  if (!user) return <Login store={store} />;
  const ready = data.loaded.profile && data.loaded.expenses && data.loaded.incomes;
  if (!ready) return <div className="splash"><div className="spinner" /></div>;
  if (!data.profile) return <Welcome store={store} />;

  const payday = data.profile.payday || 'last';
  const period = k || F.periodOf(now, payday);
  const go = (t) => { setTab(t); window.scrollTo(0, 0); };
  const ctx = {
    store, data, rates, now, user, toast, go, k: period, setK,
    openQuickAdd: (editing) => setSheet({ type: 'add', editing }),
    openPlans: (t) => { setPlansTab(t); go('plans'); },
  };

  return (
    <div className="app">
      {tab === 'home' && <Home ctx={ctx} />}
      {tab === 'moves' && <Movements ctx={ctx} />}
      {tab === 'plans' && <Plans ctx={ctx} tab={plansTab} setTab={setPlansTab} />}
      {tab === 'analysis' && <Analysis ctx={ctx} />}
      {tab === 'settings' && <Settings ctx={ctx} autoRates={autoRates} refreshRates={() => fetchRates(true).then((r) => { setAutoRates(r); toast(r ? '💵 Dólar actualizado' : 'No se pudo actualizar el dólar'); })} />}

      {tab !== 'settings' && <button className="fab" onClick={() => setSheet({ type: 'add' })} aria-label="Registrar gasto"><Icon.plus /></button>}
      <nav className="nav">
        <button className={'tab' + (tab === 'home' ? ' on' : '')} onClick={() => go('home')}><Icon.home />Inicio</button>
        <button className={'tab' + (tab === 'moves' ? ' on' : '')} onClick={() => go('moves')}><Icon.list />Movimientos</button>
        <button className={'tab' + (tab === 'plans' ? ' on' : '')} onClick={() => go('plans')}><Icon.card />Fijos y cuotas</button>
        <button className={'tab' + (tab === 'analysis' ? ' on' : '')} onClick={() => go('analysis')}><Icon.chart />Análisis</button>
      </nav>

      {sheet?.type === 'add' && (
        <Sheet title={sheet.editing ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => setSheet(null)}>
          <QuickAdd ctx={ctx} editing={sheet.editing} onDone={() => setSheet(null)} />
        </Sheet>
      )}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

function Login({ store }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const demo = store.mode === 'demo';
  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!demo && (!email || !pass)) return setErr('Completá email y contraseña.');
    setBusy(true);
    try { await store.login(email, pass); } catch (ex) { setErr(authErrorText(ex)); setBusy(false); }
  }
  return (
    <form className="login" onSubmit={submit}>
      <div className="logo-big">💸</div>
      <h1>BudgetFlow</h1>
      <p>Sabé siempre cuánta plata libre tenés</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <input className="input" type="email" placeholder="Email" aria-label="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Contraseña" aria-label="Contraseña" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
        {err && <div className="error" style={{ marginTop: 0 }}>{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </div>
      {demo && <p style={{ fontSize: 12, marginTop: 14 }}><b style={{ color: 'var(--warn)' }}>Modo demo</b>: tocá Entrar, con datos de ejemplo.</p>}
    </form>
  );
}

function Welcome({ store }) {
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [goal, setGoal] = useState('');
  const start = async () => {
    const now = Date.now();
    const k = F.periodOf(now, 'last');
    if (parseNum(salary) > 0) await store.set('incomes', store.newId('incomes'), { name: 'Sueldo', icon: '💼', amount: parseNum(salary), currency: 'ARS', fromPeriod: k, createdAt: now });
    await store.set('meta', 'profile', { name: name.trim(), payday: 'last', savingsGoal: parseNum(goal), budgets: {}, createdAt: now });
  };
  return (
    <div className="login">
      <div className="logo-big">👋</div>
      <h1>¡Bienvenido!</h1>
      <p>Tres datos y arrancamos. Todo se puede cambiar después.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <input className="input" placeholder="Tu nombre" aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" inputMode="decimal" placeholder="Sueldo mensual aproximado" aria-label="Sueldo" value={salary} onChange={(e) => setSalary(e.target.value)} />
        <input className="input" inputMode="decimal" placeholder="Meta de ahorro por mes (opcional)" aria-label="Meta de ahorro" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <div className="hint" style={{ textAlign: 'center' }}>Cobrás el último día de cada mes (se cambia en Ajustes).</div>
        <button className="btn primary block" disabled={!name.trim()} onClick={start}>Empezar</button>
      </div>
    </div>
  );
}
