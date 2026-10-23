// Firebase (Auth + Firestore) cargado desde el CDN oficial de Google: no hace falta compilar nada.
const V = '10.14.1';
const BASE = `https://www.gstatic.com/firebasejs/${V}/`;

// Si estás offline, Firestore guarda el cambio y lo sube solo cuando vuelve la señal.
const soft = (p, ms = 4000) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

export async function createFirebaseStore(config) {
  const [appM, authM, fsM] = await Promise.all([
    import(/* @vite-ignore */ BASE + 'firebase-app.js'),
    import(/* @vite-ignore */ BASE + 'firebase-auth.js'),
    import(/* @vite-ignore */ BASE + 'firebase-firestore.js'),
  ]);
  const app = appM.initializeApp(config);
  const auth = authM.getAuth(app);
  let db;
  try {
    db = fsM.initializeFirestore(app, {
      localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
    });
  } catch (e) {
    db = fsM.getFirestore(app);
  }
  // Cada usuario tiene sus datos en users/{uid}/… y nadie ve los del otro
  let uid = null;
  const path = (col) => `users/${uid}/${col}`;
  const ref = (col, id) => fsM.doc(db, path(col), id);

  return {
    mode: 'firebase',
    onAuth(cb) {
      return authM.onAuthStateChanged(auth, (u) => { uid = u?.uid || null; cb(u ? { uid: u.uid, email: u.email } : null); });
    },
    async login(email, pass) { await authM.signInWithEmailAndPassword(auth, email.trim(), pass); },
    logout() { return authM.signOut(auth); },

    subscribe(col, cb) {
      return fsM.onSnapshot(fsM.collection(db, path(col)),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.error(col, e));
    },
    subscribeDoc(col, id, cb) {
      return fsM.onSnapshot(ref(col, id), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null),
        (e) => console.error(col, id, e));
    },
    newId(col) { return fsM.doc(fsM.collection(db, path(col))).id; },
    set(col, id, data) { return soft(fsM.setDoc(ref(col, id), data)); },
    update(col, id, data) { return soft(fsM.updateDoc(ref(col, id), data)); },
    remove(col, id) { return soft(fsM.deleteDoc(ref(col, id))); },
    async get(col, id) {
      const s = await fsM.getDoc(ref(col, id));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
  };
}

export function authErrorText(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-email'))
    return 'Email o contraseña incorrectos.';
  if (c.includes('too-many-requests')) return 'Demasiados intentos. Esperá un rato y probá de nuevo.';
  if (c.includes('network')) return 'Sin conexión. Revisá internet.';
  if (c.includes('operation-not-allowed')) return 'Falta activar "Correo electrónico/contraseña" en Firebase Authentication.';
  return e?.message || 'Algo salió mal';
}
