import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { createDemoStore } from './store/demo.js';
import { createFirebaseStore } from './store/firebase.js';
import './styles.css';

const root = createRoot(document.getElementById('root'));
async function start() {
  const C = window.BUDGETFLOW_CONFIG;
  const cfg = C?.firebase || (C?.apiKey ? C : null); // acepta los dos formatos
  const forceDemo = new URLSearchParams(location.search).has('demo');
  root.render(<div className="splash"><div className="spinner" /></div>);
  try {
    const store = cfg && !forceDemo ? await createFirebaseStore(cfg) : createDemoStore();
    root.render(<App store={store} />);
  } catch (e) {
    console.error(e);
    root.render(
      <div className="login"><h1>Sin conexión</h1><p>No se pudo conectar. Revisá internet.</p>
        <button className="btn primary block" onClick={() => location.reload()}>Reintentar</button></div>
    );
  }
}
start();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
