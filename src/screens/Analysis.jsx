import * as F from '../finance.js';
import { Bars, catInfo, short } from '../components.jsx';
import { PeriodHeader } from './Home.jsx';

export default function Analysis({ ctx }) {
  const { data, k, now, rates } = ctx;
  const hist = F.history(data, k, 6, now, rates);
  const cur = hist[hist.length - 1], prev = hist[hist.length - 2];
  const totalOf = (h) => h.fixed + h.inst + h.variable;
  const series = hist.map((h) => ({
    label: F.MONTHS[F.parseKey(h.k).m].slice(0, 3), on: h.k === k,
    parts: [{ value: h.fixed, color: '#f87171' }, { value: h.inst, color: '#8b5cf6' }, { value: h.variable, color: '#fb923c' }],
  }));
  const cats = [...new Set([...Object.keys(cur.byCat), ...Object.keys(prev.byCat)])]
    .map((c) => ({ c, v: cur.byCat[c] || 0, p: prev.byCat[c] || 0 })).sort((a, b) => b.v - a.v);
  const totalSaved = (data.savings || []).reduce((a, s) => a + s.amount, 0);
  const savedMonths = hist.filter((h) => h.saved > 0).length;
  const avgSpend = hist.slice(0, -1).filter((h) => totalOf(h) > 0);
  const avg = avgSpend.length ? avgSpend.reduce((a, h) => a + totalOf(h), 0) / avgSpend.length : 0;
  const diff = prev && totalOf(prev) ? (totalOf(cur) / totalOf(prev) - 1) * 100 : null;

  return (
    <>
      <PeriodHeader ctx={ctx} title="Análisis" />
      <section className="card">
        <div className="card-h"><div className="card-t">📈 Últimos 6 meses</div></div>
        <Bars series={series} fmt={short} />
        <div className="row" style={{ gap: 14, justifyContent: 'center', fontSize: 12, marginTop: 10 }}>
          <span><span style={{ color: '#f87171' }}>■</span> Fijos</span><span><span style={{ color: '#8b5cf6' }}>■</span> Cuotas</span><span><span style={{ color: '#fb923c' }}>■</span> Variables</span>
        </div>
      </section>

      <div className="grid2" style={{ marginTop: 2 }}>
        <section className="card">
          <div className="card-t">Gastado en {F.periodLabel(k)}</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }} className="money">{F.money(totalOf(cur))}</div>
          {diff != null && <div className="hint" style={{ color: diff > 0 ? 'var(--red)' : 'var(--em2)', fontWeight: 700 }}>{diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}% vs {F.periodLabel(prev.k)}</div>}
        </section>
        <section className="card">
          <div className="card-t">Promedio mensual</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }} className="money">{F.money(avg)}</div>
          <div className="hint">últimos {avgSpend.length} meses</div>
        </section>
      </div>

      <section className="card">
        <div className="card-h"><div className="card-t">🏷️ Por categoría</div><span className="pill">vs {F.periodLabel(prev.k)}</span></div>
        {!cats.length && <div className="empty">Sin gastos variables en este período.</div>}
        {cats.map(({ c, v, p }) => {
          const d = p ? Math.round((v / p - 1) * 100) : null;
          return (
            <div key={c} className="item">
              <div className="ic">{catInfo(c).icon}</div>
              <div className="grow"><div className="t">{c}</div><div className="s">{F.periodLabel(prev.k)}: {F.money(p)}</div></div>
              <div className="amt money">{F.money(v)}{d != null && <small style={{ color: d > 0 ? 'var(--red)' : 'var(--em2)' }}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}%</small>}</div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <div className="card-h"><div className="card-t">🐷 Ahorro</div><span className="pill g">{savedMonths} de 6 meses</span></div>
        <div style={{ fontSize: 26, fontWeight: 900 }} className="money pos">{F.money(totalSaved)}</div>
        <div className="hint">Total que marcaste como apartado desde que usás BudgetFlow.</div>
        <div className="stackbar" style={{ height: 34, gap: 4, background: 'none' }}>
          {hist.map((h) => <div key={h.k} title={F.periodLabel(h.k)} style={{ flex: 1, borderRadius: 8, background: h.saved > 0 ? 'linear-gradient(180deg,#34d399,#10b981)' : '#1f2440' }} />)}
        </div>
      </section>

      <section className="card">
        <div className="card-h"><div className="card-t">💰 Ingresos vs gastos</div></div>
        {hist.slice().reverse().map((h) => {
          const left = h.income - totalOf(h);
          return (
            <div key={h.k} className="item">
              <div className="grow"><div className="t">{F.periodLabel(h.k)}</div><div className="s">Ingresos {F.money(h.income)} · Gastos {F.money(totalOf(h))}</div></div>
              <div className={'amt money ' + (left >= 0 ? 'pos' : 'neg')}>{left >= 0 ? '+' : ''}{F.money(left)}</div>
            </div>
          );
        })}
      </section>
    </>
  );
}
