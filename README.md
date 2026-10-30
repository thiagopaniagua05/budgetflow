# 💸 BudgetFlow

PWA simple de finanzas personales: cuánto cobraste, cuánto gastaste y cuánto te queda en el mes. Cada usuario ve solo sus propios datos.

## Funcionalidades

- El mes arranca el día que cobrás el sueldo y dura hasta el próximo cobro
- Inicio: sueldo, gastado y cuánto te queda
- Pagos fijos del mes (alquiler, luz, internet…) con botón de "Pagar"
- Gastos por categoría y por día, con meses anteriores
- Ingresos extra
- Gastos, ingresos y pagos fijos en dólares (cotización automática: tarjeta, MEP, blue u oficial)
- Modo claro, oscuro o automático
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
