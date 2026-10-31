import { money, history, MONTHS } from '../month.js';
import { catInfo } from '../components.jsx';

const short = (label) => label.slice(0, 3);

/** Pestaña "Meses": cuánto cobraste, gastaste y te sobró cada mes. */
export default function History({ ctx, ps }) {
  const { data, rates } = ctx;
  const list = history(data, ps, rates);
  if (!list.length) return <div className="card empty">Cuando anotes tu sueldo vas a ver acá el resumen de cada mes.</div>;
  const last = list.slice(0, 6).reverse();
  const max = Math.max(1, ...last.map((m) => Math.max(m.income, m.spent)));
  const now = Date.now();

  return (
    <>
      <section className="card">
        <div className="card-t">Gastado vs. cobrado</div>
        <div className="bars">
          {last.map((m) => (
            <button key={m.p.id} className="bar-col" onClick={() => ctx.selectMonth(m.p.id)}>
              <div className="bar-val">{m.spent >= 1e6 ? `${(m.spent / 1e6).toFixed(1).replace('.', ',')}M` : `${Math.round(m.spent / 1e3)}k`}</div>
              <div className="bar-pair">
                <div className="bar in" style={{ height: `${(m.income / max) * 100}%` }} />
                <div className={'bar out' + (m.spent > m.income ? ' over' : '')} style={{ height: `${(m.spent / max) * 100}%` }} />
              </div>
              <div className={'bar-lbl' + (m.p.end === Infinity ? ' on' : '')}>{short(m.p.label)}</div>
            </button>
          ))}
        </div>
        <div className="legend-row"><span><i className="dot in" /> Cobrado</span><span><i className="dot out" /> Gastado</span></div>
      </section>

      {list.map((m) => {
        const current = m.p.end === Infinity;
        const pct = m.income > 0 ? Math.min(100, Math.round((m.spent / m.income) * 100)) : 0;
        return (
          <section key={m.p.id} className="card month-card">
            <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => ctx.selectMonth(m.p.id)}>
              <div className="grow">
                <div style={{ fontWeight: 900, fontSize: 18 }}>{m.p.label}{current && <span className="pill g" style={{ marginLeft: 8, verticalAlign: 3 }}>En curso</span>}</div>
                <div className="s muted" style={{ fontSize: 12.5 }}>Cobraste {money(m.income)} · Gastaste {money(m.spent)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="s muted" style={{ fontSize: 11.5, fontWeight: 700 }}>{m.left >= 0 ? (current ? 'TE QUEDA' : 'SOBRÓ') : 'TE PASASTE'}</div>
                <div className={'money ' + (m.left >= 0 ? 'pos' : 'neg')} style={{ fontWeight: 900, fontSize: 18 }}>{money(Math.abs(m.left))}</div>
              </div>
            </button>
            <div className="meter sm"><div style={{ width: `${pct}%` }} className={pct >= 90 ? 'hot' : ''} /></div>
            {m.cats.length > 0 && (
              <div className="chips" style={{ marginTop: 10 }}>
                {m.cats.slice(0, 3).map((c) => <span key={c.name} className="chip">{catInfo(c.name).icon} {c.name} {Math.round((c.value / m.spent) * 100)}%</span>)}
              </div>
            )}
            {m.saved > 0 && <div className="hint">🐷 Guardaste {money(m.saved)} en ahorros</div>}
            {!current && m.left > 0 && (
              <button className="btn block small" style={{ marginTop: 10 }}
                onClick={() => ctx.openSave({ amount: Math.round(m.left), date: Math.min(m.p.end - 60000, now) })}>
                🐷 Guardar los {money(m.left)} que sobraron
              </button>
            )}
          </section>
        );
      })}
    </>
  );
}
