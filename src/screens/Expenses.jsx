import { useState } from 'react';
import { money, usd, ars, summary, dayStart } from '../month.js';
import { catInfo, fmtDate } from '../components.jsx';
import { MonthHeader, ExpenseRow } from './Home.jsx';

export default function Expenses({ ctx }) {
  const { data, period, rates } = ctx;
  const s = summary(data, period, rates);
  const [cat, setCat] = useState(null);
  const today = dayStart(Date.now());
  const incomes = [...(period.salary ? [period.salary] : []), ...s.extras];
  const rows = [...s.expenses.filter((e) => !cat || (e.category || 'Varios') === cat), ...(cat ? [] : incomes)].sort((a, b) => b.date - a.date);
  const groups = [];
  for (const r of rows) {
    const key = dayStart(r.date);
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, items: [] });
    groups[groups.length - 1].items.push(r);
  }
  const max = s.cats[0]?.value || 1;

  return (
    <>
      <MonthHeader ctx={ctx} title="Gastos" />
      <section className="card">
        <div className="card-t">Gastaste en total</div>
        <div style={{ fontSize: 30, fontWeight: 900 }} className="money">{money(s.spent)}</div>
        {s.spentUsd > 0 && <div className="hint" style={{ marginTop: 0 }}>Incluye {usd(s.spentUsd)} pagados en dólares</div>}
        {s.cats.length > 0 && <>
          <div className="card-t" style={{ marginTop: 16 }}>¿En qué?</div>
          {s.cats.map((c) => {
            const ci = catInfo(c.name);
            return (
              <button key={c.name} className={'catrow' + (cat === c.name ? ' on' : '')} onClick={() => setCat(cat === c.name ? null : c.name)}>
                <span>{ci.icon} {c.name}</span>
                <b className="money">{money(c.value)} <small>{Math.round((c.value / s.spent) * 100)}%</small></b>
                <div className="track"><div className="fill" style={{ width: `${(c.value / max) * 100}%`, background: ci.color }} /></div>
              </button>
            );
          })}
          <div className="hint">Tocá una categoría para ver solo esos gastos.</div>
        </>}
      </section>

      {cat && <div className="row" style={{ marginTop: 12 }}><span className="chip on">{catInfo(cat).icon} {cat}</span><button className="link" onClick={() => setCat(null)}>Ver todo</button></div>}
      {groups.length === 0 && <div className="card empty">No hay movimientos en este mes. Tocá el + para anotar uno.</div>}
      {groups.map((g) => {
        const dayTotal = g.items.filter((x) => !x.kind).reduce((a, x) => a + ars(x), 0);
        return (
          <div key={g.key}>
            <div className="day-h">
              <span>{g.key === today ? 'Hoy' : g.key === dayStart(today - 864e5 / 2) ? 'Ayer' : fmtDate(g.key, { weekday: 'long' })}</span>
              <span className="money">{dayTotal ? `−${money(dayTotal)}` : ''}</span>
            </div>
            <div className="card" style={{ marginTop: 6, padding: '4px 14px' }}>
              {g.items.map((x) => <ExpenseRow key={x.id} x={x} ctx={ctx} />)}
            </div>
          </div>
        );
      })}
    </>
  );
}
