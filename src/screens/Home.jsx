import { useState } from 'react';
import * as F from '../finance.js';
import { Donut, Icon, catInfo, fmtDate, relDays, short, Sheet, parseNum } from '../components.jsx';

const ALERT_CLS = { late: 'red', neg: 'red', budget: '', pace: '', close: 'vio', pay: 'ok', confirm: 'vio', today: '', soon: '' };

export function PeriodHeader({ ctx, title }) {
  const { k, setK, now, data } = ctx;
  const cur = F.periodOf(now, data.profile?.payday || 'last');
  const start = F.periodStart(k, data.profile?.payday), end = F.periodEnd(k, data.profile?.payday);
  const left = F.daysUntil(end, now);
  return (
    <header className="top">
      <div className="grow">
        <div className="row" style={{ gap: 8 }}><div className="brand">{title || 'BudgetFlow'}</div>{ctx.store.mode === 'demo' && <span className="demo">DEMO</span>}</div>
        <div className="period-nav">
          <button className="icon-btn" onClick={() => setK(F.addMonths(k, -1))} aria-label="Mes anterior"><Icon.back /></button>
          <div className="t">{F.periodLabel(k)}</div>
          <button className="icon-btn" onClick={() => setK(F.addMonths(k, 1))} aria-label="Mes siguiente" disabled={F.monthsBetween(cur, k) >= 6}><Icon.next /></button>
          {k !== cur && <button className="link" style={{ marginLeft: 6 }} onClick={() => setK(cur)}>Hoy</button>}
        </div>
        <div className="period-sub">
          Cobro {fmtDate(start)} → {fmtDate(end)}{k === cur ? ` · faltan ${left} día${left === 1 ? '' : 's'}` : ''}
        </div>
      </div>
      <button className="avatar" onClick={() => ctx.go('settings')} aria-label="Ajustes">{(data.profile?.name || '?').slice(0, 1).toUpperCase()}</button>
    </header>
  );
}

