import { NextRequest, NextResponse } from "next/server";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { anularGeo, validarAlta, validarParcial, type InteraccionValida } from "@/lib/esquema";
import { adminDb } from "@/lib/firebase-admin";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";
import { serializar } from "@/lib/serializar";
import { emitirInteraccion } from "@/lib/socket-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ id: string }>;
}

function baseDesdeDoc(id: string, data: DocumentData): InteraccionValida | null {
  const plano = serializar(id, data);
  const validado = validarAlta({
    ...plano,
    timestamp: plano.timestamp,
    texto: plano.texto,
    pais: plano.pais,
    estado: plano.estado,
    ciudad: plano.ciudad,
  });
  return validado.ok ? validado.valor : null;
}

export async function GET(request: NextRequest, contexto: Contexto) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  const { id } = await contexto.params;
  try {
    const doc = await adminDb().collection("interacciones").doc(id).get();
    if (!doc.exists) {
      return jsonError(404, "No existe esa interacción.");
    }
    return NextResponse.json(serializar(doc.id, doc.data() ?? {}));
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo consultar la interacción.");
  }
}

export async function PATCH(request: NextRequest, contexto: Contexto) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  const { id } = await contexto.params;
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return jsonError(400, "El cuerpo debe ser JSON.");
  }
  const parcial = validarParcial(cuerpo);
  if (!parcial.ok) {
    return jsonError(400, "La modificación no cumple el esquema.", parcial.errores);
  }
  try {
    const referencia = adminDb().collection("interacciones").doc(id);
    const actual = await referencia.get();
    if (!actual.exists) {
      return jsonError(404, "No existe esa interacción.");
    }
    const base = baseDesdeDoc(id, actual.data() ?? {});
    if (!base) {
      return jsonError(500, "El documento guardado no se pudo leer.");
    }
    const fusionado = validarAlta({ ...base, ...parcial.valor, id_interaccion: id });
    if (!fusionado.ok) {
      return jsonError(400, "La interacción resultante no cumple el esquema.", fusionado.errores);
    }
    const usuario = await adminDb().collection("usuarios").doc(fusionado.valor.id_usuario).get();
    if (!usuario.exists) {
      return jsonError(400, "id_usuario no está en el padrón.");
    }
    const geoAnulada = usuario.get("consentimiento_datos") === "no";
    const final = geoAnulada ? anularGeo(fusionado.valor) : fusionado.valor;
    await referencia.set({
      ...final,
      timestamp: Timestamp.fromDate(new Date(final.timestamp)),
    });
    emitirInteraccion({
      tipo: "modificada",
      id_interaccion: id,
      id_usuario: final.id_usuario,
      canal: final.canal,
      tema: final.tema,
    });
    return NextResponse.json({ id_interaccion: id, geo_anulada: geoAnulada });
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo modificar la interacción.");
  }
}

export async function DELETE(request: NextRequest, contexto: Contexto) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  const { id } = await contexto.params;
  try {
    const referencia = adminDb().collection("interacciones").doc(id);
    const actual = await referencia.get();
    if (!actual.exists) {
      return jsonError(404, "No existe esa interacción.");
    }
    const data = actual.data() ?? {};
    await referencia.delete();
    emitirInteraccion({
      tipo: "eliminada",
      id_interaccion: id,
      id_usuario: typeof data.id_usuario === "string" ? data.id_usuario : null,
      canal: typeof data.canal === "string" ? data.canal : null,
      tema: typeof data.tema === "string" ? data.tema : null,
    });
    return NextResponse.json({ id_interaccion: id, eliminado: true });
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo eliminar la interacción.");
  }
}
