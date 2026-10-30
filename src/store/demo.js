// Modo demo: datos de ejemplo guardados solo en este navegador.
const KEY = 'budgetflow-demo-v4';
let mem = null;
const read = () => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : mem; } catch { return mem; } };
const write = (db) => { mem = db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sin storage */ } };
const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

function demoData() {
  const now = Date.now();
  const DAY = 864e5;
  const ago = (d, h = 13) => { const t = new Date(now - d * DAY); t.setHours(h, 0, 0, 0); return Math.min(t.getTime(), now); };
  const E = (id, d, amount, category, note = '', extra = {}) => ({ id, date: ago(d), amount, category, note, createdAt: ago(d), ...extra });
  return {
    meta: { profile: { name: 'Alex' } },
    incomes: byId([
      { id: 's1', kind: 'salary', amount: 920000, date: ago(42, 10), note: '', createdAt: ago(42) },
      { id: 's2', kind: 'salary', amount: 950000, date: ago(12, 10), note: '', createdAt: ago(12) },
      { id: 'x1', kind: 'extra', amount: 60000, date: ago(5), note: 'Venta de la bici', createdAt: ago(5) },
    ]),
    fixed: byId([
      { id: 'alq', name: 'Alquiler', icon: '🏠', amount: 320000, createdAt: 1 },
      { id: 'luz', name: 'Luz', icon: '💡', amount: 22000, createdAt: 2 },
      { id: 'int', name: 'Internet', icon: '🌐', amount: 28000, createdAt: 3 },
      { id: 'gym', name: 'Gimnasio', icon: '🏋️', amount: 35000, createdAt: 4 },
      { id: 'nfx', name: 'Netflix', icon: '🎬', amount: 10, currency: 'USD', createdAt: 5 },
    ]),
    expenses: byId([
      E('f1', 11, 320000, 'Pagos fijos', 'Alquiler', { fixedId: 'alq' }), E('f2', 9, 21500, 'Pagos fijos', 'Luz', { fixedId: 'luz' }),
      E('e1', 0, 23500, 'Súper', 'Coto'), E('e2', 1, 8500, 'Comida', 'Almuerzo'), E('e3', 2, 18000, 'Salidas', 'Cerveza con amigos'),
      E('e4', 3, 4200, 'Transporte', 'SUBE'), E('e5', 4, 31000, 'Súper', 'Carrefour'), E('e6', 6, 15000, 'Salidas', 'Cine'),
      E('e7', 8, 42000, 'Ropa', 'Remera'), E('e8', 10, 9800, 'Salud', 'Farmacia'), E('u1', 7, 12, 'Varios', 'App Store', { currency: 'USD', rate: 1480, rateType: 'tarjeta' }),
      E('o1', 40, 320000, 'Pagos fijos', 'Alquiler', { fixedId: 'alq' }), E('o2', 30, 61000, 'Súper'), E('o3', 25, 35000, 'Salidas', 'Cumple'),
      E('o4', 20, 22000, 'Comida', 'Pedidos'), E('o5', 15, 54000, 'Hogar', 'Sábanas'),
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
