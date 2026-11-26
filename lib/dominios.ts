export const CANALES = ["Telegram", "Facebook", "TikTok", "Instagram", "Twitter/X", "Discord"] as const;
export const TIPOS = ["mensaje", "comentario", "reaccion", "respuesta_encuesta", "rsvp_evento"] as const;
export const TEMAS = [
  "arte_comisiones",
  "reglas_moderacion",
  "eventos_convenciones",
  "videojuegos",
  "memes_humor",
  "fursuits",
  "seguridad_privacidad",
  "musica",
] as const;
export const DISPOSITIVOS = ["Android", "iOS", "Web", "Escritorio"] as const;
export const ETIQUETAS = ["humor", "evento", "aviso", "arte", "musica", "reglas", "juegos"] as const;

export type Canal = (typeof CANALES)[number];
export type TipoInteraccion = (typeof TIPOS)[number];
export type Tema = (typeof TEMAS)[number];
export type Dispositivo = (typeof DISPOSITIVOS)[number];
export type Etiqueta = (typeof ETIQUETAS)[number];
