import type { Server as IOServer } from "socket.io";

import { CANAL_INTERACCION, type EventoInteraccion } from "@/lib/eventos-tiempo-real";

declare global {
  // eslint-disable-next-line no-var
  var __community360_io: IOServer | undefined;
}

export function registrarIO(io: IOServer): void {
  globalThis.__community360_io = io;
}

export function obtenerIO(): IOServer | undefined {
  return globalThis.__community360_io;
}

/** Publica el cambio de una interacción a todos los clientes suscritos. */
export function emitirInteraccion(evento: Omit<EventoInteraccion, "via" | "en"> & { en?: string }): void {
  const io = obtenerIO();
  if (!io) {
    return;
  }
  const cuerpo: EventoInteraccion = {
    ...evento,
    via: "websocket",
    en: evento.en ?? new Date().toISOString(),
  };
  io.emit(CANAL_INTERACCION, cuerpo);
}
