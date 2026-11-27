"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import type { CeldaCalor, PanelAgregado } from "@/lib/agregar-panel";
import { auth, db } from "@/lib/firebase-client";
import type { Punto } from "@/lib/kpis";
import type { InteraccionViva } from "@/lib/tipos";

export interface AvisoPanel {
  id: string;
  tipo: "creada" | "modificada" | "eliminada" | "actualizada";
  id_interaccion: string | null;
  mensaje: string;
  en: string;
}

function vacio(): PanelAgregado {
  return {
    usuarios: 0,
    interacciones: 0,
    cuarentena: 0,
    sin_consentimiento: 0,
    sentimiento_promedio: null,
    tasa_riesgo: null,
    por_canal: [],
    por_tipo: [],
    por_tema: [],
    por_estatus: [],
    por_rango_edad: [],
    por_interes: [],
    ciudades_con_consentimiento: [],
    version: 0,
    actualizado_en: "",
    recientes: [],
    calor: [],
  };
}

function puntos(valor: unknown): Punto[] {
  return Array.isArray(valor) ? (valor as Punto[]) : [];
}

function desdeData(data: Record<string, unknown>): PanelAgregado {
  return {
    usuarios: Number(data.usuarios ?? 0),
    interacciones: Number(data.interacciones ?? 0),
    cuarentena: Number(data.cuarentena ?? 0),
    sin_consentimiento: Number(data.sin_consentimiento ?? 0),
    sentimiento_promedio: typeof data.sentimiento_promedio === "number" ? data.sentimiento_promedio : null,
    tasa_riesgo: typeof data.tasa_riesgo === "number" ? data.tasa_riesgo : null,
    por_canal: puntos(data.por_canal),
    por_tipo: puntos(data.por_tipo),
    por_tema: puntos(data.por_tema),
    por_estatus: puntos(data.por_estatus),
    por_rango_edad: puntos(data.por_rango_edad),
    por_interes: puntos(data.por_interes),
    ciudades_con_consentimiento: puntos(data.ciudades_con_consentimiento),
    version: Number(data.version ?? 0),
    actualizado_en: String(data.actualizado_en ?? ""),
    recientes: Array.isArray(data.recientes) ? (data.recientes as InteraccionViva[]) : [],
    calor: Array.isArray(data.calor) ? (data.calor as CeldaCalor[]) : [],
  };
}

function armarAviso(previo: PanelAgregado, actual: PanelAgregado): AvisoPanel {
  const en = new Date().toISOString();
  const top = actual.recientes[0]?.id_interaccion ?? null;
  if (actual.interacciones > previo.interacciones) {
    return {
      id: `${actual.version}-creada`,
      tipo: "creada",
      id_interaccion: top,
      mensaje: `Nueva interacción${top ? ` · ${top}` : ""}`,
      en,
    };
  }
  if (actual.interacciones < previo.interacciones) {
    return {
      id: `${actual.version}-eliminada`,
      tipo: "eliminada",
      id_interaccion: null,
      mensaje: "Interacción eliminada · el panel se actualizó",
      en,
    };
  }
  return {
    id: `${actual.version}-modificada`,
    tipo: "modificada",
    id_interaccion: top,
    mensaje: `Interacción actualizada${top ? ` · ${top}` : ""}`,
    en,
  };
}

/** 1 lectura del doc agregado + avisos visibles cuando Postman muta (sin WebSocket). */
export function usePanelAgregado() {
  const [panel, setPanel] = useState<PanelAgregado>(vacio);
  const [vivo, setVivo] = useState(false);
  const [error, setError] = useState("");
  const [pulso, setPulso] = useState(0);
  const [avisos, setAvisos] = useState<AvisoPanel[]>([]);
  const [ultimoAviso, setUltimoAviso] = useState<AvisoPanel | null>(null);
  const previoRef = useRef<PanelAgregado | null>(null);

  useEffect(() => {
    if (!db || !auth) return;

    let quitarSnap: (() => void) | undefined;
    const quitarAuth = onAuthStateChanged(auth, (usuario) => {
      quitarSnap?.();
      quitarSnap = undefined;
      if (!usuario || !db) return;

      quitarSnap = onSnapshot(
        doc(db, "agregados", "panel"),
        (snap) => {
          if (!snap.exists()) {
            setError("Falta el agregado del panel.");
            setVivo(false);
            return;
          }
          const siguiente = desdeData(snap.data() as Record<string, unknown>);
          const previo = previoRef.current;
          if (previo && siguiente.version !== previo.version) {
            const aviso = armarAviso(previo, siguiente);
            setUltimoAviso(aviso);
            setAvisos((lista) => [aviso, ...lista].slice(0, 12));
          }
          previoRef.current = siguiente;
          setPanel(siguiente);
          setVivo(true);
          setPulso(Date.now());
          setError("");
        },
        () => {
          setError("No se pudo leer el agregado del panel.");
          setVivo(false);
        },
      );
    });

    return () => {
      quitarAuth();
      quitarSnap?.();
    };
  }, []);

  return { panel, vivo, error, pulso, avisos, ultimoAviso };
}
