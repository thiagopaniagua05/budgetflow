import { useEffect } from 'react';

export const CATEGORIES = [
  { name: 'Súper', icon: '🛒', color: '#10b981' }, { name: 'Comida', icon: '🍔', color: '#34d399' },
  { name: 'Salidas', icon: '🍻', color: '#60a5fa' }, { name: 'Transporte', icon: '🚌', color: '#22d3ee' },
  { name: 'Salud', icon: '💊', color: '#f472b6' }, { name: 'Ropa', icon: '👕', color: '#c084fc' },
  { name: 'Hogar', icon: '🛋️', color: '#fb923c' }, { name: 'Varios', icon: '🎁', color: '#facc15' },
];
export const FIXED_CATS = ['Vivienda', 'Servicios', 'Suscripciones', 'Educación', 'Seguros', 'Otros'];
export const catInfo = (name, custom = []) => [...CATEGORIES, ...custom].find((c) => c.name === name) || { name, icon: '🏷️', color: '#94a3b8' };

const I = (d, sw = 2) => (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
export const Icon = {
  home: I(<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  list: I(<path d="M4 6h16M4 12h16M4 18h10" />),
  card: I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>),
  chart: I(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  plus: I(<path d="M12 5v14M5 12h14" />, 3),
  gear: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, 1.6),
  back: I(<path d="M15 6l-6 6 6 6" />),
  next: I(<path d="M9 6l6 6-6 6" />),
  trash: I(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  check: I(<path d="M5 12l5 5L20 7" />, 2.6),
};

export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ text, okText = 'Sí', onOk, onCancel, danger = true }) {
  return (
    <Sheet title="¿Seguro?" onClose={onCancel}>
      <p className="muted">{text}</p>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn grow" onClick={onCancel}>Cancelar</button>
        <button className={'btn grow' + (danger ? ' danger' : ' primary')} onClick={onOk}>{okText}</button>
      </div>
    </Sheet>
  );
}

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export function Donut({ parts, center, sub }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const R = 46, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 120 120" className="donut">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#1f2440" strokeWidth="16" />
      {parts.filter((p) => p.value > 0).map((p, i) => {
        const len = (p.value / total) * C;
        const el = <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={p.color} strokeWidth="16"
          strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 60 60)" />;
        acc += len;
        return el;
      })}
      <text x="60" y="55" textAnchor="middle" className="donut-sub">{sub}</text>
      <text x="60" y="70" textAnchor="middle" className="donut-center">{center}</text>
    </svg>
  );
}

/** Barras apiladas por mes. series: [{ label, parts:[{value,color}] }] */
export function Bars({ series, fmt }) {
  const max = Math.max(1, ...series.map((s) => s.parts.reduce((a, p) => a + p.value, 0)));
  return (
    <div className="bars">
      {series.map((s, i) => {
        const tot = s.parts.reduce((a, p) => a + p.value, 0);
        return (
          <div key={i} className="bar-col">
            <div className="bar-val">{fmt(tot)}</div>
            <div className="bar-stack" style={{ height: `${(tot / max) * 100}%` }}>
              {s.parts.map((p, j) => <div key={j} style={{ flex: p.value, background: p.color }} />)}
            </div>
            <div className={'bar-lbl' + (s.on ? ' on' : '')}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export const short = (n) => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1).replace('.', ',')}M` : a >= 1e3 ? `${Math.round(a / 1e3)}k` : `${Math.round(a)}`;
  return (n < 0 ? '−$' : '$') + s;
};
export const fmtDate = (ts, o = {}) => new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', ...o });
export const toDateInput = (ts) => {
  const d = new Date(ts), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const parseNum = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
export const relDays = (n) => (n === 0 ? 'Vence hoy' : n === 1 ? 'Vence mañana' : n > 1 ? `Vence en ${n} días` : `Venció hace ${-n} día${n === -1 ? '' : 's'}`);

export function downloadFile(name, text, type = 'text/calendar;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
