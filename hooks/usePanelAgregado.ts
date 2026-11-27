"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import type { CeldaCalor, PanelAgregado } from "@/lib/agregar-panel";
import { auth, db } from "@/lib/firebase-client";
import type { Punto } from "@/lib/kpis";
import type { InteraccionViva } from "@/lib/tipos";

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

/** 1 lectura del doc agregado. Espera Auth antes de suscribirse (evita fallo de permisos → foquito rojo). */
export function usePanelAgregado() {
  const [panel, setPanel] = useState<PanelAgregado>(vacio);
  const [vivo, setVivo] = useState(false);
  const [error, setError] = useState("");
  const [pulso, setPulso] = useState(0);

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
          setPanel(desdeData(snap.data() as Record<string, unknown>));
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

  return { panel, vivo, error, pulso };
}
