import { useEffect, useState } from 'react';

export const CATEGORIES = [
  { name: 'Súper', icon: '🛒', color: '#10b981' }, { name: 'Comida', icon: '🍔', color: '#34d399' },
  { name: 'Salidas', icon: '🍻', color: '#60a5fa' }, { name: 'Transporte', icon: '🚌', color: '#22d3ee' },
  { name: 'Salud', icon: '💊', color: '#f472b6' }, { name: 'Ropa', icon: '👕', color: '#c084fc' },
  { name: 'Hogar', icon: '🛋️', color: '#fb923c' }, { name: 'Varios', icon: '🎁', color: '#facc15' },
  { name: 'Pagos fijos', icon: '📌', color: '#a78bfa' },
];
export const catInfo = (name, custom = []) => [...CATEGORIES, ...custom].find((c) => c.name === name) || { name, icon: '🏷️', color: '#94a3b8' };

const I = (d, sw = 2) => (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
export const Icon = {
  home: I(<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  list: I(<path d="M4 6h16M4 12h16M4 18h10" />),
  plus: I(<path d="M12 5v14M5 12h14" />, 3),
  gear: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, 1.6),
  back: I(<path d="M15 6l-6 6 6 6" />),
  next: I(<path d="M9 6l6 6-6 6" />),
  trash: I(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  chev: I(<path d="M6 9l6 6 6-6" />),
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

export const fmtDate = (ts, o = {}) => new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', ...o });
export const toDateInput = (ts) => {
  const d = new Date(ts), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const parseNum = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

/**
 * Formatea un monto mientras se escribe: 130000 → 130.000 (coma para decimales: 9,99).
 * Si el teclado solo tiene punto, el punto recién tipeado se toma como coma decimal.
 */
export function fmtInput(raw, prev = '') {
  let s = String(raw ?? '');
  if (s === prev + '.') s = prev + ',';
  s = s.replace(/[^\d,]/g, '');
  const i = s.indexOf(',');
  const int = (i >= 0 ? s.slice(0, i) : s).replace(/^0+(?=\d)/, '');
  const dec = i >= 0 ? s.slice(i + 1).replace(/,/g, '').slice(0, 2) : null;
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec === null ? g : `${g || '0'},${dec}`;
}
/** Número guardado → texto para el campo (1530.5 → "1.530,5"). */
export const numToInput = (n) => (+n ? fmtInput(String(+n).replace('.', ',')) : '');

/** Sección que se despliega con una animación suave. */
export function Fold({ icon, title, right, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={'card foldcard ' + className + (open ? ' is-open' : '')}>
      <button className="fold-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="fold-ic">{icon}</span>
        <span className="grow fold-t">{title}</span>
        {right}
        <Icon.chev className="chev" />
      </button>
      <div className={'fold' + (open ? ' open' : '')}><div><div className="fold-body">{children}</div></div></div>
    </section>
  );
}
