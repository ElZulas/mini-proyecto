import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

import { anularGeo, validarAlta, type InteraccionValida } from "@/lib/esquema";
import { adminDb } from "@/lib/firebase-admin";
import { serializar } from "@/lib/serializar";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";
import { reconstruirPanelAgregado } from "@/lib/agregar-panel";
import { emitirInteraccion } from "@/lib/socket-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function aplicarPrivacidad(valor: InteraccionValida): Promise<{ valor: InteraccionValida; geoAnulada: boolean } | NextResponse> {
  const usuario = await adminDb().collection("usuarios").doc(valor.id_usuario).get();
  if (!usuario.exists) {
    return jsonError(400, "id_usuario no está en el padrón.");
  }
  if (usuario.get("consentimiento_datos") === "no") {
    return { valor: anularGeo(valor), geoAnulada: true };
  }
  return { valor, geoAnulada: false };
}

function aDocumento(valor: InteraccionValida) {
  return {
    ...valor,
    timestamp: Timestamp.fromDate(new Date(valor.timestamp)),
  };
}

export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  try {
    const parametros = request.nextUrl.searchParams;
    const canal = parametros.get("canal");
    const tipo = parametros.get("tipo");
    const tema = parametros.get("tema");
    const limitePedido = Number(parametros.get("limite") ?? "50");
    const limite = Number.isInteger(limitePedido) && limitePedido > 0 ? Math.min(limitePedido, 500) : 50;
    const consulta = await adminDb().collection("interacciones").get();
    const filas = consulta.docs
      .map((doc) => serializar(doc.id, doc.data()))
      .filter((fila) => (canal ? fila.canal === canal : true))
      .filter((fila) => (tipo ? fila.tipo === tipo : true))
      .filter((fila) => (tema ? fila.tema === tema : true))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
      .slice(0, limite);
    return NextResponse.json({ total: filas.length, interacciones: filas });
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo consultar interacciones.");
  }
}

export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return jsonError(400, "El cuerpo debe ser JSON.");
  }
  const validado = validarAlta(cuerpo);
  if (!validado.ok) {
    return jsonError(400, "La interacción no cumple el esquema.", validado.errores);
  }
  try {
    const referencia = adminDb().collection("interacciones").doc(validado.valor.id_interaccion);
    const existente = await referencia.get();
    if (existente.exists) {
      return jsonError(409, "Ya existe una interacción con ese id_interaccion.");
    }
    const privado = await aplicarPrivacidad(validado.valor);
    if (privado instanceof NextResponse) {
      return privado;
    }
    await referencia.set(aDocumento(privado.valor));
    await reconstruirPanelAgregado().catch((err) => console.error("agregado", err));
    emitirInteraccion({
      tipo: "creada",
      id_interaccion: privado.valor.id_interaccion,
      id_usuario: privado.valor.id_usuario,
      canal: privado.valor.canal,
      tema: privado.valor.tema,
    });
    return NextResponse.json(
      { id_interaccion: privado.valor.id_interaccion, geo_anulada: privado.geoAnulada },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo crear la interacción.");
  }
}
