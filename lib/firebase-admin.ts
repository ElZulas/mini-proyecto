import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function credencial(): Record<string, unknown> {
  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
  let info: Record<string, unknown> | null = null;
  let ruta = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (crudo?.trim().startsWith("{")) {
    info = JSON.parse(crudo) as Record<string, unknown>;
  } else if (crudo) {
    ruta = crudo.trim();
  }
  if (!info) {
    if (!ruta) {
      throw new Error(
        "Falta FIREBASE_SERVICE_ACCOUNT_JSON (Vercel) o FIREBASE_SERVICE_ACCOUNT_PATH (.env.local).",
      );
    }
    info = JSON.parse(readFileSync(ruta, "utf8")) as Record<string, unknown>;
  }
  if (typeof info.private_key === "string") {
    info.private_key = info.private_key.replace(/\\n/g, "\n");
  }
  return info;
}

function aplicacion(): App {
  const existentes = getApps();
  if (existentes.length > 0) {
    return existentes[0]!;
  }
  return initializeApp({
    credential: cert(credencial() as Parameters<typeof cert>[0]),
  });
}

export function adminAuth() {
  return getAuth(aplicacion());
}

export function adminDb() {
  return getFirestore(aplicacion());
}
