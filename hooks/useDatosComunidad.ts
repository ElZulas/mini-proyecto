"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase-client";
import { etiquetaLegible } from "@/lib/etiquetas-ui";

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

function iso(valor: unknown): string | null {
  if (valor && typeof valor === "object" && "toDate" in valor && typeof (valor as { toDate: () => Date }).toDate === "function") {
    return (valor as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof valor === "string" ? valor : null;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

export function useUsuarios() {
  const [filas, setFilas] = useState<UsuarioDetalle[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "usuarios"),
      (consulta) => {
        setFilas(
          consulta.docs.map((doc) => {
            const fila = doc.data();
            const consentimiento = String(fila.consentimiento_datos ?? "");
            return {
              id_usuario: doc.id,
              alias: String(fila.alias ?? ""),
              estatus: String(fila.estatus ?? ""),
              consentimiento_datos: consentimiento,
              rango_edad: String(fila.rango_edad ?? ""),
              interes_principal: String(fila.interes_principal ?? ""),
              plataforma_principal: String(fila.plataforma_principal ?? ""),
              especie_fursona: String(fila.especie_fursona ?? ""),
              ciudad: consentimiento === "si" ? texto(fila.ciudad) : null,
              pais: consentimiento === "si" ? texto(fila.pais) : null,
              es_artista: Boolean(fila.es_artista),
              mensajes_30d: numero(fila.mensajes_30d),
              reacciones_30d: numero(fila.reacciones_30d),
              sentimiento_promedio: numero(fila.sentimiento_promedio),
            };
          }),
        );
      },
      () => setError("No se pudieron cargar los miembros."),
    );
  }, []);

  return { filas, error };
}

export function useInteracciones() {
  const [filas, setFilas] = useState<InteraccionDetalle[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "interacciones"),
      (consulta) => {
        setFilas(
          consulta.docs.map((doc) => {
            const fila = doc.data();
            return {
              id_interaccion: doc.id,
              id_usuario: String(fila.id_usuario ?? ""),
              timestamp: iso(fila.timestamp),
              canal: String(fila.canal ?? ""),
              tipo: String(fila.tipo ?? ""),
              tema: String(fila.tema ?? ""),
              texto: texto(fila.texto),
              sentimiento: numero(fila.sentimiento),
              dispositivo: String(fila.dispositivo ?? ""),
              ciudad: texto(fila.ciudad),
            };
          }),
        );
      },
      () => setError("No se pudieron cargar las interacciones."),
    );
  }, []);

  return { filas, error };
}

export function useCuarentena() {
  const [filas, setFilas] = useState<CuarentenaDetalle[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "cuarentena"),
      (consulta) => {
        setFilas(
          consulta.docs.map((doc) => {
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
          }),
        );
      },
      () => setError("No se pudo cargar la revisión."),
    );
  }, []);

  return { filas, error };
}

export function motivoLegible(motivo: string): string {
  if (motivo === "id_usuario_inexistente") return "Usuario no encontrado en el padrón";
  if (motivo === "tipo_invalido") return "Tipo de dato inválido";
  return etiquetaLegible(motivo);
}
