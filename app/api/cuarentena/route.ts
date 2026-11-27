import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";

export const dynamic = "force-dynamic";

function iso(valor: unknown): string | null {
  if (valor && typeof valor === "object" && "toDate" in valor && typeof (valor as { toDate: () => Date }).toDate === "function") {
    return (valor as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof valor === "string" ? valor : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

/** Muestra acotada: no leer los 793 de cuarentena en cada visita. */
export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) return sesion;

  try {
    const limitePedido = Number(request.nextUrl.searchParams.get("limite") ?? "40");
    const limite = Number.isInteger(limitePedido) && limitePedido > 0 ? Math.min(limitePedido, 80) : 40;
    const consulta = await adminDb().collection("cuarentena").limit(limite).get();
    const filas = consulta.docs.map((doc) => {
      const fila = doc.data();
      return {
        id_interaccion: doc.id,
        id_usuario: String(fila.id_usuario ?? ""),
        motivo_rechazo: String(fila.motivo_rechazo ?? ""),
        fecha_cuarentena: iso(fila.fecha_cuarentena),
        canal: texto(fila.canal),
        tipo: texto(fila.tipo),
        tema: texto(fila.tema),
        texto: texto(fila.texto),
      };
    });
    return NextResponse.json({ total: filas.length, limite, cuarentena: filas });
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo listar la cuarentena.");
  }
}
