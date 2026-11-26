/**
 * Contrato del canal WebSocket (Socket.io).
 *
 * Capa BD: el cambio ocurre en Firestore vía la API REST.
 * Capa red: el servidor emite este evento por WebSocket a todos los clientes.
 * Capa UI: el dashboard lo pinta en el feed; los KPIs se recalculan con onSnapshot.
 */
export type TipoEventoInteraccion = "creada" | "modificada" | "eliminada";

export interface EventoInteraccion {
  tipo: TipoEventoInteraccion;
  id_interaccion: string;
  id_usuario?: string | null;
  canal?: string | null;
  tema?: string | null;
  via: "websocket";
  en: string;
}

export const CANAL_INTERACCION = "interaccion";
