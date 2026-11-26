import { NextRequest, NextResponse } from "next/server";

import { leerPanelAgregado, reconstruirPanelAgregado } from "@/lib/agregar-panel";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  try {
    const forzar = request.nextUrl.searchParams.get("rebuild") === "1";
    let panel = forzar ? null : await leerPanelAgregado();
    if (!panel) {
      panel = await reconstruirPanelAgregado();
    }
    const {
      version: _v,
      actualizado_en: _a,
      recientes: _r,
      calor: _c,
      ...analitica
    } = panel;
    return NextResponse.json(analitica);
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo calcular la analítica.");
  }
}
