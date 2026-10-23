# 💸 BudgetFlow

PWA de finanzas personales: ingresos, gastos fijos, cuotas, tarjetas de crédito con cierre y vencimiento, ahorro y presupuestos por categoría. Cada usuario ve solo sus propios datos.

## Funcionalidades

- Disponible del período y gasto diario sugerido
- Tarjetas de crédito con fecha de cierre y vencimiento reales
- Cuotas, gastos fijos e ingresos esperados vs. confirmados
- Pesos y dólares (cotización automática)
- Presupuestos por categoría, meta de ahorro e historial
- Recordatorios de vencimientos al calendario (.ics)
- Datos aislados por usuario (`users/{uid}/...`)

## Requisitos

- Node.js 18 o superior
- Un proyecto de [Firebase](https://console.firebase.google.com) con **Authentication (correo/contraseña)** y **Cloud Firestore**

## Puesta en marcha

```bash
npm install
cp public/config.example.js public/config.js   # completá con la config de tu proyecto de Firebase
npm run build                                  # genera la carpeta dist/
```

Sin `public/config.js` (o con `firebase: null`) la app arranca en **modo demo**, con datos de ejemplo guardados solo en el navegador.

`npm run preview` genera `preview.html`, una versión de un solo archivo en modo demo.

## Despliegue

La carpeta `dist/` es un sitio estático: se puede publicar en cualquier hosting estático (Firebase Hosting, Netlify, GitHub Pages, etc.).
Acordate de agregar el dominio final en *Firebase → Authentication → Configuración → Dominios autorizados*.

## Seguridad

- `public/config.js` y `dist/` están en `.gitignore`: **no subas tu configuración** al repositorio.
- Publicá las reglas de `firestore.rules` en *Firestore → Reglas*.
- Las cuentas se crean a mano desde la consola de Firebase (la app no tiene registro público).
- Recomendado: restringir la API key a tu dominio en Google Cloud Console → *Credenciales*.

## Stack

React 19 · esbuild · Firebase (Auth + Firestore) · PWA (manifest + service worker)
