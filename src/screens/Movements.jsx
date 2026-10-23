import { useState } from 'react';
import * as F from '../finance.js';
import { CATEGORIES, catInfo, fmtDate } from '../components.jsx';
import { PeriodHeader } from './Home.jsx';

export default function Movements({ ctx }) {
  const { data, k, now, rates } = ctx;
  const pd = F.computePeriod(data, k, now, rates);
  const cards = data.cards || [];
  const [cat, setCat] = useState('all');
  const [method, setMethod] = useState('all');
  const methodName = (m) => (m === 'cash' ? '💵 Efectivo' : m === 'debit' ? '🏦 Débito' : `💳 ${cards.find((c) => c.id === m)?.name || 'Tarjeta'}`);

  const extras = (data.incomes || []).filter((i) => i.oneOff && i.period === k).map((i) => ({ ...i, isIncome: true, date: i.date || pd.start }));
  const rows = [...pd.spentIn, ...extras]
    .filter((x) => x.isIncome ? cat === 'all' && method === 'all' : (cat === 'all' || x.category === cat) && (method === 'all' || x.method === method))
    .sort((a, b) => b.date - a.date);
  const total = rows.filter((x) => !x.isIncome).reduce((a, x) => a + F.toARS(x.amount, x.currency, rates, cards.some((c) => c.id === x.method)), 0);
  const groups = [];
  for (const r of rows) {
    const key = new Date(r.date).toDateString();
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, date: r.date, items: [] });
    groups[groups.length - 1].items.push(r);
  }
  const usedCats = CATEGORIES.filter((c) => pd.spentIn.some((e) => e.category === c.name));
  const usedMethods = [...new Set(pd.spentIn.map((e) => e.method))];

  return (
    <>
      <PeriodHeader ctx={ctx} title="Movimientos" />
      <section className="card">
        <div className="row">
          <div className="grow"><div className="card-t">Gastaste {cat !== 'all' ? `en ${cat}` : 'en total'}</div><div style={{ fontSize: 28, fontWeight: 900 }} className="money">{F.money(total)}</div></div>
          <div style={{ textAlign: 'right' }}><div className="card-t">Movimientos</div><div style={{ fontSize: 22, fontWeight: 900 }}>{rows.length}</div></div>
        </div>
        <div className="hint">Por fecha de compra. Lo pagado con tarjeta se descuenta del dinero libre cuando vence el resumen.</div>
      </section>

      <div className="chips scroll" style={{ marginTop: 12 }}>
        <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>Todas</button>
        {usedCats.map((c) => <button key={c.name} className={'chip' + (cat === c.name ? ' on' : '')} onClick={() => setCat(c.name)}>{c.icon} {c.name}</button>)}
      </div>
      {usedMethods.length > 1 && (
        <div className="chips scroll" style={{ marginTop: 8 }}>
          <button className={'chip g' + (method === 'all' ? ' on' : '')} onClick={() => setMethod('all')}>Todos los medios</button>
          {usedMethods.map((m) => <button key={m} className={'chip g' + (method === m ? ' on' : '')} onClick={() => setMethod(m)}>{methodName(m)}</button>)}
        </div>
      )}

      {groups.length === 0 && <div className="card empty">No hay movimientos {cat !== 'all' || method !== 'all' ? 'con ese filtro' : 'en este período'}. Tocá el + para cargar uno.</div>}
      {groups.map((g) => {
        const dayTotal = g.items.filter((x) => !x.isIncome).reduce((a, x) => a + F.toARS(x.amount, x.currency, rates, cards.some((c) => c.id === x.method)), 0);
        return (
          <div key={g.key}>
            <div className="day-h"><span>{F.daysUntil(g.date, now) === 0 ? 'Hoy' : F.daysUntil(g.date, now) === -1 ? 'Ayer' : fmtDate(g.date, { weekday: 'long' })}</span><span className="money">{dayTotal ? F.money(-dayTotal) : ''}</span></div>
            <div className="card" style={{ marginTop: 6, padding: '4px 14px' }}>
              {g.items.map((x) => {
                const onCard = cards.some((c) => c.id === x.method);
                const ars = F.toARS(x.amount, x.currency, rates, onCard);
                const ci = x.isIncome ? { icon: '💰' } : catInfo(x.category);
                return (
                  <button key={x.id} className="item" onClick={() => ctx.openQuickAdd(x)}>
                    <div className="ic">{ci.icon}</div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="t ellipsis">{x.isIncome ? x.name : x.note || x.category}</div>
                      <div className="s ellipsis">{x.isIncome ? 'Ingreso extra' : `${x.category} · ${methodName(x.method)}`}</div>
                    </div>
                    <div className={'amt money ' + (x.isIncome ? 'pos' : '')}>
                      {x.isIncome ? '+' : '−'}{F.money(ars)}
                      {x.currency === 'USD' && <small>{F.usd(x.amount)}</small>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
