import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { contar, promedio, tasaRiesgo, type Punto } from "@/lib/kpis";
import type { Analitica, InteraccionViva } from "@/lib/tipos";

export const COLECCION_AGREGADOS = "agregados";
export const DOC_PANEL = "panel";

export interface CeldaCalor {
  tema: string;
  canal: string;
  total: number;
}

export interface PanelAgregado extends Analitica {
  version: number;
  actualizado_en: string;
  recientes: InteraccionViva[];
  calor: CeldaCalor[];
}

function iso(valor: unknown): string | null {
  if (valor && typeof valor === "object" && "toDate" in valor && typeof (valor as { toDate: () => Date }).toDate === "function") {
    return (valor as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof valor === "string" && valor.trim()) return valor;
  return null;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function mapearInteraccion(id: string, fila: DocumentData): InteraccionViva {
  return {
    id_interaccion: id,
    id_usuario: String(fila.id_usuario ?? ""),
    timestamp: iso(fila.timestamp),
    canal: String(fila.canal ?? ""),
    tipo: String(fila.tipo ?? ""),
    tema: String(fila.tema ?? ""),
    texto: texto(fila.texto),
    sentimiento: numero(fila.sentimiento),
    ciudad: texto(fila.ciudad),
  };
}

/** Recalcula el documento único del panel. 1 escritura; evita N listeners en el cliente. */
export async function reconstruirPanelAgregado(): Promise<PanelAgregado> {
  const db = adminDb();
  const [usuarios, interacciones, cuarentena] = await Promise.all([
    db.collection("usuarios").get(),
    db.collection("interacciones").get(),
    db.collection("cuarentena").get(),
  ]);

  const filasUsuario = usuarios.docs.map((doc) => doc.data());
  const filasInteraccion = interacciones.docs.map((doc) => mapearInteraccion(doc.id, doc.data()));
  const enRiesgo = filasUsuario.filter((fila) => fila.estatus === "en_riesgo").length;

  const mapaCalor = new Map<string, number>();
  for (const fila of filasInteraccion) {
    const clave = `${fila.tema}|${fila.canal}`;
    mapaCalor.set(clave, (mapaCalor.get(clave) ?? 0) + 1);
  }

  const analitica: Analitica = {
    usuarios: filasUsuario.length,
    interacciones: filasInteraccion.length,
    cuarentena: cuarentena.size,
    sin_consentimiento: filasUsuario.filter((fila) => fila.consentimiento_datos === "no").length,
    sentimiento_promedio: promedio(filasInteraccion.map((fila) => fila.sentimiento)),
    tasa_riesgo: tasaRiesgo(enRiesgo, filasUsuario.length),
    por_canal: contar(filasInteraccion.map((fila) => fila.canal)),
    por_tipo: contar(filasInteraccion.map((fila) => fila.tipo)),
    por_tema: contar(filasInteraccion.map((fila) => fila.tema)),
    por_estatus: contar(filasUsuario.map((fila) => String(fila.estatus ?? ""))),
    por_rango_edad: contar(filasUsuario.map((fila) => String(fila.rango_edad ?? ""))),
    por_interes: contar(filasUsuario.map((fila) => String(fila.interes_principal ?? ""))),
    ciudades_con_consentimiento: contar(
      filasUsuario
        .filter((fila) => fila.consentimiento_datos === "si" && typeof fila.ciudad === "string" && fila.ciudad)
        .map((fila) => String(fila.ciudad)),
    ),
  };

  const recientes = [...filasInteraccion]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, 8);

  const calor: CeldaCalor[] = [...mapaCalor.entries()].map(([clave, total]) => {
    const [tema, canal] = clave.split("|");
    return { tema: tema ?? "", canal: canal ?? "", total };
  });

  const previo = await db.collection(COLECCION_AGREGADOS).doc(DOC_PANEL).get();
  const version = (typeof previo.data()?.version === "number" ? previo.data()!.version : 0) + 1;
  const actualizado_en = new Date().toISOString();

  const cuerpo: PanelAgregado = {
    ...analitica,
    version,
    actualizado_en,
    recientes,
    calor,
  };

  await db.collection(COLECCION_AGREGADOS).doc(DOC_PANEL).set({
    ...cuerpo,
    _server: FieldValue.serverTimestamp(),
  });

  return cuerpo;
}

export async function leerPanelAgregado(): Promise<PanelAgregado | null> {
  const doc = await adminDb().collection(COLECCION_AGREGADOS).doc(DOC_PANEL).get();
  if (!doc.exists) return null;
  const data = doc.data() ?? {};
  return {
    usuarios: numero(data.usuarios),
    interacciones: numero(data.interacciones),
    cuarentena: numero(data.cuarentena),
    sin_consentimiento: numero(data.sin_consentimiento),
    sentimiento_promedio: typeof data.sentimiento_promedio === "number" ? data.sentimiento_promedio : null,
    tasa_riesgo: typeof data.tasa_riesgo === "number" ? data.tasa_riesgo : null,
    por_canal: (data.por_canal as Punto[]) ?? [],
    por_tipo: (data.por_tipo as Punto[]) ?? [],
    por_tema: (data.por_tema as Punto[]) ?? [],
    por_estatus: (data.por_estatus as Punto[]) ?? [],
    por_rango_edad: (data.por_rango_edad as Punto[]) ?? [],
    por_interes: (data.por_interes as Punto[]) ?? [],
    ciudades_con_consentimiento: (data.ciudades_con_consentimiento as Punto[]) ?? [],
    version: numero(data.version),
    actualizado_en: typeof data.actualizado_en === "string" ? data.actualizado_en : new Date().toISOString(),
    recientes: Array.isArray(data.recientes) ? (data.recientes as InteraccionViva[]) : [],
    calor: Array.isArray(data.calor) ? (data.calor as CeldaCalor[]) : [],
  };
}
