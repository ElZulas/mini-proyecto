/**
 * Modelo documental de COMMUNITY 360 en Cloud Firestore.
 *
 * Colecciones de primer nivel. El id del documento es el id de negocio
 * y también viaja dentro del documento.
 *
 *   usuarios/{id_usuario}
 *   interacciones/{id_interaccion}   referencia lógica: id_usuario
 *   cuarentena/{id_interaccion}      misma forma + motivo y fecha
 *
 * Embebido: `etiquetas` (arreglo de 0 a 3 cadenas).
 * Referencia: `interacciones.id_usuario` → `usuarios/{id_usuario}`.
 * La bitácora `etl_log.json` no es colección.
 *
 * MarcaDeTiempo es el instante UTC que Firestore guarda como Timestamp.
 */

export const COLECCIONES = {
  usuarios: "usuarios",
  interacciones: "interacciones",
  cuarentena: "cuarentena",
} as const;

export type NombreColeccion = (typeof COLECCIONES)[keyof typeof COLECCIONES];

export interface MarcaDeTiempo {
  readonly seconds: number;
  readonly nanoseconds: number;
}

export type Estatus = "activo" | "en_riesgo" | "inactivo";
export type Consentimiento = "si" | "no";
export type RangoEdad = "18-24" | "25-31" | "32-38" | "39+";
export type Plataforma =
  | "Telegram"
  | "Facebook"
  | "TikTok"
  | "Instagram"
  | "Twitter/X"
  | "Discord";
export type Canal = Plataforma;
export type TipoInteraccion =
  | "mensaje"
  | "comentario"
  | "reaccion"
  | "respuesta_encuesta"
  | "rsvp_evento";
export type Tema =
  | "arte_comisiones"
  | "reglas_moderacion"
  | "eventos_convenciones"
  | "videojuegos"
  | "memes_humor"
  | "fursuits"
  | "seguridad_privacidad"
  | "musica";
export type Dispositivo = "Android" | "iOS" | "Web" | "Escritorio";
export type Etiqueta =
  | "humor"
  | "evento"
  | "aviso"
  | "arte"
  | "musica"
  | "reglas"
  | "juegos";
export type EspecieFursona =
  | "Zorro"
  | "Perro"
  | "Lobo"
  | "Gato"
  | "Híbrido/Otro"
  | "Dragón"
  | "Husky"
  | "Coyote"
  | "Conejo"
  | "Reptil"
  | "Ave"
  | "Tigre";
export type InteresPrincipal =
  | "Arte digital"
  | "Videojuegos"
  | "Convenciones"
  | "Streaming/Contenido"
  | "Arte tradicional"
  | "Cómics"
  | "Fursuit"
  | "Música"
  | "Escritura/Historias"
  | "Cosplay";
export type Pais =
  | "México"
  | "Argentina"
  | "Colombia"
  | "Estados Unidos"
  | "Perú"
  | "Chile"
  | "España";
export type MotivoRechazo = "id_usuario_inexistente" | "tipo_invalido";

interface UsuarioComun {
  id_usuario: string;
  alias: string;
  fecha_ingreso: MarcaDeTiempo;
  rango_edad: RangoEdad;
  especie_fursona: EspecieFursona;
  interes_principal: InteresPrincipal;
  plataforma_principal: Plataforma;
  es_artista: boolean;
  mensajes_30d: number;
  reacciones_30d: number;
  eventos_asistidos: number;
  comisiones_compradas: number;
  sentimiento_promedio: number;
  ultima_actividad: MarcaDeTiempo;
  estatus: Estatus;
}

/** Consentimiento `si`. Latitud y longitud pueden faltar; el resto geográfico viene. */
export interface UsuarioConGeo extends UsuarioComun {
  consentimiento_datos: "si";
  pais: Pais;
  estado: string;
  ciudad: string;
  latitud: number | null;
  longitud: number | null;
  zona_horaria: string;
}

/** Consentimiento `no`. Los seis campos que infieren ubicación quedan en null. */
export interface UsuarioSinGeo extends UsuarioComun {
  consentimiento_datos: "no";
  pais: null;
  estado: null;
  ciudad: null;
  latitud: null;
  longitud: null;
  zona_horaria: null;
}

export type Usuario = UsuarioConGeo | UsuarioSinGeo;

export interface Interaccion {
  id_interaccion: string;
  /** Referencia a `usuarios/{id_usuario}`. El documento solo existe si el padre está en el padrón. */
  id_usuario: string;
  timestamp: MarcaDeTiempo;
  canal: Canal;
  tipo: TipoInteraccion;
  /** Null únicamente cuando `tipo` es `reaccion`. */
  texto: string | null;
  tema: Tema;
  sentimiento: number;
  idioma: "es";
  /** Null si el autor no consiente o si la fuente llegó vacía. */
  pais: Pais | null;
  estado: string | null;
  ciudad: string | null;
  dispositivo: Dispositivo;
  longitud_texto: number;
  reacciones_recibidas: number;
  /** Embebido. Arreglo vacío si el CSV no trae etiquetas. */
  etiquetas: Etiqueta[];
}

export interface Cuarentena {
  id_interaccion: string;
  /** Folio recibido. Puede no existir en `usuarios`. */
  id_usuario: string;
  timestamp: MarcaDeTiempo | null;
  canal: Canal | null;
  tipo: TipoInteraccion | null;
  texto: string | null;
  tema: Tema | null;
  sentimiento: number | null;
  idioma: "es" | null;
  /** Se conserva el valor de origen. No se anula por consentimiento. */
  pais: Pais | null;
  estado: string | null;
  ciudad: string | null;
  dispositivo: Dispositivo | null;
  longitud_texto: number | null;
  reacciones_recibidas: number | null;
  etiquetas: Etiqueta[];
  motivo_rechazo: MotivoRechazo;
  fecha_cuarentena: MarcaDeTiempo;
}

export type DocumentoFirestore = Usuario | Interaccion | Cuarentena;

const CAMPOS_GEO_USUARIO = [
  "pais",
  "estado",
  "ciudad",
  "latitud",
  "longitud",
  "zona_horaria",
] as const;

const CAMPOS_GEO_INTERACCION = ["pais", "estado", "ciudad"] as const;

export function rutaUsuario(idUsuario: string): string {
  return `${COLECCIONES.usuarios}/${idUsuario}`;
}

export function rutaInteraccion(idInteraccion: string): string {
  return `${COLECCIONES.interacciones}/${idInteraccion}`;
}

export function rutaCuarentena(idInteraccion: string): string {
  return `${COLECCIONES.cuarentena}/${idInteraccion}`;
}

/** La carga aplica esto antes de escribir `usuarios/{id}`. */
export function geoDeUsuarioPermitida(usuario: Usuario): boolean {
  if (usuario.consentimiento_datos === "si") {
    return true;
  }
  return CAMPOS_GEO_USUARIO.every((campo) => usuario[campo] === null);
}

/** La carga aplica esto a un evento cuyo autor tiene consentimiento `no`. */
export function geoDeInteraccionPermitida(
  interaccion: Interaccion,
  consentimientoAutor: Consentimiento,
): boolean {
  if (consentimientoAutor === "si") {
    return true;
  }
  return CAMPOS_GEO_INTERACCION.every((campo) => interaccion[campo] === null);
}