export default function Home({ ctx }) {
  const { data, k, now, rates, store, toast } = ctx;
  const pd = F.computePeriod(data, k, now, rates);
  const next = F.nextPeriodCommitted(data, k, now, rates);
  const al = F.alerts(pd, data, now, rates);
  const [showAll, setShowAll] = useState(false);
  const [saveSheet, setSaveSheet] = useState(false);
  const paidSaving = (data.savings || []).filter((s) => s.period === k).reduce((a, s) => a + s.amount, 0);
  const totalSaved = (data.savings || []).reduce((a, s) => a + s.amount, 0);

  const togglePaid = async (d) => {
    const id = `${d.kind}_${d.id}_${k}`;
    if (d.paid) await store.remove('payments', id);
    else { await store.set('payments', id, { at: Date.now() }); toast(`✅ ${d.title} marcado como pagado`); }
  };

  const dues = pd.isCurrent
    ? pd.dues.filter((d) => (!d.paid && F.daysUntil(d.due, now) <= 7) || (d.paid && F.daysUntil(d.due, now) >= 0 && F.daysUntil(d.due, now) <= 7))
    : pd.dues;
  const pendingCount = pd.dues.filter((d) => !d.paid).length;

  const parts = [
    { label: 'Fijos y servicios', value: pd.fixedTotal, color: '#f87171' },
    { label: 'Cuotas', value: pd.instTotal, color: '#8b5cf6' },
    ...Object.entries(pd.byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: `${catInfo(c).icon} ${c}`, value: v, color: catInfo(c).color })),
  ];
  const partsTotal = parts.reduce((a, p) => a + p.value, 0);
  const budgets = Object.entries(data.profile?.budgets || {}).filter(([, l]) => l > 0);
  const activeInst = (data.installments || []).map((i) => ({ i, st: F.installmentStatus(i, k) })).filter((x) => x.st.state === 'active')
    .sort((a, b) => a.st.left - b.st.left);
  const bar = [[pd.fixedTotal, '#f87171'], [pd.instTotal, '#8b5cf6'], [pd.variableTotal, '#fb923c'], [pd.savingGoal, '#60a5fa'], [Math.max(0, pd.free), '#10b981']];

  return (
    <>
      <PeriodHeader ctx={ctx} />

      <section className="card hero">
        <div className="k">💸 Dinero libre real</div>
        <div className={'free money' + (pd.free < 0 ? ' negative' : '')}>{F.money(pd.free)}</div>
        <div className="k">{pd.isCurrent ? 'disponibles hasta el próximo cobro' : k > F.periodOf(now, pd.payday) ? 'proyectado para ese mes' : 'te quedaron ese mes'}</div>
        {pd.daily != null && pd.free > 0 && <div className="daily">🎯 Podés gastar <span className="money">{F.money(pd.daily)}</span> por día</div>}
        <div className="rows">
          <button className="r" onClick={() => ctx.openPlans('ingresos')} style={{ width: '100%' }}>
            <span>Ingresos{pd.incomes.some((x) => !x.confirmed) ? ' (esperados)' : ''}</span><b className="pos money">+{F.money(pd.incomeTotal)}</b>
          </button>
          <div className="r"><span>Fijos y servicios</span><b className="neg money">−{F.money(pd.fixedTotal)}</b></div>
          <div className="r"><span>Cuotas del mes</span><b className="vio money">−{F.money(pd.instTotal)}</b></div>
          <div className="r"><span>Gastos variables</span><b className="neg money">−{F.money(pd.variableTotal)}</b></div>
          {pd.savingGoal > 0 && <div className="r"><span>Ahorro apartado</span><b className="money" style={{ color: 'var(--blue)' }}>−{F.money(pd.savingGoal)}</b></div>}
        </div>
        {pd.incomeTotal > 0 && (
          <div className="stackbar">{bar.map(([v, c], i) => <div key={i} style={{ width: `${(v / Math.max(pd.incomeTotal, 1)) * 100}%`, background: c }} />)}</div>
        )}
      </section>

      {al.slice(0, showAll ? 20 : 3).map((a, i) => (
        <div key={i} className={'alert ' + (ALERT_CLS[a.type] ?? '')}>
          <span>{a.icon}</span>
          <div className="grow">{a.text}{(a.type === 'confirm' || a.type === 'pay') && <> <button onClick={() => ctx.openPlans('ingresos')}>Confirmar →</button></>}</div>
        </div>
      ))}
      {al.length > 3 && <button className="link" style={{ marginTop: 8 }} onClick={() => setShowAll(!showAll)}>{showAll ? 'Ver menos' : `Ver ${al.length - 3} avisos más`}</button>}

      <div className="card-h" style={{ marginTop: 18 }}>
        <div className="card-t">⏰ {pd.isCurrent ? 'Vencimientos (7 días)' : 'Vencimientos del mes'}</div>
        <span className={'pill' + (pendingCount ? ' w' : ' g')}>{pendingCount ? `${pendingCount} pendientes` : 'Todo pago ✓'}</span>
      </div>
      {dues.length ? (
        <div className="hscroll">
          {dues.map((d) => {
            const n = F.daysUntil(d.due, now);
            const cls = d.paid ? 'paid' : n < 0 && pd.isCurrent ? 'late' : n <= 3 && pd.isCurrent ? 'urgent' : '';
            return (
              <div key={d.kind + d.id} className={'due ' + cls}>
                <div className="ic">{d.icon}</div>
                <button className="paybtn" onClick={() => togglePaid(d)}>{d.paid ? '↺ Pagado' : '✓ Pagar'}</button>
                <div className="t ellipsis">{d.title}</div>
                <div className="s ellipsis">{d.sub}</div>
                <div className="a money">{F.money(d.ars)}</div>
                <div className="w">{d.paid ? 'Pagado ✓' : pd.isCurrent ? relDays(n) : `Vence el ${fmtDate(d.due)}`}</div>
              </div>
            );
          })}
        </div>
      ) : <div className="card empty" style={{ marginTop: 0 }}>Nada por vencer en los próximos 7 días 🎉</div>}

      {pd.statements.length > 0 && (
        <section className="card">
          <div className="card-h"><div className="card-t">💳 Resúmenes de {F.periodLabel(k)}</div>{rates.tarjeta > 0 && <span className="pill">US$1 = {F.money(rates.tarjeta)}</span>}</div>
          <div className="cc">
            {pd.statements.map((s) => (
              <button key={s.card.id} className={'ccard ' + (s.card.color || 'violet')} onClick={() => ctx.openPlans('tarjetas')}>
                <div className="nm ellipsis">{s.card.name}</div>
                <div>
                  <div className="am money">{F.money(s.total)}</div>
                  <div className="ds">{s.usd > 0 ? `incl. ${F.usd(s.usd)} · ` : ''}cerró {fmtDate(s.close)} · vence {fmtDate(s.due)}{s.paid ? ' · ✓ pagado' : ''}</div>
                </div>
              </button>
            ))}
          </div>
          {pd.isCurrent && next.cards > 0 && (
            <div className="hint" style={{ marginTop: 10 }}>
              📌 Ya tenés <b style={{ color: 'var(--text)' }}>{F.money(next.cards)}</b> comprometidos en tarjetas para {F.periodLabel(F.addMonths(k, 1))} (cuotas + lo que compraste después del cierre).
            </div>
          )}
        </section>
      )}

      {partsTotal > 0 && (
        <section className="card">
          <div className="card-h"><div className="card-t">🍩 ¿A dónde va la plata?</div><span className="pill g">{F.periodLabel(k)}</span></div>
          <div className="donut-wrap">
            <Donut parts={parts} sub="GASTADO" center={short(partsTotal)} />
            <div className="legend">
              {parts.slice(0, 7).map((p) => (
                <div key={p.label} className="li"><span className="dot" style={{ background: p.color }} /><span className="ellipsis">{p.label}</span><b>{Math.round((p.value / partsTotal) * 100)}%</b></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {budgets.length > 0 && (
        <section className="card">
          <div className="card-h"><div className="card-t">📊 Presupuesto por categoría</div><button className="link" onClick={() => ctx.go('settings')}>Editar</button></div>
          {budgets.map(([c, l]) => {
            const v = pd.byCat[c] || 0, p = v / l;
            return (
              <div key={c} className={'bud' + (p > 1 ? ' over' : p > 0.8 ? ' warn' : '')}>
                <span>{catInfo(c).icon} {c}</span>
                <span className="lim money">{F.money(v)} / {F.money(l)}{p > 1 ? ' ⚠️' : ''}</span>
                <div className="track"><div className="fill" style={{ width: `${Math.min(100, p * 100)}%` }} /></div>
              </div>
            );
          })}
        </section>
      )}

      {activeInst.length > 0 && (
        <section className="card">
          <div className="card-h"><div className="card-t">🧾 Compras en cuotas</div><span className="pill">{activeInst.length} activas</span></div>
          {activeInst.map(({ i, st }) => {
            const amt = F.toARS(i.amountPer, i.currency, rates, (data.cards || []).some((c) => c.id === i.method));
            const card = (data.cards || []).find((c) => c.id === i.method);
            return (
              <div key={i.id} className="inst">
                <div className="row"><span className="grow ellipsis" style={{ fontWeight: 700 }}>{i.icon || '🧾'} {i.name}</span><b className="money">{F.money(amt)}/mes</b></div>
                <div className="sub">{card ? card.name : 'Pago directo'} · Cuota {st.current} de {i.total} · {st.left === 1 ? 'última cuota 🎉' : `quedan ${st.left - 1} después de esta (${F.money(amt * (st.left - 1))})`}</div>
                <div className="prog"><div style={{ width: `${(st.current / i.total) * 100}%` }} /></div>
              </div>
            );
          })}
        </section>
      )}

      {(pd.savingGoal > 0 || totalSaved > 0) && (
        <section className="card">
          <div className="row">
            <div style={{ fontSize: 34 }}>🐷</div>
            <div className="grow">
              <div className="card-t">Meta de ahorro</div>
              <div style={{ fontSize: 19, fontWeight: 900, marginTop: 3 }} className="money">
                {paidSaving > 0 ? `${F.money(paidSaving)} apartados` : `${F.money(pd.savingGoal)} por apartar`}
              </div>
              <div className="hint" style={{ marginTop: 2, color: paidSaving >= pd.savingGoal && paidSaving > 0 ? 'var(--em2)' : undefined }}>
                {paidSaving >= pd.savingGoal && paidSaving > 0 ? 'Cumplida este mes ✓' : 'Todavía no lo marcaste'} · total ahorrado: {F.money(totalSaved)}
              </div>
            </div>
            <button className="btn small" onClick={() => setSaveSheet(true)}>{paidSaving > 0 ? 'Editar' : 'Apartar'}</button>
          </div>
        </section>
      )}

      {saveSheet && <SavingSheet ctx={ctx} current={paidSaving} goal={pd.savingGoal} onClose={() => setSaveSheet(false)} />}
    </>
  );
}

function SavingSheet({ ctx, current, goal, onClose }) {
  const [v, setV] = useState(String(current || goal || ''));
  const save = async () => {
    const amount = parseNum(v);
    if (amount > 0) await ctx.store.set('savings', `sav_${ctx.k}`, { period: ctx.k, amount, at: Date.now() });
    else await ctx.store.remove('savings', `sav_${ctx.k}`);
    ctx.toast(amount > 0 ? '🐷 Ahorro registrado' : 'Ahorro borrado');
    onClose();
  };
  return (
    <Sheet title={`Ahorro de ${F.periodLabel(ctx.k)}`} onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>¿Cuánto apartaste este mes? Tu meta es {F.money(goal)}.</p>
      <input className="input" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <button className="btn primary block" style={{ marginTop: 14 }} onClick={save}>Guardar</button>
    </Sheet>
  );
}
