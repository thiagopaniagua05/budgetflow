import { useEffect, useMemo, useState } from 'react';
import { periods, inPeriod } from './month.js';
import { fetchRates } from './rates.js';
import { Icon, Sheet, parseNum, toDateInput } from './components.jsx';
import { authErrorText } from './store/firebase.js';
import Home from './screens/Home.jsx';
import Expenses from './screens/Expenses.jsx';
import Settings from './screens/Settings.jsx';
import Add from './screens/Add.jsx';

const COLS = ['incomes', 'expenses', 'fixed'];
const EMPTY = { loaded: {} };

export default function App({ store }) {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState(EMPTY);
  const [tab, setTab] = useState('home');
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [sel, setSel] = useState(null); // id del mes elegido (null = el actual)
  const [rates, setRates] = useState(null);
  useEffect(() => { fetchRates().then(setRates); }, []);

  // Al cambiar de usuario se limpia todo: nunca se ven datos de otra cuenta.
  useEffect(() => store.onAuth((u) => { setUser(u); setData(EMPTY); setSel(null); setTab('home'); setSheet(null); }), [store]);
  useEffect(() => {
    if (!user) return;
    const unsubs = COLS.map((c) => store.subscribe(c, (rows) => setData((d) => ({ ...d, [c]: rows, loaded: { ...d.loaded, [c]: true } }))));
    unsubs.push(store.subscribeDoc('meta', 'profile', (p) => setData((d) => ({ ...d, profile: p, loaded: { ...d.loaded, profile: true } }))));
    return () => unsubs.forEach((u) => u && u());
  }, [user, store]);

  const ps = useMemo(() => periods(data), [data]);
  const toast = (m) => { setToastMsg(m); clearTimeout(toast.t); toast.t = setTimeout(() => setToastMsg(null), 3200); };

  if (user === undefined) return <div className="splash"><div className="spinner" /></div>;
  if (!user) return <Login store={store} />;
  const ready = COLS.every((c) => data.loaded[c]) && data.loaded.profile;
  if (!ready) return <div className="splash"><div className="spinner" /></div>;
  if (!data.profile) return <Welcome store={store} />;

  const now = Date.now();
  const current = [...ps].reverse().find((p) => inPeriod(p, now)) || ps[ps.length - 1];
  const idx = Math.max(0, ps.findIndex((p) => p.id === (sel || current.id)));
  const period = ps[idx];
  const go = (t) => { setTab(t); window.scrollTo(0, 0); };
  const ctx = {
    store, data, user, toast, go, period, rates,
    refreshRates: () => fetchRates(true).then((r) => { setRates(r); toast(r ? '💵 Dólar actualizado' : 'No se pudo actualizar el dólar'); }),
    isCurrent: period.id === current.id,
    prev: idx > 0 ? () => setSel(ps[idx - 1].id) : null,
    next: idx < ps.length - 1 ? () => setSel(ps[idx + 1].id) : null,
    openAdd: (opts = {}) => setSheet({ type: 'add', ...opts }),
  };

  return (
    <div className="app">
      {tab === 'home' && <Home ctx={ctx} />}
      {tab === 'moves' && <Expenses ctx={ctx} />}
      {tab === 'settings' && <Settings ctx={ctx} />}

      {tab !== 'settings' && <button className="fab" onClick={() => ctx.openAdd()} aria-label="Anotar"><Icon.plus /></button>}
      <nav className="nav">
        <button className={'tab' + (tab === 'home' ? ' on' : '')} onClick={() => go('home')}><Icon.home />Inicio</button>
        <button className={'tab' + (tab === 'moves' ? ' on' : '')} onClick={() => go('moves')}><Icon.list />Gastos</button>
        <button className={'tab' + (tab === 'settings' ? ' on' : '')} onClick={() => go('settings')}><Icon.gear />Ajustes</button>
      </nav>

      {sheet?.type === 'add' && (
        <Sheet title={sheet.editing ? 'Editar' : sheet.fixed ? `Pagar ${sheet.fixed.name}` : 'Anotar'} onClose={() => setSheet(null)}>
          <Add ctx={ctx} editing={sheet.editing} fixed={sheet.fixed} kind={sheet.kind} onDone={() => { setSheet(null); setSel(null); }} />
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
      <p>Cuánto gastaste y cuánto te queda</p>
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
  const [date, setDate] = useState(toDateInput(Date.now()));
  const start = async () => {
    const now = Date.now();
    if (parseNum(salary) > 0) {
      const d = new Date(date + 'T12:00').getTime();
      await store.set('incomes', store.newId('incomes'), { kind: 'salary', amount: parseNum(salary), date: d, note: '', createdAt: now });
    }
    await store.set('meta', 'profile', { name: name.trim(), createdAt: now });
  };
  return (
    <div className="login">
      <div className="logo-big">👋</div>
      <h1>¡Bienvenido!</h1>
      <p>Anotá tu último sueldo y arrancamos.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <input className="input" placeholder="Tu nombre" aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" inputMode="decimal" placeholder="Último sueldo cobrado (opcional)" aria-label="Sueldo" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d.,]/g, ''))} />
        {parseNum(salary) > 0 && <>
          <label className="label" style={{ marginBottom: -4 }}>¿Qué día lo cobraste?</label>
          <input className="input" type="date" aria-label="Fecha del sueldo" value={date} onChange={(e) => setDate(e.target.value)} />
        </>}
        <button className="btn primary block" disabled={!name.trim()} onClick={start}>Empezar</button>
      </div>
    </div>
  );
}
