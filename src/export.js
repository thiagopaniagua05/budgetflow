// Copia de seguridad: baja todos tus movimientos en un archivo que abre Excel (CSV con ; y coma decimal).
import { periods, inPeriod, ars } from './month.js';

const n = (v) => (Math.round((+v || 0) * 100) / 100).toString().replace('.', ',');
const cell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const day = (ts) => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

export function exportCSV(data) {
  const ps = periods(data);
  const monthOf = (ts) => ([...ps].reverse().find((p) => inPeriod(p, ts)) || {}).label || '';
  const rows = [];
  for (const e of data.expenses || []) rows.push([e.date, 'Gasto', e.category, e.note, e]);
  for (const i of data.incomes || []) rows.push([i.date, i.kind === 'salary' ? 'Sueldo' : 'Ingreso extra', '', i.note, i]);
  for (const s of data.savings || []) rows.push([s.date, s.kind === 'out' ? 'Saqué de ahorros' : 'Guardé en ahorros', '', s.note, s]);
  rows.sort((a, b) => b[0] - a[0]);
  const head = ['Fecha', 'Mes', 'Tipo', 'Categoría', 'Detalle', 'Moneda', 'Monto', 'Cotización', 'Monto en pesos'];
  const lines = [head, ...rows.map(([ts, tipo, cat, note, x]) => [
    day(ts), monthOf(ts), tipo, cat, note, x.currency || 'ARS', n(x.amount), x.currency === 'USD' ? n(x.rate) : '', n(ars(x)),
  ])].map((r) => r.map(cell).join(';'));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `budgetflow-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return rows.length;
}
