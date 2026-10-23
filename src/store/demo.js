// Modo demo: datos de ejemplo guardados solo en este navegador.
import { periodOf, addMonths } from '../finance.js';

const KEY = 'budgetflow-demo-v2';
let mem = null;
const read = () => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : mem; } catch { return mem; } };
const write = (db) => { mem = db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sin storage */ } };
const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

function demoData() {
  const now = Date.now();
  const K = periodOf(now, 'last');
  const DAY = 864e5;
  const ago = (d, h = 13) => { const t = new Date(now - d * DAY); t.setHours(h, 0, 0, 0); return t.getTime(); };
  const cards = [
    { id: 'visa', name: 'Visa Galicia', closeDay: 28, dueDay: 5, color: 'violet' },
    { id: 'master', name: 'Master BBVA', closeDay: 24, dueDay: 3, color: 'red' },
  ];
  const dayIn = (n) => new Date(now + n * DAY).getDate();
  const since = ago(100);
  const E = (id, d, amount, category, method, note = '', currency = 'ARS') => ({ id, date: ago(d), amount, currency, category, method, note, createdAt: ago(d) });
  const expenses = [
    E('e1', 1, 23500, 'Súper', 'debit', 'Coto'), E('e2', 1, 8500, 'Comida', 'cash', 'Almuerzo'),
    E('e3', 2, 18000, 'Salidas', 'visa', 'Cerveza con amigos'), E('e4', 3, 4200, 'Transporte', 'debit', 'SUBE'),
    E('e5', 4, 31000, 'Súper', 'visa', 'Carrefour'), E('e6', 5, 12, 'Varios', 'visa', 'App store', 'USD'),
    E('e7', 6, 15000, 'Salidas', 'cash', 'Cine'), E('e8', 8, 42000, 'Ropa', 'master', 'Remera'),
    E('e9', 10, 27000, 'Súper', 'debit', 'Día'), E('e10', 12, 9800, 'Salud', 'cash', 'Farmacia'),
    E('e11', 15, 35000, 'Salidas', 'visa', 'Cumple'), E('e12', 18, 22000, 'Comida', 'debit', 'Pedidos Ya'),
    E('e13', 22, 54000, 'Hogar', 'master', 'Sábanas'), E('e14', 26, 19000, 'Súper', 'debit'),
    E('e15', 35, 61000, 'Súper', 'visa'), E('e16', 40, 25000, 'Salidas', 'visa'),
  ];
  return {
    meta: { profile: { name: 'Alex', payday: 'last', savingsGoal: 100000,
      budgets: { 'Súper': 150000, Comida: 50000, Salidas: 40000, Transporte: 30000, Varios: 30000 } } },
    cards: byId(cards),
    incomes: byId([
      { id: 'sueldo', name: 'Sueldo', amount: 950000, currency: 'ARS', icon: '💼', createdAt: since },
      { id: 'free', name: 'Freelance', amount: 200, currency: 'USD', icon: '💻', createdAt: since },
    ]),
    receipts: byId([{ id: `sueldo_${K}`, incomeId: 'sueldo', period: K, amount: 950000 }]),
    fixed: byId([
      { id: 'alq', name: 'Alquiler', icon: '🏠', amount: 320000, currency: 'ARS', dueDay: dayIn(2), method: 'cash', category: 'Vivienda', createdAt: since },
      { id: 'exp', name: 'Expensas', icon: '🏢', amount: 65000, currency: 'ARS', dueDay: dayIn(2), method: 'cash', category: 'Vivienda', createdAt: since },
      { id: 'int', name: 'Internet', icon: '🌐', amount: 28000, currency: 'ARS', dueDay: dayIn(5), method: 'debit', category: 'Servicios', createdAt: since },
      { id: 'luz', name: 'Luz', icon: '💡', amount: 22000, currency: 'ARS', dueDay: dayIn(-4), method: 'debit', category: 'Servicios', createdAt: since },
      { id: 'nfx', name: 'Netflix', icon: '🎬', amount: 10, currency: 'USD', dueDay: 12, method: 'visa', category: 'Suscripciones', createdAt: since },
      { id: 'spt', name: 'Spotify', icon: '🎵', amount: 4500, currency: 'ARS', dueDay: 20, method: 'visa', category: 'Suscripciones', createdAt: since },
    ]),
    installments: byId([
      { id: 'nike', name: 'Zapatillas Nike', icon: '👟', amountPer: 25000, total: 6, startPeriod: addMonths(K, -2), method: 'visa', currency: 'ARS' },
      { id: 'cel', name: 'Celular Samsung', icon: '📱', amountPer: 45000, total: 12, startPeriod: addMonths(K, -3), method: 'master', currency: 'ARS' },
      { id: 'hel', name: 'Heladera', icon: '🧊', amountPer: 80000, total: 3, startPeriod: K, method: 'cash', dueDay: dayIn(-3), currency: 'ARS' },
      { id: 'tv', name: 'Smart TV', icon: '📺', amountPer: 30000, total: 6, startPeriod: addMonths(K, -6), method: 'visa', currency: 'ARS' },
    ]),
    expenses: byId(expenses),
    payments: byId(['card_visa', 'card_master', 'fixed_luz', 'inst_hel'].map((x) => ({ id: `${x}_${K}`, at: now }))),
    savings: byId([
      { id: 's1', period: addMonths(K, -3), amount: 100000 }, { id: 's2', period: addMonths(K, -2), amount: 120000 },
      { id: 's3', period: addMonths(K, -1), amount: 100000 }, { id: 's4', period: K, amount: 100000 },
    ]),
  };
}

export function createDemoStore() {
  let db = read() || demoData();
  write(db);
  const subs = new Set();
  let authCb = null;
  let user = null;
  try { user = JSON.parse(localStorage.getItem(KEY + '-user')); } catch { /* */ }
  const emit = () => subs.forEach((f) => f());
  const commit = () => { write(db); setTimeout(emit, 0); };
  const list = (col) => Object.entries(db[col] || {}).map(([id, d]) => ({ ...d, id }));
  const setUser = (u) => { user = u; try { u ? localStorage.setItem(KEY + '-user', JSON.stringify(u)) : localStorage.removeItem(KEY + '-user'); } catch { /* */ } authCb && authCb(u); };
  return {
    mode: 'demo',
    onAuth(cb) { authCb = cb; setTimeout(() => cb(user), 0); return () => { authCb = null; }; },
    async login(email) { setUser({ uid: 'demo', email: email || 'demo@budgetflow' }); },
    async logout() { setUser(null); },
    subscribe(col, cb) { const f = () => cb(list(col)); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    subscribeDoc(col, id, cb) { const f = () => cb(db[col]?.[id] ? { ...db[col][id], id } : null); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    newId() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    async set(col, id, data) { db[col] = db[col] || {}; db[col][id] = data; commit(); },
    async update(col, id, data) { db[col][id] = { ...db[col][id], ...data }; commit(); },
    async remove(col, id) { if (db[col]) delete db[col][id]; commit(); },
    async get(col, id) { return db[col]?.[id] ? { ...db[col][id], id } : null; },
    reset() { db = demoData(); commit(); },
  };
}
