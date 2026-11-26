import {
  CANALES,
  DISPOSITIVOS,
  ETIQUETAS,
  TEMAS,
  TIPOS,
  type Canal,
  type Dispositivo,
  type Etiqueta,
  type Tema,
  type TipoInteraccion,
} from "@/lib/dominios";

export interface InteraccionValida {
  id_interaccion: string;
  id_usuario: string;
  timestamp: string;
  canal: Canal;
  tipo: TipoInteraccion;
  texto: string | null;
  tema: Tema;
  sentimiento: number;
  idioma: "es";
  pais: string | null;
  estado: string | null;
  ciudad: string | null;
  dispositivo: Dispositivo;
  longitud_texto: number;
  reacciones_recibidas: number;
  etiquetas: Etiqueta[];
}

const CAMPOS = [
  "id_interaccion",
  "id_usuario",
  "timestamp",
  "canal",
  "tipo",
  "texto",
  "tema",
  "sentimiento",
  "idioma",
  "pais",
  "estado",
  "ciudad",
  "dispositivo",
  "longitud_texto",
  "reacciones_recibidas",
  "etiquetas",
] as const;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoOpcional(valor: unknown): string | null | undefined {
  if (valor === null) {
    return null;
  }
  if (typeof valor !== "string") {
    return undefined;
  }
  const limpio = valor.trim();
  return limpio.length === 0 ? null : limpio;
}

function enLista<T extends string>(valor: unknown, lista: readonly T[]): T | undefined {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor) ? (valor as T) : undefined;
}

function entero(valor: unknown): number | undefined {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0) {
    return undefined;
  }
  return valor;
}

function validarCampos(entrada: Record<string, unknown>, exigirTodo: boolean): { errores: string[]; valor: Partial<InteraccionValida> } {
  const errores: string[] = [];
  const valor: Partial<InteraccionValida> = {};
  const presente = (campo: string) => Object.prototype.hasOwnProperty.call(entrada, campo);

  if (exigirTodo || presente("id_interaccion")) {
    const id = textoOpcional(entrada.id_interaccion);
    if (!id || !/^I\d{7}$/.test(id)) {
      errores.push("id_interaccion debe tener la forma I y 7 dígitos.");
    } else {
      valor.id_interaccion = id;
    }
  }
  if (exigirTodo || presente("id_usuario")) {
    const id = textoOpcional(entrada.id_usuario);
    if (!id || !/^U\d{6}$/.test(id)) {
      errores.push("id_usuario debe tener la forma U y 6 dígitos.");
    } else {
      valor.id_usuario = id;
    }
  }
  if (exigirTodo || presente("timestamp")) {
    const marca = textoOpcional(entrada.timestamp);
    const fecha = marca ? new Date(marca) : null;
    if (!marca || !fecha || Number.isNaN(fecha.getTime())) {
      errores.push("timestamp debe ser una fecha ISO-8601.");
    } else {
      valor.timestamp = fecha.toISOString();
    }
  }
  if (exigirTodo || presente("canal")) {
    const canal = enLista(entrada.canal, CANALES);
    if (!canal) {
      errores.push("canal no pertenece al catálogo.");
    } else {
      valor.canal = canal;
    }
  }
  if (exigirTodo || presente("tipo")) {
    const tipo = enLista(entrada.tipo, TIPOS);
    if (!tipo) {
      errores.push("tipo no pertenece al catálogo.");
    } else {
      valor.tipo = tipo;
    }
  }
  if (exigirTodo || presente("tema")) {
    const tema = enLista(entrada.tema, TEMAS);
    if (!tema) {
      errores.push("tema no pertenece al catálogo.");
    } else {
      valor.tema = tema;
    }
  }
  if (exigirTodo || presente("dispositivo")) {
    const dispositivo = enLista(entrada.dispositivo, DISPOSITIVOS);
    if (!dispositivo) {
      errores.push("dispositivo no pertenece al catálogo.");
    } else {
      valor.dispositivo = dispositivo;
    }
  }
  if (exigirTodo || presente("idioma")) {
    if (entrada.idioma !== "es") {
      errores.push("idioma debe ser es.");
    } else {
      valor.idioma = "es";
    }
  }
  if (exigirTodo || presente("sentimiento")) {
    const sentimiento = entrada.sentimiento;
    if (typeof sentimiento !== "number" || !Number.isFinite(sentimiento) || sentimiento < -1 || sentimiento > 1) {
      errores.push("sentimiento debe ser un número entre -1 y 1.");
    } else {
      valor.sentimiento = sentimiento;
    }
  }
  if (exigirTodo || presente("longitud_texto")) {
    const longitud = entero(entrada.longitud_texto);
    if (longitud === undefined) {
      errores.push("longitud_texto debe ser un entero mayor o igual que 0.");
    } else {
      valor.longitud_texto = longitud;
    }
  }
  if (exigirTodo || presente("reacciones_recibidas")) {
    const reacciones = entero(entrada.reacciones_recibidas);
    if (reacciones === undefined) {
      errores.push("reacciones_recibidas debe ser un entero mayor o igual que 0.");
    } else {
      valor.reacciones_recibidas = reacciones;
    }
  }
  for (const campo of ["pais", "estado", "ciudad", "texto"] as const) {
    if (exigirTodo || presente(campo)) {
      if (entrada[campo] === undefined && !exigirTodo) {
        continue;
      }
      const texto = textoOpcional(entrada[campo] ?? null);
      if (texto === undefined) {
        errores.push(`${campo} debe ser texto o null.`);
      } else {
        valor[campo] = texto;
      }
    }
  }
  if (exigirTodo || presente("etiquetas")) {
    const etiquetas = entrada.etiquetas;
    if (!Array.isArray(etiquetas) || etiquetas.length > 3) {
      errores.push("etiquetas debe ser un arreglo de 0 a 3 valores.");
    } else {
      const limpias: Etiqueta[] = [];
      for (const item of etiquetas) {
        const etiqueta = enLista(item, ETIQUETAS);
        if (!etiqueta || limpias.includes(etiqueta)) {
          errores.push("etiquetas contiene un valor repetido o fuera del catálogo.");
          break;
        }
        limpias.push(etiqueta);
      }
      if (errores.every((mensaje) => !mensaje.startsWith("etiquetas"))) {
        valor.etiquetas = limpias;
      }
    }
  }
  return { errores, valor };
}

