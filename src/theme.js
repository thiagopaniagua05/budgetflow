// Tema claro / oscuro. Se guarda en este dispositivo. "auto" sigue al celular.
const KEY = 'budgetflow-theme';
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null;

export const getTheme = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } };

export function applyTheme(t = getTheme()) {
  const light = t === 'light' || (t === 'auto' && mq?.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f5fb' : '#07080f');
}

export function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch { /* */ }
  applyTheme(t);
}

mq?.addEventListener?.('change', () => applyTheme());
