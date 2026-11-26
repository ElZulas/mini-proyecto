import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { contar, promedio, tasaRiesgo } from "@/lib/kpis";
import { esError, exigirSesion, jsonError } from "@/lib/sesion";
import type { Analitica } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(request);
  if (esError(sesion)) {
    return sesion;
  }
  try {
    const [usuarios, interacciones, cuarentena] = await Promise.all([
      adminDb().collection("usuarios").get(),
      adminDb().collection("interacciones").get(),
      adminDb().collection("cuarentena").get(),
    ]);
    const filasUsuario = usuarios.docs.map((doc) => doc.data());
    const filasInteraccion = interacciones.docs.map((doc) => doc.data());
    const enRiesgo = filasUsuario.filter((fila) => fila.estatus === "en_riesgo").length;
    const cuerpo: Analitica = {
      usuarios: filasUsuario.length,
      interacciones: filasInteraccion.length,
      cuarentena: cuarentena.size,
      sin_consentimiento: filasUsuario.filter((fila) => fila.consentimiento_datos === "no").length,
      sentimiento_promedio: promedio(
        filasInteraccion
          .map((fila) => fila.sentimiento)
          .filter((valor): valor is number => typeof valor === "number"),
      ),
      tasa_riesgo: tasaRiesgo(enRiesgo, filasUsuario.length),
      por_canal: contar(filasInteraccion.map((fila) => String(fila.canal ?? ""))),
      por_tipo: contar(filasInteraccion.map((fila) => String(fila.tipo ?? ""))),
      por_tema: contar(filasInteraccion.map((fila) => String(fila.tema ?? ""))),
      por_estatus: contar(filasUsuario.map((fila) => String(fila.estatus ?? ""))),
      por_rango_edad: contar(filasUsuario.map((fila) => String(fila.rango_edad ?? ""))),
      por_interes: contar(filasUsuario.map((fila) => String(fila.interes_principal ?? ""))),
      ciudades_con_consentimiento: contar(
        filasUsuario
          .filter((fila) => fila.consentimiento_datos === "si" && typeof fila.ciudad === "string" && fila.ciudad)
          .map((fila) => String(fila.ciudad)),
      ),
    };
    return NextResponse.json(cuerpo);
  } catch (error) {
    console.error(error);
    return jsonError(500, "No se pudo calcular la analítica.");
  }
}
