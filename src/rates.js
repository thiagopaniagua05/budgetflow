// Cotización del dólar desde dolarapi.com (gratis, sin clave). Se guarda en el navegador por 3 horas.
const KEY = 'budgetflow-rates-v2';
const TTL = 3 * 3600e3;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sin storage */ } };

export const RATE_TYPES = [['tarjeta', '💳 Tarjeta'], ['mep', '📈 MEP'], ['blue', '💵 Blue'], ['oficial', '🏦 Oficial']];

export async function fetchRates(force = false) {
  const cached = read();
  if (!force && cached && Date.now() - cached.at < TTL) return cached;
  try {
    const get = async (casa) => {
      const r = await fetch(`https://dolarapi.com/v1/dolares/${casa}`);
      if (!r.ok) throw new Error(casa);
      return (await r.json()).venta;
    };
    const [tarjeta, mep, blue, oficial] = await Promise.all([get('tarjeta'), get('bolsa'), get('blue'), get('oficial')]);
    const v = { tarjeta, mep, blue, oficial, at: Date.now() };
    write(v);
    return v;
  } catch (e) {
    console.warn('No se pudo actualizar el dólar', e);
    return cached || null;
  }
}

/** Último tipo de dólar que usaste (se recuerda en este dispositivo). */
export const lastRateType = () => { try { return localStorage.getItem('budgetflow-ratetype') || 'tarjeta'; } catch { return 'tarjeta'; } };
export const saveRateType = (t) => { try { localStorage.setItem('budgetflow-ratetype', t); } catch { /* */ } };
