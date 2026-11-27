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

function ajustarPunto(lista: Punto[], clave: string, delta: number): Punto[] {
  const mapa = new Map(lista.map((p) => [p.clave, p.total]));
  mapa.set(clave, Math.max(0, (mapa.get(clave) ?? 0) + delta));
  return [...mapa.entries()]
    .filter(([, total]) => total > 0)
    .map(([k, total]) => ({ clave: k, total }))
    .sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave, "es"));
}

function ajustarCalor(lista: CeldaCalor[], tema: string, canal: string, delta: number): CeldaCalor[] {
  const mapa = new Map(lista.map((c) => [`${c.tema}|${c.canal}`, c.total]));
  const clave = `${tema}|${canal}`;
  mapa.set(clave, Math.max(0, (mapa.get(clave) ?? 0) + delta));
  return [...mapa.entries()]
    .filter(([, total]) => total > 0)
    .map(([claveComp, total]) => {
      const [t, c] = claveComp.split("|");
      return { tema: t ?? "", canal: c ?? "", total };
    });
}

function aViva(id: string, fila: DocumentData | InteraccionViva): InteraccionViva {
  if ("id_interaccion" in fila && typeof fila.canal === "string") {
    return {
      id_interaccion: String(fila.id_interaccion),
      id_usuario: String(fila.id_usuario ?? ""),
      timestamp: typeof fila.timestamp === "string" ? fila.timestamp : iso(fila.timestamp),
      canal: String(fila.canal ?? ""),
      tipo: String(fila.tipo ?? ""),
      tema: String(fila.tema ?? ""),
      texto: texto(fila.texto),
      sentimiento: numero(fila.sentimiento),
      ciudad: texto(fila.ciudad),
    };
  }
  return mapearInteraccion(id, fila as DocumentData);
}

/**
 * Actualiza el panel con 1 lectura + 1 escritura del doc agregado.
 * Evita el rebuild completo (~2k lecturas) en cada POST/PATCH/DELETE de Postman.
 */
export async function actualizarPanelPorInteraccion(opciones: {
  tipo: "creada" | "modificada" | "eliminada";
  nueva?: InteraccionViva | DocumentData;
  anterior?: InteraccionViva | DocumentData | null;
  id: string;
}): Promise<void> {
  let panel = await leerPanelAgregado();
  if (!panel) {
    await reconstruirPanelAgregado();
    return;
  }

  const nueva = opciones.nueva ? aViva(opciones.id, opciones.nueva) : null;
  const anterior = opciones.anterior ? aViva(opciones.id, opciones.anterior) : null;

  let interacciones = panel.interacciones;
  let por_canal = panel.por_canal;
  let por_tipo = panel.por_tipo;
  let por_tema = panel.por_tema;
  let calor = panel.calor;
  let recientes = [...panel.recientes];
  let sumaSent = (panel.sentimiento_promedio ?? 0) * panel.interacciones;

  if (opciones.tipo === "creada" && nueva) {
    interacciones += 1;
    por_canal = ajustarPunto(por_canal, nueva.canal, 1);
    por_tipo = ajustarPunto(por_tipo, nueva.tipo, 1);
    por_tema = ajustarPunto(por_tema, nueva.tema, 1);
    calor = ajustarCalor(calor, nueva.tema, nueva.canal, 1);
    sumaSent += nueva.sentimiento;
    recientes = [nueva, ...recientes.filter((r) => r.id_interaccion !== nueva.id_interaccion)].slice(0, 8);
  } else if (opciones.tipo === "eliminada" && anterior) {
    interacciones = Math.max(0, interacciones - 1);
    por_canal = ajustarPunto(por_canal, anterior.canal, -1);
    por_tipo = ajustarPunto(por_tipo, anterior.tipo, -1);
    por_tema = ajustarPunto(por_tema, anterior.tema, -1);
    calor = ajustarCalor(calor, anterior.tema, anterior.canal, -1);
    sumaSent -= anterior.sentimiento;
    recientes = recientes.filter((r) => r.id_interaccion !== anterior.id_interaccion);
  } else if (opciones.tipo === "modificada" && nueva && anterior) {
    por_canal = ajustarPunto(por_canal, anterior.canal, -1);
    por_canal = ajustarPunto(por_canal, nueva.canal, 1);
    por_tipo = ajustarPunto(por_tipo, anterior.tipo, -1);
    por_tipo = ajustarPunto(por_tipo, nueva.tipo, 1);
    por_tema = ajustarPunto(por_tema, anterior.tema, -1);
    por_tema = ajustarPunto(por_tema, nueva.tema, 1);
    calor = ajustarCalor(calor, anterior.tema, anterior.canal, -1);
    calor = ajustarCalor(calor, nueva.tema, nueva.canal, 1);
    sumaSent = sumaSent - anterior.sentimiento + nueva.sentimiento;
    recientes = [nueva, ...recientes.filter((r) => r.id_interaccion !== nueva.id_interaccion)].slice(0, 8);
  }

  const cuerpo: PanelAgregado = {
    ...panel,
    interacciones,
    por_canal,
    por_tipo,
    por_tema,
    calor,
    recientes,
    sentimiento_promedio: interacciones > 0 ? sumaSent / interacciones : null,
    version: panel.version + 1,
    actualizado_en: new Date().toISOString(),
  };

  await adminDb()
    .collection(COLECCION_AGREGADOS)
    .doc(DOC_PANEL)
    .set({ ...cuerpo, _server: FieldValue.serverTimestamp() });
}
