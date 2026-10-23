// Cotización del dólar desde dolarapi.com (gratis, sin clave). Se guarda en el navegador por 6 horas.
const KEY = 'budgetflow-rates';
const TTL = 6 * 3600e3;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sin storage */ } };

export async function fetchRates(force = false) {
  const cached = read();
  if (!force && cached && Date.now() - cached.at < TTL) return cached;
  try {
    const get = async (casa) => {
      const r = await fetch(`https://dolarapi.com/v1/dolares/${casa}`);
      if (!r.ok) throw new Error(casa);
      return (await r.json()).venta;
    };
    const [tarjeta, mep, oficial] = await Promise.all([get('tarjeta'), get('bolsa'), get('oficial')]);
    const v = { tarjeta, mep, oficial, at: Date.now() };
    write(v);
    return v;
  } catch (e) {
    console.warn('No se pudo actualizar el dólar', e);
    return cached || null;
  }
}

/** Cotización efectiva: la manual (si está activada) o la automática. */
export function effectiveRates(auto, profile) {
  const m = profile?.rates;
  if (m?.manual) return { tarjeta: +m.tarjeta || 0, mep: +m.mep || 0, manual: true };
  return { tarjeta: auto?.tarjeta || +m?.tarjeta || 0, mep: auto?.mep || +m?.mep || 0, at: auto?.at, manual: false };
}
