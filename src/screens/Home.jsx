import { money, usd, ars, summary, compare, savingsTotals } from '../month.js';
import { Icon, Fold, catInfo, fmtDate } from '../components.jsx';
import { FixedList } from './Fixed.jsx';
import { SavingsPanel } from './Savings.jsx';

/** Encabezado con el mes y flechas para ir a meses anteriores. */
export function MonthHeader({ ctx, title }) {
  const { period, prev, next, isCurrent, store } = ctx;
  return (
    <header className="top">
      <div className="grow">
        <div className="row" style={{ gap: 8 }}><div className="brand">{title}</div>{store.mode === 'demo' && <span className="demo">DEMO</span>}</div>
        <div className="period-nav">
          <button className="icon-btn" onClick={prev} disabled={!prev} aria-label="Mes anterior"><Icon.back /></button>
          <div className="t" key={period.id}>{period.label}</div>
          <button className="icon-btn" onClick={next} disabled={!next} aria-label="Mes siguiente"><Icon.next /></button>
        </div>
        {period.salary && <div className="period-sub">Desde que cobraste el {fmtDate(period.salary.date)}{!isCurrent && Number.isFinite(period.end) ? ` hasta el ${fmtDate(period.end - 1)}` : ''}</div>}
      </div>
    </header>
  );
}

/** "Gastaste 12% menos que en Octubre (a esta altura)". */
export function CompareLine({ ctx, ps }) {
  const idx = ps.findIndex((p) => p.id === ctx.period.id);
  const c = compare(ctx.data, ps, idx);
  if (!c) return null;
  const less = c.pct <= 0;
  return (
    <div className={'compare ' + (less ? 'good' : 'bad')}>
      {c.pct === 0 ? '＝ Igual' : `${less ? '▼' : '▲'} ${Math.abs(c.pct)}% ${less ? 'menos' : 'más'}`} que en {c.prevLabel}{c.sameDays ? ' a esta altura' : ''}
    </div>
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

export default function Home({ ctx, ps }) {
  const { data, period, isCurrent, rates } = ctx;
  const s = summary(data, period, rates);
  const pct = s.income > 0 ? Math.min(100, Math.round((s.spent / s.income) * 100)) : 0;
  const name = data.profile?.name;
  const tot = savingsTotals(data);
  const paidCount = s.fixed.filter((f) => f.paid).length;

  return (
    <>
      <MonthHeader ctx={ctx} title={name ? `Hola, ${name}` : 'BudgetFlow'} />

      {period.salary || s.income > 0 ? (
        <section className="card hero">
          <div className="k">{isCurrent ? 'Te queda' : 'Te quedó'}</div>
          <div className={'free money' + (s.left < 0 ? ' negative' : '')}>{money(s.left)}</div>
          <div className="meter"><div style={{ width: `${pct}%` }} className={pct >= 90 ? 'hot' : ''} /></div>
          <div className="stats">
            <div><span>Cobraste</span><b className="money pos">{money(s.income)}</b></div>
            <div><span>Gastaste</span><b className="money neg">{money(s.spent)}</b></div>
            {s.saved > 0 && <div><span>Ahorraste</span><b className="money vio">{money(s.saved)}</b></div>}
          </div>
          <CompareLine ctx={ctx} ps={ps} />
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

      {isCurrent && period.salary && Date.now() - period.salary.date > 27 * 864e5 && (
        <button className="card nudge" onClick={() => ctx.openAdd({ kind: 'salary' })}>
          <span>💼</span>
          <div className="grow"><b>¿Ya cobraste?</b><div className="s">Anotá el sueldo nuevo y empieza el mes siguiente.</div></div>
          <span className="link">Anotar →</span>
        </button>
      )}

      {period.id !== 'pre' && (
        <Fold icon="📌" title="Pagos fijos"
          right={s.fixed.length ? <span className={'pill' + (s.pending ? ' w' : ' g')}>{s.pending ? `Falta ${money(s.pending)}` : 'Todo pagado ✓'}</span> : <span className="muted sm">Cargar</span>}>
          {s.fixed.length > 0 && <div className="hint" style={{ marginTop: 0 }}>Pagaste {paidCount} de {s.fixed.length}{s.pending > 0 && (period.salary || s.income > 0) ? <> · cuando pagues todo te van a quedar <b className="money">{money(s.left - s.pending)}</b></> : ''}</div>}
          <FixedList ctx={ctx} s={s} />
          <button className="link" style={{ marginTop: 10 }} onClick={() => ctx.goMoves('fixed')}>{s.fixed.length ? 'Agregar o cambiar pagos fijos →' : 'Cargar mis pagos fijos →'}</button>
        </Fold>
      )}

      <Fold icon="🧾" title="Últimos gastos" right={<span className="muted sm">{s.expenses.length} {s.expenses.length === 1 ? 'gasto' : 'gastos'}</span>}>
        {s.expenses.length === 0
          ? <div className="empty">Todavía no anotaste gastos este mes. Tocá el <b>+</b> para anotar uno.</div>
          : s.expenses.slice(0, 5).map((x) => <ExpenseRow key={x.id} x={x} ctx={ctx} />)}
        {s.expenses.length > 0 && <button className="link" style={{ marginTop: 10 }} onClick={() => ctx.goMoves('month')}>Ver todos y en qué gasté →</button>}
      </Fold>

      <Fold icon="🐷" title="Ahorros" right={<span className="muted sm money">{money(tot.ARS)}{tot.USD ? ` + ${usd(tot.USD)}` : ''}</span>}>
        <SavingsPanel ctx={ctx} />
      </Fold>
    </>
  );
}
