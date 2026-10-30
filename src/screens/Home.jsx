import { money, usd, ars, summary } from '../month.js';
import { Icon, catInfo, fmtDate } from '../components.jsx';

/** Encabezado con el mes y flechas para ir a meses anteriores. */
export function MonthHeader({ ctx, title }) {
  const { period, prev, next, isCurrent, store } = ctx;
  return (
    <header className="top">
      <div className="grow">
        <div className="row" style={{ gap: 8 }}><div className="brand">{title}</div>{store.mode === 'demo' && <span className="demo">DEMO</span>}</div>
        <div className="period-nav">
          <button className="icon-btn" onClick={prev} disabled={!prev} aria-label="Mes anterior"><Icon.back /></button>
          <div className="t">{period.label}</div>
          <button className="icon-btn" onClick={next} disabled={!next} aria-label="Mes siguiente"><Icon.next /></button>
        </div>
        {period.salary && <div className="period-sub">Desde que cobraste el {fmtDate(period.salary.date)}{!isCurrent && Number.isFinite(period.end) ? ` hasta el ${fmtDate(period.end - 1)}` : ''}</div>}
      </div>
    </header>
  );
}

export function ExpenseRow({ x, ctx }) {
  const isIncome = !!x.kind;
  const ci = isIncome ? { icon: x.kind === 'salary' ? '💼' : '💰' } : catInfo(x.category);
  return (
    <button className="item" onClick={() => ctx.openAdd({ editing: x })}>
      <div className="ic">{ci.icon}</div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="t ellipsis">{isIncome ? (x.kind === 'salary' ? 'Sueldo' : x.note || 'Ingreso extra') : x.note || x.category}</div>
        <div className="s ellipsis">{fmtDate(x.date)}{!isIncome && x.note ? ` · ${x.category}` : ''}</div>
      </div>
      <div className={'amt money' + (isIncome ? ' pos' : '')}>
        {isIncome ? '+' : '−'}{x.currency === 'USD' ? usd(x.amount) : money(x.amount)}
        {x.currency === 'USD' && <small>≈ {money(ars(x))}</small>}
      </div>
    </button>
  );
}

export default function Home({ ctx }) {
  const { data, period, isCurrent, rates } = ctx;
  const s = summary(data, period, rates);
  const pct = s.income > 0 ? Math.min(100, Math.round((s.spent / s.income) * 100)) : 0;
  const name = data.profile?.name;

  return (
    <>
      <MonthHeader ctx={ctx} title={name ? `Hola, ${name}` : 'BudgetFlow'} />

      {period.salary || s.income > 0 ? (
        <section className="card hero">
          <div className="k">{isCurrent ? 'Te queda' : 'Te quedó'}</div>
          <div className={'free money' + (s.left < 0 ? ' negative' : '')}>{money(s.left)}</div>
          <div className="meter"><div style={{ width: `${pct}%` }} className={pct >= 90 ? 'hot' : ''} /></div>
          <div className="k" style={{ marginTop: 6 }}>Gastaste el {pct}% de lo que cobraste</div>
          <div className="rows">
            <div className="r"><span>💼 Sueldo</span><b className="pos money">{money(s.salary)}</b></div>
            {s.extra > 0 && <div className="r"><span>💰 Ingresos extra</span><b className="pos money">+{money(s.extra)}</b></div>}
            <div className="r"><span>💸 Gastado</span><b className="neg money">−{money(s.spent)}</b></div>
            {s.spentUsd > 0 && <div className="r"><span>💵 En dólares</span><b className="money">{usd(s.spentUsd)}</b></div>}
          </div>
        </section>
      ) : (
        <section className="card hero">
          <div className="k">Gastado {period.id === 'pre' ? 'antes del primer sueldo' : 'hasta ahora'}</div>
          <div className="free money">{money(s.spent)}</div>
          {period.id !== 'pre' && <>
            <div className="k" style={{ marginTop: 6 }}>Anotá tu sueldo cuando cobres y te digo cuánto te queda.</div>
            <button className="btn primary block" style={{ marginTop: 14 }} onClick={() => ctx.openAdd({ kind: 'salary' })}>💼 Anotar sueldo</button>
          </>}
        </section>
      )}

      {s.fixed.length > 0 && period.id !== 'pre' && (
        <section className="card">
          <div className="card-h">
            <div className="card-t">Pagos fijos</div>
            <span className={'pill' + (s.pending ? ' w' : ' g')}>{s.pending ? `Falta ${money(s.pending)}` : 'Todo pagado ✓'}</span>
          </div>
          {s.fixed.map((f) => (
            <div key={f.id} className={'item fixed' + (f.paid ? ' done' : '')}>
              <div className="ic">{f.icon || '📌'}</div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="t ellipsis">{f.name}</div>
                <div className="s">{f.paid ? `Pagado el ${fmtDate(f.paid.date)}` : 'Pendiente'}</div>
              </div>
              {f.paid
                ? <button className="amt money pos" onClick={() => ctx.openAdd({ editing: f.paid })}>{f.paid.currency === 'USD' ? usd(f.paid.amount) : money(f.paid.amount)} ✓</button>
                : <button className="btn small primary" onClick={() => ctx.openAdd({ fixed: f })}>Pagar {f.currency === 'USD' ? usd(f.amount) : money(f.amount)}</button>}
            </div>
          ))}
          {s.pending > 0 && (period.salary || s.income > 0) && <div className="hint">Cuando pagues lo que falta te van a quedar <b className="money">{money(s.left - s.pending)}</b>.</div>}
        </section>
      )}

      <section className="card">
        <div className="card-h">
          <div className="card-t">Últimos gastos</div>
          {s.expenses.length > 5 && <button className="link" onClick={() => ctx.go('moves')}>Ver todos</button>}
        </div>
        {s.expenses.length === 0
          ? <div className="empty">Todavía no anotaste gastos este mes. Tocá el <b>+</b> para anotar uno.</div>
          : s.expenses.slice(0, 5).map((x) => <ExpenseRow key={x.id} x={x} ctx={ctx} />)}
      </section>
    </>
  );
}
