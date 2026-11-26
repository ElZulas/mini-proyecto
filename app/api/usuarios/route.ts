import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";

export const dynamic = "force-dynamic";

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

/** Lista de usuarios vía Admin (1 pasada). El cliente no abre onSnapshot de toda la colección. */
export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) return sesion;

  try {
    const estatus = request.nextUrl.searchParams.get("estatus");
    const consentimiento = request.nextUrl.searchParams.get("consentimiento");
    const consulta = await adminDb().collection("usuarios").get();
    const usuarios = consulta.docs
      .map((doc) => {
        const fila = doc.data();
        const cons = String(fila.consentimiento_datos ?? "");
        return {
          id_usuario: doc.id,
          alias: String(fila.alias ?? ""),
          estatus: String(fila.estatus ?? ""),
          consentimiento_datos: cons,
          rango_edad: String(fila.rango_edad ?? ""),
          interes_principal: String(fila.interes_principal ?? ""),
          plataforma_principal: String(fila.plataforma_principal ?? ""),
          especie_fursona: String(fila.especie_fursona ?? ""),
          ciudad: cons === "si" ? texto(fila.ciudad) : null,
          pais: cons === "si" ? texto(fila.pais) : null,
          es_artista: Boolean(fila.es_artista),
          mensajes_30d: numero(fila.mensajes_30d),
          reacciones_30d: numero(fila.reacciones_30d),
          sentimiento_promedio: numero(fila.sentimiento_promedio),
        };
      })
      .filter((fila) => (estatus ? fila.estatus === estatus : true))
      .filter((fila) => (consentimiento ? fila.consentimiento_datos === consentimiento : true));

    return NextResponse.json({ total: usuarios.length, usuarios });
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudieron listar usuarios.");
  }
}
