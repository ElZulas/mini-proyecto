import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth } from "@/lib/firebase-admin";

export function jsonError(estado: number, error: string, detalles?: string[]) {
  return NextResponse.json(detalles ? { error, detalles } : { error }, { status: estado });
}

export async function exigirSesion(request: NextRequest): Promise<DecodedIdToken | NextResponse> {
  const encabezado = request.headers.get("authorization") ?? "";
  try {
    if (encabezado.startsWith("Bearer ")) {
      const token = encabezado.slice("Bearer ".length).trim();
      if (!token) {
        return jsonError(401, "Se requiere autenticación.");
      }
      return await adminAuth().verifyIdToken(token);
    }
    const cookie = request.cookies.get("c360_sesion")?.value;
    if (!cookie) {
      return jsonError(401, "Se requiere autenticación.");
    }
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return jsonError(401, "Token inválido o vencido.");
  }
}

export function esError(valor: DecodedIdToken | NextResponse): valor is NextResponse {
  return valor instanceof NextResponse;
}
