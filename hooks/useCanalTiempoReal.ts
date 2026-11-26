"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { CANAL_INTERACCION, type EventoInteraccion } from "@/lib/eventos-tiempo-real";

export type EstadoSocket = "conectando" | "conectado" | "desconectado";

/**
 * Capa de red: abre el WebSocket (Socket.io) hacia /socket.io.
 * Recibe los eventos que la API emite tras POST/PATCH/DELETE.
 */
export function useCanalTiempoReal(activo: boolean) {
  const [estado, setEstado] = useState<EstadoSocket>("desconectado");
  const [eventos, setEventos] = useState<EventoInteraccion[]>([]);
  const [ultimo, setUltimo] = useState<EventoInteraccion | null>(null);

  useEffect(() => {
    if (!activo) {
      return;
    }
    // En Vercel no hay server.mjs; el tiempo real del dashboard sigue con onSnapshot.
    if (process.env.NEXT_PUBLIC_SOCKET_IO === "0") {
      setEstado("desconectado");
      return;
    }
    setEstado("conectando");
    const socket: Socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 3,
    });

    socket.on("connect", () => setEstado("conectado"));
    socket.on("disconnect", () => setEstado("desconectado"));
    socket.on("connect_error", () => setEstado("desconectado"));
    socket.on(CANAL_INTERACCION, (evento: EventoInteraccion) => {
      setUltimo(evento);
      setEventos((previos) => [evento, ...previos].slice(0, 12));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [activo]);

  return { estado, eventos, ultimo };
}
