/** Etiquetas legibles para pantallas. Los valores internos de Firestore no cambian. */

const TEMAS: Record<string, string> = {
  arte_comisiones: "Arte y comisiones",
  reglas_moderacion: "Reglas y moderación",
  eventos_convenciones: "Eventos y convenciones",
  videojuegos: "Videojuegos",
  memes_humor: "Memes y humor",
  fursuits: "Fursuits",
  seguridad_privacidad: "Seguridad y privacidad",
  musica: "Música",
};

const TIPOS: Record<string, string> = {
  mensaje: "Mensaje",
  comentario: "Comentario",
  reaccion: "Reacción",
  respuesta_encuesta: "Respuesta a encuesta",
  rsvp_evento: "Confirmación de evento",
};

const ESTATUS: Record<string, string> = {
  en_riesgo: "En riesgo",
  activo: "Activos",
  inactivo: "Inactivos",
};

function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Convierte snake_case o claves crudas a una etiqueta presentable. */
export function etiquetaLegible(valor: string): string {
  const conocido = TEMAS[valor] ?? TIPOS[valor] ?? ESTATUS[valor];
  if (conocido) return conocido;
  return capitalizar(valor.replaceAll("_", " "));
}

export function conEtiqueta<T extends { clave: string; total: number }>(puntos: T[]): Array<T & { etiqueta: string }> {
  return puntos.map((punto) => ({ ...punto, etiqueta: etiquetaLegible(punto.clave) }));
}
