/**
 * Genera agregados/panel (1 doc) para que el dashboard no lea 2000 docs por visita.
 * Uso: node scripts/rebuild_agregado.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function cargarEnv() {
  try {
    const crudo = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const linea of crudo.split(/\r?\n/)) {
      if (!linea || linea.startsWith("#")) continue;
      const i = linea.indexOf("=");
      if (i < 0) continue;
      const k = linea.slice(0, i).trim();
      const v = linea.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

cargarEnv();

const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function credencial() {
  const ruta = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!ruta) throw new Error("Falta FIREBASE_SERVICE_ACCOUNT_PATH");
  return JSON.parse(readFileSync(ruta, "utf8"));
}

if (!getApps().length) {
  initializeApp({ credential: cert(credencial()) });
}

const db = getFirestore();

function contar(valores) {
  const mapa = new Map();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total || String(a.clave).localeCompare(String(b.clave), "es"));
}

function promedio(valores) {
  if (!valores.length) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function iso(valor) {
  if (valor && typeof valor.toDate === "function") return valor.toDate().toISOString();
  return typeof valor === "string" ? valor : null;
}

const [usuarios, interacciones, cuarentena] = await Promise.all([
  db.collection("usuarios").get(),
  db.collection("interacciones").get(),
  db.collection("cuarentena").get(),
]);

const U = usuarios.docs.map((d) => d.data());
const I = interacciones.docs.map((d) => {
  const f = d.data();
  return {
    id_interaccion: d.id,
    id_usuario: String(f.id_usuario ?? ""),
    timestamp: iso(f.timestamp),
    canal: String(f.canal ?? ""),
    tipo: String(f.tipo ?? ""),
    tema: String(f.tema ?? ""),
    texto: typeof f.texto === "string" ? f.texto : null,
    sentimiento: typeof f.sentimiento === "number" ? f.sentimiento : 0,
    ciudad: typeof f.ciudad === "string" ? f.ciudad : null,
  };
});

const enRiesgo = U.filter((u) => u.estatus === "en_riesgo").length;
const mapaCalor = new Map();
for (const f of I) {
  const k = `${f.tema}|${f.canal}`;
  mapaCalor.set(k, (mapaCalor.get(k) ?? 0) + 1);
}

const previo = await db.collection("agregados").doc("panel").get();
const version = (typeof previo.data()?.version === "number" ? previo.data().version : 0) + 1;

const cuerpo = {
  usuarios: U.length,
  interacciones: I.length,
  cuarentena: cuarentena.size,
  sin_consentimiento: U.filter((u) => u.consentimiento_datos === "no").length,
  sentimiento_promedio: promedio(I.map((f) => f.sentimiento)),
  tasa_riesgo: U.length ? enRiesgo / U.length : null,
  por_canal: contar(I.map((f) => f.canal)),
  por_tipo: contar(I.map((f) => f.tipo)),
  por_tema: contar(I.map((f) => f.tema)),
  por_estatus: contar(U.map((u) => String(u.estatus ?? ""))),
  por_rango_edad: contar(U.map((u) => String(u.rango_edad ?? ""))),
  por_interes: contar(U.map((u) => String(u.interes_principal ?? ""))),
  ciudades_con_consentimiento: contar(
    U.filter((u) => u.consentimiento_datos === "si" && u.ciudad).map((u) => String(u.ciudad)),
  ),
  version,
  actualizado_en: new Date().toISOString(),
  recientes: [...I].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 8),
  calor: [...mapaCalor.entries()].map(([clave, total]) => {
    const [tema, canal] = clave.split("|");
    return { tema, canal, total };
  }),
  _server: FieldValue.serverTimestamp(),
};

await db.collection("agregados").doc("panel").set(cuerpo);
console.log(
  JSON.stringify(
    {
      ok: true,
      version,
      usuarios: cuerpo.usuarios,
      interacciones: cuerpo.interacciones,
      cuarentena: cuerpo.cuarentena,
      lecturas_aprox: U.length + I.length + cuarentena.size + 1,
    },
    null,
    2,
  ),
);