export function validarAlta(entrada: unknown): { ok: true; valor: InteraccionValida } | { ok: false; errores: string[] } {
  if (!esRegistro(entrada)) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto JSON."] };
  }
  const cuerpo = Object.prototype.hasOwnProperty.call(entrada, "etiquetas") ? entrada : { ...entrada, etiquetas: [] };
  const { errores, valor } = validarCampos(cuerpo, true);
  const tipo = valor.tipo;
  if (tipo && tipo !== "reaccion" && !valor.texto) {
    errores.push("texto es obligatorio salvo cuando tipo es reaccion.");
  }
  if (errores.length > 0 || !completo(valor)) {
    return { ok: false, errores: errores.length > 0 ? errores : ["Faltan campos obligatorios."] };
  }
  return { ok: true, valor };
}

export function validarParcial(entrada: unknown): { ok: true; valor: Partial<InteraccionValida> } | { ok: false; errores: string[] } {
  if (!esRegistro(entrada)) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto JSON."] };
  }
  const campos = Object.keys(entrada).filter((campo) => (CAMPOS as readonly string[]).includes(campo) && campo !== "id_interaccion");
  if (campos.length === 0) {
    return { ok: false, errores: ["No hay campos modificables."] };
  }
  const recorte: Record<string, unknown> = {};
  for (const campo of campos) {
    recorte[campo] = entrada[campo];
  }
  const { errores, valor } = validarCampos(recorte, false);
  if (errores.length > 0) {
    return { ok: false, errores };
  }
  return { ok: true, valor };
}

function completo(valor: Partial<InteraccionValida>): valor is InteraccionValida {
  return (
    typeof valor.id_interaccion === "string" &&
    typeof valor.id_usuario === "string" &&
    typeof valor.timestamp === "string" &&
    typeof valor.canal === "string" &&
    typeof valor.tipo === "string" &&
    typeof valor.tema === "string" &&
    typeof valor.sentimiento === "number" &&
    valor.idioma === "es" &&
    typeof valor.dispositivo === "string" &&
    typeof valor.longitud_texto === "number" &&
    typeof valor.reacciones_recibidas === "number" &&
    Array.isArray(valor.etiquetas)
  );
}

export function anularGeo(valor: InteraccionValida): InteraccionValida {
  return { ...valor, pais: null, estado: null, ciudad: null };
}
