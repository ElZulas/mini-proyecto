"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import type { CeldaCalor, PanelAgregado } from "@/lib/agregar-panel";
import { db } from "@/lib/firebase-client";
import type { InteraccionViva } from "@/lib/tipos";
import type { Punto } from "@/lib/kpis";

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

/** 1 lectura inicial + 1 por cambio del doc. Sustituye 3 listeners de colección. */
export function usePanelAgregado() {
  const [panel, setPanel] = useState<PanelAgregado>(vacio);
  const [vivo, setVivo] = useState(false);
  const [error, setError] = useState("");
  const [pulso, setPulso] = useState(0);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      doc(db, "agregados", "panel"),
      (snap) => {
        if (!snap.exists()) {
          setError("Falta el agregado del panel. Ejecuta el rebuild.");
          return;
        }
        const data = snap.data();
        setVivo(true);
        setPulso(Date.now());
        setError("");
        setPanel({
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
        });
      },
      () => setError("No se pudo leer el agregado del panel."),
    );
  }, []);

  return { panel, vivo, error, pulso };
}
