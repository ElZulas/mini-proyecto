import { Timestamp, type DocumentData } from "firebase-admin/firestore";

function aIso(valor: unknown): string | null {
  if (valor instanceof Timestamp) {
    return valor.toDate().toISOString();
  }
  if (typeof valor === "string") {
    return valor;
  }
  return null;
}

export function serializar(id: string, data: DocumentData) {
  return {
    id_interaccion: id,
    id_usuario: data.id_usuario ?? null,
    timestamp: aIso(data.timestamp),
    canal: data.canal ?? null,
    tipo: data.tipo ?? null,
    texto: data.texto ?? null,
    tema: data.tema ?? null,
    sentimiento: data.sentimiento ?? null,
    idioma: data.idioma ?? null,
    pais: data.pais ?? null,
    estado: data.estado ?? null,
    ciudad: data.ciudad ?? null,
    dispositivo: data.dispositivo ?? null,
    longitud_texto: data.longitud_texto ?? null,
    reacciones_recibidas: data.reacciones_recibidas ?? null,
    etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : [],
  };
}
