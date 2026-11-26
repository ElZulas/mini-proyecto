import { NextRequest, NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase-admin";
import { jsonError } from "@/lib/sesion";

const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return jsonError(400, "El cuerpo debe ser JSON.");
  }
  const idToken =
    typeof cuerpo === "object" && cuerpo !== null && "idToken" in cuerpo && typeof cuerpo.idToken === "string"
      ? cuerpo.idToken
      : "";
  if (!idToken) {
    return jsonError(400, "Falta idToken.");
  }
  try {
    await adminAuth().verifyIdToken(idToken);
    const sesion = await adminAuth().createSessionCookie(idToken, { expiresIn: CINCO_DIAS_MS });
    const respuesta = NextResponse.json({ ok: true });
    const enProduccion =
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    respuesta.cookies.set("c360_sesion", sesion, {
      httpOnly: true,
      sameSite: "lax",
      secure: enProduccion,
      path: "/",
      maxAge: CINCO_DIAS_MS / 1000,
    });
    return respuesta;
  } catch {
    return jsonError(401, "No se pudo abrir la sesión.");
  }
}

export async function DELETE() {
  const enProduccion =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set("c360_sesion", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: enProduccion,
    path: "/",
    maxAge: 0,
  });
  return respuesta;
}
