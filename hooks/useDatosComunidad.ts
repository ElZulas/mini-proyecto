"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { etiquetaLegible } from "@/lib/etiquetas-ui";
import { db } from "@/lib/firebase-client";

export interface UsuarioDetalle {
  id_usuario: string;
  alias: string;
  estatus: string;
  consentimiento_datos: string;
  rango_edad: string;
  interes_principal: string;
  plataforma_principal: string;
  especie_fursona: string;
  ciudad: string | null;
  pais: string | null;
  es_artista: boolean;
  mensajes_30d: number;
  reacciones_30d: number;
  sentimiento_promedio: number;
}

export interface InteraccionDetalle {
  id_interaccion: string;
  id_usuario: string;
  timestamp: string | null;
  canal: string;
  tipo: string;
  tema: string;
  texto: string | null;
  sentimiento: number;
  dispositivo: string;
  ciudad: string | null;
}

export interface CuarentenaDetalle {
  id_interaccion: string;
  id_usuario: string;
  motivo_rechazo: string;
  fecha_cuarentena: string | null;
  canal: string | null;
  tipo: string | null;
  tema: string | null;
  texto: string | null;
}

/** Escucha solo agregados/panel (1 doc) y vuelve a pedir listas por API. */
function useVersionAgregado(alCambiar: () => void) {
  useEffect(() => {
    if (!db) return;
    let primera = true;
    return onSnapshot(doc(db, "agregados", "panel"), () => {
      if (primera) {
        primera = false;
        return;
      }
      alCambiar();
    });
  }, [alCambiar]);
}

export function useUsuarios(filtros?: { estatus?: string; consentimiento?: string }) {
  const [filas, setFilas] = useState<UsuarioDetalle[]>([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtros?.estatus) params.set("estatus", filtros.estatus);
      if (filtros?.consentimiento) params.set("consentimiento", filtros.consentimiento);
      const qs = params.toString();
      const res = await fetch(`/api/usuarios${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { usuarios: UsuarioDetalle[] };
      setFilas(data.usuarios);
      setError("");
    } catch {
      setError("No se pudieron cargar los miembros.");
    }
  }, [filtros?.estatus, filtros?.consentimiento]);

  useEffect(() => {
    void cargar();
  }, [cargar]);
  useVersionAgregado(cargar);

  return { filas, error };
}

export function useInteracciones() {
  const [filas, setFilas] = useState<InteraccionDetalle[]>([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/interacciones?limite=500", { cache: "no-store" });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { interacciones: InteraccionDetalle[] };
      setFilas(
        data.interacciones.map((fila) => ({
          ...fila,
          dispositivo: fila.dispositivo ?? "",
        })),
      );
      setError("");
    } catch {
      setError("No se pudieron cargar las interacciones.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);
  useVersionAgregado(cargar);

  return { filas, error };
}

export function useCuarentena() {
  const [filas, setFilas] = useState<CuarentenaDetalle[]>([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/cuarentena", { cache: "no-store" });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { cuarentena: CuarentenaDetalle[] };
      setFilas(data.cuarentena);
      setError("");
    } catch {
      setError("No se pudo cargar la revisión.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);
  useVersionAgregado(cargar);

  return { filas, error };
}

export function motivoLegible(motivo: string): string {
  if (motivo === "id_usuario_inexistente") return "Usuario no encontrado en el padrón";
  if (motivo === "tipo_invalido") return "Tipo de dato inválido";
  return etiquetaLegible(motivo);
}
