import { NextRequest, NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";

export const dynamic = "force-dynamic";

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

/** Lista acotada con .limit() real en Firestore (máx. 80 lecturas por request). */
export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) return sesion;

  try {
    const estatus = request.nextUrl.searchParams.get("estatus");
    const consentimiento = request.nextUrl.searchParams.get("consentimiento");
    const limitePedido = Number(request.nextUrl.searchParams.get("limite") ?? "40");
    const limite = Number.isInteger(limitePedido) && limitePedido > 0 ? Math.min(limitePedido, 80) : 40;

    let consulta: Query = adminDb().collection("usuarios");
    if (estatus) {
      consulta = consulta.where("estatus", "==", estatus);
    } else if (consentimiento) {
      consulta = consulta.where("consentimiento_datos", "==", consentimiento);
    }
    const snap = await consulta.limit(limite).get();

    const usuarios = snap.docs.map((doc) => {
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
    });

    return NextResponse.json({ total: usuarios.length, limite, usuarios });
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudieron listar usuarios.");
  }
}
