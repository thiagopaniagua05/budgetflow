import { useEffect, useState } from 'react';
import { money } from './month.js';
import { RATE_TYPES, lastRateType, saveRateType } from './rates.js';
import { fmtInput, numToInput, parseNum } from './components.jsx';

/** Estado de un monto con moneda (pesos o dólares + cotización). */
export function useMoney(rates, init = {}) {
  const t0 = init.rateType || (init.currency === 'USD' && init.fixed ? 'tarjeta' : lastRateType());
  const [amount, setAmount] = useState(numToInput(init.amount));
  const [currency, setCurrency] = useState(init.currency || 'ARS');
  const [rateType, setRateType] = useState(t0);
  const [rate, setRate] = useState(numToInput(init.rate || rates?.[t0]));
  // Si la cotización llega después de abrir la ventana, se completa sola
  useEffect(() => { if (!rate && rates?.[rateType]) setRate(numToInput(rates[rateType])); }, [rates]); // eslint-disable-line
  const value = parseNum(amount), rateNum = parseNum(rate), isUsd = currency === 'USD';
  return {
    amount, setAmount, currency, setCurrency, rateType, rate, setRate, value, rateNum, isUsd, rates,
    pickRate: (t) => { setRateType(t); if (rates?.[t]) setRate(numToInput(rates[t])); },
    error: () => (!(value > 0) ? 'Poné un monto' : isUsd && !(rateNum > 0) ? 'Poné a cuánto está el dólar' : ''),
    /** Campos para guardar: { amount, currency, rate?, rateType? } */
    fields: () => { if (isUsd) saveRateType(rateType); return { amount: value, currency, ...(isUsd ? { rate: rateNum, rateType } : {}) }; },
  };
}

export function MoneyField({ m, onChange, autoFocus = true }) {
  return (
    <>
      <div className="amount">
        <span className="cur">{m.isUsd ? 'US$' : '$'}</span>
        <input inputMode="decimal" placeholder="0" value={m.amount} autoFocus={autoFocus} aria-label="Monto"
          onChange={(ev) => { m.setAmount(fmtInput(ev.target.value, m.amount)); onChange?.(); }} />
      </div>
      <div className="chips" style={{ justifyContent: 'center' }}>
        {[['ARS', '🇦🇷 Pesos'], ['USD', '🇺🇸 Dólares']].map(([c, l]) => (
          <button key={c} className={'chip g' + (m.currency === c ? ' on' : '')} onClick={() => m.setCurrency(c)}>{l}</button>
        ))}
      </div>
      <div className={'fold' + (m.isUsd ? ' open' : '')}>
        <div>
          <div className="usdbox">
            <div className="chips">
              {RATE_TYPES.map(([t, l]) => <button key={t} className={'chip' + (m.rateType === t ? ' on' : '')} onClick={() => m.pickRate(t)}>{l}</button>)}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>1 US$ =</span>
              <input className="input grow" inputMode="decimal" placeholder="$ cotización" aria-label="Cotización" value={m.rate}
                onChange={(ev) => { m.setRate(fmtInput(ev.target.value, m.rate)); onChange?.(); }} />
            </div>
            {m.value > 0 && m.rateNum > 0 && <div className="hint">≈ <b className="money">{money(m.value * m.rateNum)}</b> en pesos</div>}
            {!m.rates && <div className="hint">No pude traer la cotización (¿sin internet?). Escribila a mano.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
