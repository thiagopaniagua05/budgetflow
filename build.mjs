// Compila la app a la carpeta dist/ (lista para subir a Firebase Hosting).
// Uso: node build.mjs            -> dist/
//      node build.mjs --preview  -> preview.html (un solo archivo, modo demo)
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';

const preview = process.argv.includes('--preview');
const out = 'dist';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  outfile: `${out}/app.js`,
  external: ['https://*'],
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [process.env.LIGA_NODE_PATH || 'node_modules'].filter(Boolean),
  logLevel: 'warning',
});

cpSync('public', out, { recursive: true });
const version = Date.now().toString(36);
const sw = readFileSync(`${out}/sw.js`, 'utf8').replace('__VERSION__', version);
writeFileSync(`${out}/sw.js`, sw);
// Si ya tenías un config.js con tus datos de Firebase en la raíz, se usa ese.
if (existsSync('config.js')) cpSync('config.js', `${out}/config.js`);
// Sin config.js propio -> se usa la plantilla (modo demo).
if (!existsSync(`${out}/config.js`)) cpSync('public/config.example.js', `${out}/config.js`);
rmSync(`${out}/config.example.js`, { force: true });

if (preview) {
  const js = readFileSync(`${out}/app.js`, 'utf8');
  const css = readFileSync(`${out}/app.css`, 'utf8');
  const icon = readFileSync(`${out}/icons/icon-192.png`).toString('base64');
  let html = readFileSync(`${out}/index.html`, 'utf8')
    .replace(/<link rel="manifest"[^>]*>\n?/, '')
    .replace(/href="icons\/[^"]+"/g, `href="data:image/png;base64,${icon}"`)
    .replace('<link rel="stylesheet" href="app.css" />', `<style>${css}</style>`)
    .replace('<script src="config.js"></script>', '<script>window.BUDGETFLOW_CONFIG={firebase:null};</script>')
    .replace('<script type="module" src="app.js"></script>', () => `<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>`);
  writeFileSync('preview.html', html);
  console.log('preview.html listo');
}
console.log('Build listo en', out);
