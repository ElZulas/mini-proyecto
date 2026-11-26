#!/usr/bin/env python3
"""ETL reproducible de la Fase 2, COMMUNITY 360.

Lee los dos CSV originales, aplica las ocho etapas y escribe la auditoría en
data/procesados/. La carga a Firestore solo ocurre sin --dry-run y lee las
credenciales de .env.local o del entorno. No hay secretos en este archivo.

Uso:
  python scripts/etl_fase2.py --dry-run
  python scripts/etl_fase2.py
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
# En este equipo Sophos intercepta HTTPS. gRPC no usa el almacén de Windows,
# así que si existe el paquete local se toma antes de abrir Firestore.
_CA_BUNDLE = ROOT / ".certs" / "roots-con-sophos.pem"
if _CA_BUNDLE.is_file():
    os.environ.setdefault("GRPC_DEFAULT_SSL_ROOTS_FILE_PATH", str(_CA_BUNDLE))
    os.environ.setdefault("SSL_CERT_FILE", str(_CA_BUNDLE))
    os.environ.setdefault("REQUESTS_CA_BUNDLE", str(_CA_BUNDLE))
CSV_USUARIOS = ROOT / "comunidad_virtual_usuarios.csv"
CSV_INTERACCIONES = ROOT / "comunidad_virtual_1000_interacciones.csv"
SALIDA = ROOT / "data" / "procesados"
ENV_LOCAL = ROOT / ".env.local"

CAMPOS_GEO_USUARIO = ("pais", "estado", "ciudad", "latitud", "longitud", "zona_horaria")
CAMPOS_GEO_INTERACCION = ("pais", "estado", "ciudad")

COLUMNAS_USUARIO = [
    "id_usuario",
    "alias",
    "fecha_ingreso",
    "pais",
    "estado",
    "ciudad",
    "latitud",
    "longitud",
    "zona_horaria",
    "rango_edad",
    "especie_fursona",
    "interes_principal",
    "plataforma_principal",
    "es_artista",
    "mensajes_30d",
    "reacciones_30d",
    "eventos_asistidos",
    "comisiones_compradas",
    "sentimiento_promedio",
    "ultima_actividad",
    "estatus",
    "consentimiento_datos",
]
COLUMNAS_INTERACCION = [
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
]
COLUMNAS_CUARENTENA = COLUMNAS_INTERACCION + ["motivo_rechazo", "fecha_cuarentena"]

ESTATUS = ("activo", "en_riesgo", "inactivo")
CONSENTIMIENTO = ("si", "no")
RANGOS_EDAD = ("18-24", "25-31", "32-38", "39+")
PLATAFORMAS = ("Telegram", "Facebook", "TikTok", "Instagram", "Twitter/X", "Discord")
TIPOS = ("mensaje", "comentario", "reaccion", "respuesta_encuesta", "rsvp_evento")
TEMAS = (
    "arte_comisiones",
    "reglas_moderacion",
    "eventos_convenciones",
    "videojuegos",
    "memes_humor",
    "fursuits",
    "seguridad_privacidad",
    "musica",
)
DISPOSITIVOS = ("Android", "iOS", "Web", "Escritorio")
ETIQUETAS = ("humor", "evento", "aviso", "arte", "musica", "reglas", "juegos")
ESPECIES = (
    "Zorro",
    "Perro",
    "Lobo",
    "Gato",
    "Híbrido/Otro",
    "Dragón",
    "Husky",
    "Coyote",
    "Conejo",
    "Reptil",
    "Ave",
    "Tigre",
)
INTERESES = (
    "Arte digital",
    "Videojuegos",
    "Convenciones",
    "Streaming/Contenido",
    "Arte tradicional",
    "Cómics",
    "Fursuit",
    "Música",
    "Escritura/Historias",
    "Cosplay",
)
PAISES = ("México", "Argentina", "Colombia", "Estados Unidos", "Perú", "Chile", "España")
IDIOMAS = ("es",)

ENTEROS_USUARIO = (
    "mensajes_30d",
    "reacciones_30d",
    "eventos_asistidos",
    "comisiones_compradas",
)
PATRON_USUARIO = re.compile(r"U\d{6}")
PATRON_INTERACCION = re.compile(r"I\d{7}")


def ahora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def a_iso(momento: datetime) -> str:
    return momento.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def desde_iso(texto: str) -> datetime:
    return datetime.strptime(texto, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def canonico(dominio: tuple[str, ...]) -> dict[str, str]:
    return {valor.casefold(): valor for valor in dominio}


MAPAS = {
    "estatus": canonico(ESTATUS),
    "consentimiento_datos": canonico(CONSENTIMIENTO),
    "rango_edad": canonico(RANGOS_EDAD),
    "plataforma_principal": canonico(PLATAFORMAS),
    "canal": canonico(PLATAFORMAS),
    "tipo": canonico(TIPOS),
    "tema": canonico(TEMAS),
    "dispositivo": canonico(DISPOSITIVOS),
    "especie_fursona": canonico(ESPECIES),
    "interes_principal": canonico(INTERESES),
    "pais": canonico(PAISES),
    "idioma": canonico(IDIOMAS),
    "etiquetas": canonico(ETIQUETAS),
}


def leer_csv(ruta: Path) -> pd.DataFrame:
    if not ruta.is_file():
        raise SystemExit(f"No está el archivo de origen: {ruta.name}")
    marco = pd.read_csv(ruta, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    marco.columns = [str(columna).strip() for columna in marco.columns]
    return marco


def exigir_columnas(marco: pd.DataFrame, columnas: list[str], nombre: str) -> None:
    faltan = [columna for columna in columnas if columna not in marco.columns]
    if faltan:
        raise SystemExit(f"{nombre} no trae las columnas: {', '.join(faltan)}")


def texto_limpio(valor: object) -> str | None:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return None
    limpio = " ".join(str(valor).replace("\u00a0", " ").split())
    return limpio or None


def categoria(valor: str | None, mapa: dict[str, str]) -> str | None:
    if valor is None:
        return None
    return mapa.get(valor.casefold(), valor)


def etapa_1_duplicados(
    filas: list[dict[str, str]],
    campo_id: str,
    campo_extra: str | None = None,
) -> tuple[list[dict[str, str]], list[dict[str, object]]]:
    """Conserva la primera fila. El resto con el mismo id, o el mismo alias, sale."""
    vistos_id: set[str] = set()
    vistos_extra: set[str] = set()
    unicas: list[dict[str, str]] = []
    duplicadas: list[dict[str, object]] = []
    for fila in filas:
        identificador = (fila.get(campo_id) or "").strip()
        extra = (fila.get(campo_extra) or "").strip() if campo_extra else ""
        if identificador and identificador in vistos_id:
            duplicadas.append(
                {
                    "id": identificador,
                    "id_usuario": (fila.get("id_usuario") or "").strip(),
                    "motivo": f"{campo_id}_repetido",
                }
            )
            continue
        if extra and extra in vistos_extra:
            duplicadas.append(
                {
                    "id": identificador,
                    "id_usuario": (fila.get("id_usuario") or "").strip(),
                    "motivo": f"{campo_extra}_repetido",
                }
            )
            continue
        if identificador:
            vistos_id.add(identificador)
        if extra:
            vistos_extra.add(extra)
        unicas.append(fila)
    return unicas, duplicadas


def marcar_pares(filas: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, object]]]:
    """Deduplica interacciones por id_interaccion y por el par (id_usuario, id_interaccion)."""
    vistos_id: set[str] = set()
    vistos_par: set[tuple[str, str]] = set()
    unicas: list[dict[str, str]] = []
    duplicadas: list[dict[str, object]] = []
    for fila in filas:
        identificador = (fila.get("id_interaccion") or "").strip()
        usuario = (fila.get("id_usuario") or "").strip()
        par = (usuario, identificador)
        if identificador and identificador in vistos_id:
            motivo = "id_interaccion_repetido"
        elif identificador and par in vistos_par:
            motivo = "par_id_usuario_id_interaccion_repetido"
        else:
            motivo = ""
        if motivo:
            duplicadas.append({"id": identificador, "id_usuario": usuario, "motivo": motivo})
            continue
        if identificador:
            vistos_id.add(identificador)
            vistos_par.add(par)
        unicas.append(fila)
    return unicas, duplicadas


def etapa_2_nulos(filas: list[dict[str, str]], columnas: list[str]) -> tuple[list[dict[str, object]], dict[str, int]]:
    """Cadena vacía o solo espacios pasa a None. El conteo es por columna."""
    conteo = {columna: 0 for columna in columnas}
    salida: list[dict[str, object]] = []
    for fila in filas:
        nueva: dict[str, object] = {}
        for columna in columnas:
            limpio = texto_limpio(fila.get(columna))
            if limpio is None:
                conteo[columna] += 1
            nueva[columna] = limpio
        salida.append(nueva)
    return salida, conteo


def estandarizar_fecha(valor: object) -> object:
    if not isinstance(valor, str):
        return valor
    try:
        fecha = datetime.strptime(valor, "%d/%m/%Y")
    except ValueError:
        return valor
    return fecha.strftime("%Y-%m-%dT00:00:00Z")


def estandarizar_timestamp(valor: object) -> object:
    if not isinstance(valor, str):
        return valor
    try:
        datetime.strptime(valor, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return valor
    return valor


def a_etiquetas(valor: object) -> list[str]:
    if not isinstance(valor, str):
        return []
    mapa = MAPAS["etiquetas"]
    etiquetas: list[str] = []
    for parte in valor.split("|"):
        limpia = texto_limpio(parte)
        if limpia is None:
            continue
        etiquetas.append(mapa.get(limpia.casefold(), limpia))
    return etiquetas


def etapa_3_usuarios(filas: list[dict[str, object]]) -> list[dict[str, object]]:
    categoricas = (
        "estatus",
        "consentimiento_datos",
        "rango_edad",
        "plataforma_principal",
        "especie_fursona",
        "interes_principal",
        "pais",
    )
    for fila in filas:
        fila["fecha_ingreso"] = estandarizar_fecha(fila.get("fecha_ingreso"))
        fila["ultima_actividad"] = estandarizar_fecha(fila.get("ultima_actividad"))
        for campo in categoricas:
            fila[campo] = categoria(fila.get(campo) if isinstance(fila.get(campo), str) else None, MAPAS[campo])
    return filas


def etapa_3_interacciones(filas: list[dict[str, object]]) -> list[dict[str, object]]:
    for fila in filas:
        fila["timestamp"] = estandarizar_timestamp(fila.get("timestamp"))
        for campo in ("canal", "tipo", "tema", "dispositivo", "idioma", "pais"):
            actual = fila.get(campo)
            fila[campo] = categoria(actual if isinstance(actual, str) else None, MAPAS[campo])
        fila["etiquetas"] = a_etiquetas(fila.get("etiquetas"))
    return filas


def parse_entero_no_negativo(valor: object) -> tuple[int | None, str | None]:
    if not isinstance(valor, str) or not re.fullmatch(r"\d+", valor):
        return None, "entero_invalido"
    return int(valor), None


def parse_float(valor: object) -> tuple[float | None, str | None]:
    if not isinstance(valor, str):
        return None, "decimal_invalido"
    try:
        numero = float(valor)
    except ValueError:
        return None, "decimal_invalido"
    if numero != numero or numero in (float("inf"), float("-inf")):
        return None, "decimal_invalido"
    return numero, None


def parse_iso(valor: object) -> str | None:
    if not isinstance(valor, str):
        return None
    try:
        datetime.strptime(valor, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None
    return valor


def en_dominio(valor: object, permitidos: tuple[str, ...]) -> bool:
    return isinstance(valor, str) and valor in permitidos


def validar_usuario(fila: dict[str, object]) -> tuple[dict[str, object] | None, list[str]]:
    errores: list[str] = []
    identificador = fila.get("id_usuario")
    if not isinstance(identificador, str) or PATRON_USUARIO.fullmatch(identificador) is None:
        errores.append("id_usuario")
    if not isinstance(fila.get("alias"), str):
        errores.append("alias")
    fecha_ingreso = parse_iso(fila.get("fecha_ingreso"))
    ultima = parse_iso(fila.get("ultima_actividad"))
    if fecha_ingreso is None:
        errores.append("fecha_ingreso")
    if ultima is None:
        errores.append("ultima_actividad")
    if not en_dominio(fila.get("consentimiento_datos"), CONSENTIMIENTO):
        errores.append("consentimiento_datos")
    if not en_dominio(fila.get("rango_edad"), RANGOS_EDAD):
        errores.append("rango_edad")
    if not en_dominio(fila.get("especie_fursona"), ESPECIES):
        errores.append("especie_fursona")
    if not en_dominio(fila.get("interes_principal"), INTERESES):
        errores.append("interes_principal")
    if not en_dominio(fila.get("plataforma_principal"), PLATAFORMAS):
        errores.append("plataforma_principal")
    if not en_dominio(fila.get("estatus"), ESTATUS):
        errores.append("estatus")

    artista_crudo = fila.get("es_artista")
    es_artista: bool | None
    if artista_crudo == "1":
        es_artista = True
    elif artista_crudo == "0":
        es_artista = False
    else:
        es_artista = None
        errores.append("es_artista")

    enteros: dict[str, int] = {}
    for campo in ENTEROS_USUARIO:
        numero, fallo = parse_entero_no_negativo(fila.get(campo))
        if fallo or numero is None:
            errores.append(campo)
        else:
            enteros[campo] = numero
    sentimiento, fallo_sentimiento = parse_float(fila.get("sentimiento_promedio"))
    if fallo_sentimiento or sentimiento is None:
        errores.append("sentimiento_promedio")

    latitud, fallo_lat = (None, None) if fila.get("latitud") is None else parse_float(fila.get("latitud"))
    longitud, fallo_lon = (None, None) if fila.get("longitud") is None else parse_float(fila.get("longitud"))
    if fila.get("latitud") is not None and fallo_lat:
        errores.append("latitud")
    if fila.get("longitud") is not None and fallo_lon:
        errores.append("longitud")
    if (latitud is None) != (longitud is None):
        errores.append("coordenadas_incompletas")

    consiente = fila.get("consentimiento_datos") == "si"
    if consiente:
        if not en_dominio(fila.get("pais"), PAISES):
            errores.append("pais")
        for campo in ("estado", "ciudad", "zona_horaria"):
            if not isinstance(fila.get(campo), str):
                errores.append(campo)
    if errores or es_artista is None or sentimiento is None or fecha_ingreso is None or ultima is None:
        return None, errores or ["registro_invalido"]
    if not isinstance(identificador, str) or not isinstance(fila.get("alias"), str):
        return None, errores

    documento: dict[str, object] = {
        "id_usuario": identificador,
        "alias": fila["alias"],
        "fecha_ingreso": fecha_ingreso,
        "pais": fila.get("pais") if consiente else fila.get("pais"),
        "estado": fila.get("estado"),
        "ciudad": fila.get("ciudad"),
        "latitud": latitud,
        "longitud": longitud,
        "zona_horaria": fila.get("zona_horaria"),
        "rango_edad": fila["rango_edad"],
        "especie_fursona": fila["especie_fursona"],
        "interes_principal": fila["interes_principal"],
        "plataforma_principal": fila["plataforma_principal"],
        "es_artista": es_artista,
        "mensajes_30d": enteros["mensajes_30d"],
        "reacciones_30d": enteros["reacciones_30d"],
        "eventos_asistidos": enteros["eventos_asistidos"],
        "comisiones_compradas": enteros["comisiones_compradas"],
        "sentimiento_promedio": sentimiento,
        "ultima_actividad": ultima,
        "estatus": fila["estatus"],
        "consentimiento_datos": fila["consentimiento_datos"],
    }
    return documento, []


def validar_interaccion(fila: dict[str, object]) -> tuple[dict[str, object] | None, list[str]]:
    errores: list[str] = []
    identificador = fila.get("id_interaccion")
    usuario = fila.get("id_usuario")
    if not isinstance(identificador, str) or PATRON_INTERACCION.fullmatch(identificador) is None:
        errores.append("id_interaccion")
    if not isinstance(usuario, str) or PATRON_USUARIO.fullmatch(usuario) is None:
        errores.append("id_usuario")
    timestamp = parse_iso(fila.get("timestamp"))
    if timestamp is None:
        errores.append("timestamp")
    if not en_dominio(fila.get("canal"), PLATAFORMAS):
        errores.append("canal")
    if not en_dominio(fila.get("tipo"), TIPOS):
        errores.append("tipo")
    if not en_dominio(fila.get("tema"), TEMAS):
        errores.append("tema")
    if not en_dominio(fila.get("dispositivo"), DISPOSITIVOS):
        errores.append("dispositivo")
    if not en_dominio(fila.get("idioma"), IDIOMAS):
        errores.append("idioma")
    sentimiento, fallo = parse_float(fila.get("sentimiento"))
    if fallo or sentimiento is None:
        errores.append("sentimiento")
    longitud, fallo_long = parse_entero_no_negativo(fila.get("longitud_texto"))
    if fallo_long or longitud is None:
        errores.append("longitud_texto")
    reacciones, fallo_reac = parse_entero_no_negativo(fila.get("reacciones_recibidas"))
    if fallo_reac or reacciones is None:
        errores.append("reacciones_recibidas")

    tipo = fila.get("tipo")
    texto = fila.get("texto") if isinstance(fila.get("texto"), str) else None
    if tipo != "reaccion" and texto is None:
        errores.append("texto")

    etiquetas = fila.get("etiquetas")
    if not isinstance(etiquetas, list):
        errores.append("etiquetas")
        etiquetas_ok: list[str] = []
    else:
        etiquetas_ok = [item for item in etiquetas if isinstance(item, str)]
        if len(etiquetas_ok) != len(etiquetas) or any(item not in ETIQUETAS for item in etiquetas_ok):
            errores.append("etiquetas")
        if len(etiquetas_ok) > 3:
            errores.append("etiquetas")

    presentes = [fila.get(campo) is not None for campo in CAMPOS_GEO_INTERACCION]
    if any(presentes) and not all(presentes):
        errores.append("geografia_parcial")
    if all(presentes) and not en_dominio(fila.get("pais"), PAISES):
        errores.append("pais")
    if fila.get("estado") is not None and not isinstance(fila.get("estado"), str):
        errores.append("estado")
    if fila.get("ciudad") is not None and not isinstance(fila.get("ciudad"), str):
        errores.append("ciudad")

    if errores or timestamp is None or sentimiento is None or longitud is None or reacciones is None:
        return None, errores or ["registro_invalido"]
    if not isinstance(identificador, str) or not isinstance(usuario, str):
        return None, errores

    return {
        "id_interaccion": identificador,
        "id_usuario": usuario,
        "timestamp": timestamp,
        "canal": fila["canal"],
        "tipo": fila["tipo"],
        "texto": texto,
        "tema": fila["tema"],
        "sentimiento": sentimiento,
        "idioma": fila["idioma"],
        "pais": fila.get("pais") if all(presentes) else None,
        "estado": fila.get("estado") if all(presentes) else None,
        "ciudad": fila.get("ciudad") if all(presentes) else None,
        "dispositivo": fila["dispositivo"],
        "longitud_texto": longitud,
        "reacciones_recibidas": reacciones,
        "etiquetas": etiquetas_ok,
    }, []


def anular_geo_usuario(fila: dict[str, object]) -> bool:
    if fila.get("consentimiento_datos") != "no":
        return False
    for campo in CAMPOS_GEO_USUARIO:
        fila[campo] = None
    return True


def anular_geo_interaccion(fila: dict[str, object]) -> None:
    for campo in CAMPOS_GEO_INTERACCION:
        fila[campo] = None


def escribir_csv(ruta: Path, filas: list[dict[str, object]], columnas: list[str]) -> None:
    marco = pd.DataFrame(filas, columns=columnas)
    for columna in columnas:
        marco[columna] = marco[columna].map(serializar_celda)
    marco.to_csv(ruta, index=False, encoding="utf-8", quoting=csv.QUOTE_MINIMAL)


def serializar_celda(valor: object) -> str:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return ""
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, list):
        return json.dumps(valor, ensure_ascii=False)
    if isinstance(valor, float):
        return format(valor, ".10g")
    return str(valor)


def leer_env_local(ruta: Path) -> dict[str, str]:
    valores: dict[str, str] = {}
    if ruta.is_file():
        for linea in ruta.read_text(encoding="utf-8").splitlines():
            limpia = linea.strip()
            if not limpia or limpia.startswith("#"):
                continue
            if limpia.startswith("export "):
                limpia = limpia[7:].strip()
            if "=" not in limpia:
                continue
            clave, valor = limpia.split("=", 1)
            valores[clave.strip()] = valor.strip().strip('"').strip("'")
    for clave, valor in os.environ.items():
        if clave.startswith("FIREBASE_") or clave == "GOOGLE_APPLICATION_CREDENTIALS":
            valores[clave] = valor
    return valores


def credencial(env: dict[str, str]) -> dict[str, object]:
    crudo = env.get("FIREBASE_SERVICE_ACCOUNT_JSON") or env.get("FIREBASE_SERVICE_ACCOUNT")
    ruta = env.get("FIREBASE_SERVICE_ACCOUNT_PATH") or env.get("GOOGLE_APPLICATION_CREDENTIALS")
    info: dict[str, object] | None = None
    if crudo:
        texto = crudo.strip()
        if texto.startswith("{"):
            info = json.loads(texto)
        else:
            ruta = texto
    if info is None:
        if not ruta:
            raise RuntimeError(
                "Falta la credencial. Define FIREBASE_SERVICE_ACCOUNT_JSON, "
                "FIREBASE_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS en .env.local."
            )
        info = json.loads(Path(ruta).read_text(encoding="utf-8"))
    llave = info.get("private_key")
    if isinstance(llave, str):
        info["private_key"] = llave.replace("\\n", "\n")
    return info


def documento_firestore(fila: dict[str, object], campos_fecha: tuple[str, ...]) -> dict[str, object]:
    salida = dict(fila)
    for campo in campos_fecha:
        valor = salida.get(campo)
        if isinstance(valor, str):
            salida[campo] = desde_iso(valor)
    return salida


def cargar_firestore(
    usuarios: list[dict[str, object]],
    interacciones: list[dict[str, object]],
    cuarentena: list[dict[str, object]],
    env: dict[str, str],
) -> dict[str, int]:
    import firebase_admin
    from firebase_admin import credentials, firestore

    info = credencial(env)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(info))
    base = firestore.client()
    escritos = {
        "usuarios": escribir_coleccion(base, "usuarios", "id_usuario", usuarios, ("fecha_ingreso", "ultima_actividad")),
        "interacciones": escribir_coleccion(base, "interacciones", "id_interaccion", interacciones, ("timestamp",)),
        "cuarentena": escribir_coleccion(
            base,
            "cuarentena",
            "id_interaccion",
            cuarentena,
            ("timestamp", "fecha_cuarentena"),
        ),
    }
    return escritos


def escribir_coleccion(base, nombre: str, campo_id: str, filas: list[dict[str, object]], fechas: tuple[str, ...]) -> int:
    lote = base.batch()
    en_lote = 0
    total = 0
    for fila in filas:
        identificador = str(fila[campo_id])
        referencia = base.collection(nombre).document(identificador)
        lote.set(referencia, documento_firestore(fila, fechas))
        en_lote += 1
        total += 1
        if en_lote == 400:
            lote.commit()
            lote = base.batch()
            en_lote = 0
    if en_lote:
        lote.commit()
    return total


def comprobar(
    usuarios: list[dict[str, object]],
    interacciones: list[dict[str, object]],
    cuarentena: list[dict[str, object]],
    bitacora_usuarios: list[dict[str, object]],
    bitacora_interacciones: list[dict[str, object]],
    recibidos_usuarios: int,
    recibidos_interacciones: int,
) -> list[str]:
    errores: list[str] = []
    ids_usuario = {str(fila["id_usuario"]) for fila in usuarios}
    if len(ids_usuario) != len(usuarios):
        errores.append("hay id_usuario repetido en la salida limpia")
    ids_evento = {str(fila["id_interaccion"]) for fila in interacciones}
    ids_cuarentena = {str(fila["id_interaccion"]) for fila in cuarentena}
    if ids_evento & ids_cuarentena:
        errores.append("un id_interaccion quedó en interacciones y en cuarentena")
    if len(ids_evento) != len(interacciones) or len(ids_cuarentena) != len(cuarentena):
        errores.append("hay id_interaccion repetido en la salida")

    destinos_u: dict[str, int] = {}
    for entrada in bitacora_usuarios:
        destinos_u[str(entrada["destino"])] = destinos_u.get(str(entrada["destino"]), 0) + 1
    if sum(destinos_u.values()) != recibidos_usuarios:
        errores.append("la bitácora de usuarios no cubre todas las filas recibidas")
    if destinos_u.get("cargado", 0) != len(usuarios):
        errores.append("los usuarios cargados no coinciden con el archivo limpio")

    destinos_i: dict[str, int] = {}
    for entrada in bitacora_interacciones:
        destinos_i[str(entrada["destino"])] = destinos_i.get(str(entrada["destino"]), 0) + 1
    if sum(destinos_i.values()) != recibidos_interacciones:
        errores.append("la bitácora de interacciones no cubre todas las filas recibidas")
    if destinos_i.get("cargada", 0) != len(interacciones):
        errores.append("las interacciones cargadas no coinciden con el archivo limpio")
    if destinos_i.get("cuarentena", 0) != len(cuarentena):
        errores.append("la cuarentena de la bitácora no coincide con el archivo")

    for fila in usuarios:
        if fila.get("consentimiento_datos") == "no":
            if any(fila.get(campo) is not None for campo in CAMPOS_GEO_USUARIO):
                errores.append(f"{fila['id_usuario']} conserva geografía sin consentimiento")
                break
        elif fila.get("consentimiento_datos") == "si" and not isinstance(fila.get("pais"), str):
            errores.append(f"{fila['id_usuario']} consintió y quedó sin país")
            break

    consentimiento = {str(fila["id_usuario"]): fila["consentimiento_datos"] for fila in usuarios}
    for fila in interacciones:
        autor = str(fila["id_usuario"])
        if autor not in ids_usuario:
            errores.append(f"{fila['id_interaccion']} no tiene usuario en el padrón limpio")
            break
        if consentimiento[autor] == "no" and any(fila.get(campo) is not None for campo in CAMPOS_GEO_INTERACCION):
            errores.append(f"{fila['id_interaccion']} conserva geografía de un autor sin consentimiento")
            break
        if not isinstance(fila.get("etiquetas"), list):
            errores.append("etiquetas no quedó como arreglo")
            break
        if fila.get("tipo") == "reaccion" and fila.get("texto") is not None:
            continue
        if fila.get("tipo") != "reaccion" and fila.get("texto") is None:
            errores.append(f"{fila['id_interaccion']} quedó sin texto")
            break

    for fila in cuarentena:
        if fila.get("motivo_rechazo") == "id_usuario_inexistente" and str(fila["id_usuario"]) in ids_usuario:
            errores.append(f"{fila['id_interaccion']} está en cuarentena y su usuario sí existe")
            break
    return errores


def procesar(dry_run: bool) -> dict[str, object]:
    inicio = ahora_utc()
    marco_usuarios = leer_csv(CSV_USUARIOS)
    marco_interacciones = leer_csv(CSV_INTERACCIONES)
    exigir_columnas(marco_usuarios, COLUMNAS_USUARIO, CSV_USUARIOS.name)
    exigir_columnas(marco_interacciones, COLUMNAS_INTERACCION, CSV_INTERACCIONES.name)
    crudos_usuarios = marco_usuarios.to_dict("records")
    crudos_interacciones = marco_interacciones.to_dict("records")

    print("=== Etapa 1. Duplicados ===")
    usuarios_unicos, duplicados_usuario = etapa_1_duplicados(crudos_usuarios, "id_usuario", "alias")
    interacciones_unicas, duplicados_interaccion = marcar_pares(crudos_interacciones)
    print(f"usuarios duplicados: {len(duplicados_usuario)}")
    print(f"interacciones duplicadas: {len(duplicados_interaccion)}")

    print("=== Etapa 2. Nulos ===")
    usuarios_nulos, nulos_usuario = etapa_2_nulos(usuarios_unicos, COLUMNAS_USUARIO)
    interacciones_nulos, nulos_interaccion = etapa_2_nulos(interacciones_unicas, COLUMNAS_INTERACCION)
    print(f"celdas vacías de usuarios pasadas a null: {sum(nulos_usuario.values())}")
    print(f"texto vacío pasado a null: {nulos_interaccion['texto']}")
    print(f"etiquetas vacías: {nulos_interaccion['etiquetas']}")

    print("=== Etapa 3. Fechas, categorías y etiquetas ===")
    usuarios_std = etapa_3_usuarios(usuarios_nulos)
    interacciones_std = etapa_3_interacciones(interacciones_nulos)
    fechas_usuario = sum(
        1
        for fila in usuarios_std
        if isinstance(fila.get("fecha_ingreso"), str) and fila["fecha_ingreso"].endswith("T00:00:00Z")
    )
    arreglos = sum(1 for fila in interacciones_std if isinstance(fila.get("etiquetas"), list))
    print(f"fechas de ingreso homologadas a UTC: {fechas_usuario}")
    print(f"etiquetas convertidas a arreglo: {arreglos}")

    print("=== Etapa 4. Tipos ===")
    usuarios_validos: list[dict[str, object]] = []
    usuarios_invalidos: list[dict[str, object]] = []
    for fila in usuarios_std:
        documento, errores = validar_usuario(fila)
        if documento is None:
            usuarios_invalidos.append(
                {
                    "id_usuario": fila.get("id_usuario") or "",
                    "destino": "invalido",
                    "motivo": "tipo_invalido",
                    "geo_anulada": False,
                    "errores": errores,
                }
            )
        else:
            usuarios_validos.append(documento)
    interacciones_validas: list[dict[str, object]] = []
    interacciones_invalidas: list[dict[str, object]] = []
    for fila in interacciones_std:
        documento, errores = validar_interaccion(fila)
        if documento is None:
            interacciones_invalidas.append({"fila": fila, "errores": errores})
        else:
            interacciones_validas.append(documento)
    print(f"usuarios válidos: {len(usuarios_validos)}")
    print(f"usuarios inválidos: {len(usuarios_invalidos)}")
    print(f"interacciones válidas: {len(interacciones_validas)}")
    print(f"interacciones con tipo inválido: {len(interacciones_invalidas)}")

    print("=== Etapa 5. Referencias ===")
    padron = {str(fila["id_usuario"]) for fila in usuarios_validos}
    aceptadas: list[dict[str, object]] = []
    huerfanas: list[dict[str, object]] = []
    for fila in interacciones_validas:
        if str(fila["id_usuario"]) in padron:
            aceptadas.append(fila)
        else:
            huerfanas.append(fila)
    print(f"interacciones con usuario en el padrón: {len(aceptadas)}")
    print(f"interacciones huérfanas, a cuarentena: {len(huerfanas)}")

    print("=== Etapa 6. Consentimiento ===")
    geo_usuarios = 0
    for fila in usuarios_validos:
        if anular_geo_usuario(fila):
            geo_usuarios += 1
    consentimiento = {str(fila["id_usuario"]): fila["consentimiento_datos"] for fila in usuarios_validos}
    geo_interacciones = 0
    for fila in aceptadas:
        if consentimiento.get(str(fila["id_usuario"])) == "no":
            anular_geo_interaccion(fila)
            geo_interacciones += 1
    print(f"usuarios con geografía anulada: {geo_usuarios}")
    print(f"interacciones con geografía anulada por el autor: {geo_interacciones}")

    marca_cuarentena = a_iso(inicio)
    cuarentena: list[dict[str, object]] = []
    for fila in huerfanas:
        registro = dict(fila)
        registro["motivo_rechazo"] = "id_usuario_inexistente"
        registro["fecha_cuarentena"] = marca_cuarentena
        cuarentena.append(registro)
    for invalida in interacciones_invalidas:
        cruda = invalida["fila"]
        registro = {columna: cruda.get(columna) for columna in COLUMNAS_INTERACCION}
        if not isinstance(registro.get("etiquetas"), list):
            registro["etiquetas"] = []
        registro["motivo_rechazo"] = "tipo_invalido"
        registro["fecha_cuarentena"] = marca_cuarentena
        cuarentena.append(registro)

    print("=== Etapa 7. Archivos depurados ===")
    SALIDA.mkdir(parents=True, exist_ok=True)
    ruta_usuarios = SALIDA / "usuarios_limpios.csv"
    ruta_interacciones = SALIDA / "interacciones_limpias.csv"
    ruta_cuarentena = SALIDA / "cuarentena.csv"
    ruta_bitacora = SALIDA / "bitacora_etl.json"
    escribir_csv(ruta_usuarios, usuarios_validos, COLUMNAS_USUARIO)
    escribir_csv(ruta_interacciones, aceptadas, COLUMNAS_INTERACCION)
    escribir_csv(ruta_cuarentena, cuarentena, COLUMNAS_CUARENTENA)

    bitacora_usuarios: list[dict[str, object]] = []
    for item in duplicados_usuario:
        bitacora_usuarios.append(
            {
                "id_usuario": item["id"],
                "destino": "duplicado",
                "motivo": item["motivo"],
                "geo_anulada": False,
            }
        )
    for item in usuarios_invalidos:
        bitacora_usuarios.append(item)
    for fila in usuarios_validos:
        bitacora_usuarios.append(
            {
                "id_usuario": fila["id_usuario"],
                "destino": "cargado",
                "motivo": None,
                "geo_anulada": fila["consentimiento_datos"] == "no",
            }
        )
    bitacora_interacciones: list[dict[str, object]] = []
    for item in duplicados_interaccion:
        bitacora_interacciones.append(
            {
                "id_interaccion": item["id"],
                "id_usuario": item["id_usuario"],
                "destino": "duplicada",
                "motivo": item["motivo"],
            }
        )
    for invalida in interacciones_invalidas:
        cruda = invalida["fila"]
        bitacora_interacciones.append(
            {
                "id_interaccion": cruda.get("id_interaccion") or "",
                "id_usuario": cruda.get("id_usuario") or "",
                "destino": "cuarentena",
                "motivo": "tipo_invalido",
                "errores": invalida["errores"],
            }
        )
    for fila in huerfanas:
        bitacora_interacciones.append(
            {
                "id_interaccion": fila["id_interaccion"],
                "id_usuario": fila["id_usuario"],
                "destino": "cuarentena",
                "motivo": "id_usuario_inexistente",
            }
        )
    for fila in aceptadas:
        bitacora_interacciones.append(
            {
                "id_interaccion": fila["id_interaccion"],
                "id_usuario": fila["id_usuario"],
                "destino": "cargada",
                "motivo": None,
                "geo_anulada": consentimiento.get(str(fila["id_usuario"])) == "no",
            }
        )

    fallos = comprobar(
        usuarios_validos,
        aceptadas,
        cuarentena,
        bitacora_usuarios,
        bitacora_interacciones,
        len(crudos_usuarios),
        len(crudos_interacciones),
    )
    if fallos:
        for fallo in fallos:
            print(f"COMPROBACION: {fallo}", file=sys.stderr)
        raise SystemExit(1)

    print("=== Etapa 8. Carga ===")
    carga: dict[str, object]
    if dry_run:
        print("dry-run: no se abre Firestore y no se leen credenciales.")
        carga = {"modo": "dry-run", "escritos": {"usuarios": 0, "interacciones": 0, "cuarentena": 0}}
    else:
        try:
            escritos = cargar_firestore(usuarios_validos, aceptadas, cuarentena, leer_env_local(ENV_LOCAL))
        except RuntimeError as exc:
            print(f"Carga detenida: {exc}", file=sys.stderr)
            raise SystemExit(2) from exc
        print(
            "Firestore: "
            f"{escritos['usuarios']} usuarios, "
            f"{escritos['interacciones']} interacciones, "
            f"{escritos['cuarentena']} en cuarentena."
        )
        carga = {"modo": "carga", "escritos": escritos}

    fin = ahora_utc()
    transformados_usuarios = fechas_usuario
    transformados_interacciones = arreglos
    bitacora = {
        "corrida_id": a_iso(inicio),
        "inicio": a_iso(inicio),
        "fin": a_iso(fin),
        "modo": "dry-run" if dry_run else "carga",
        "archivo_usuarios": CSV_USUARIOS.name,
        "archivo_interacciones": CSV_INTERACCIONES.name,
        "nulo_en_csv": "celda vacia",
        "arreglo_en_csv": "JSON",
        "booleano_en_csv": "true/false",
        "fecha_en_csv": "ISO-8601 UTC",
        "usuarios_recibidos": len(crudos_usuarios),
        "usuarios_cargados": len(usuarios_validos),
        "usuarios_geo_anulada": geo_usuarios,
        "usuarios_duplicados": len(duplicados_usuario),
        "usuarios_invalidos": len(usuarios_invalidos),
        "usuarios_transformados": transformados_usuarios,
        "interacciones_recibidas": len(crudos_interacciones),
        "interacciones_cargadas": len(aceptadas),
        "interacciones_cuarentena": len(cuarentena),
        "interacciones_duplicadas": len(duplicados_interaccion),
        "interacciones_tipo_invalido": len(interacciones_invalidas),
        "interacciones_geo_anulada": geo_interacciones,
        "interacciones_texto_a_null": nulos_interaccion["texto"],
        "interacciones_transformadas": transformados_interacciones,
        "etapas": {
            "1_duplicados": {
                "usuarios": len(duplicados_usuario),
                "interacciones": len(duplicados_interaccion),
            },
            "2_nulos": {
                "usuarios": {clave: valor for clave, valor in nulos_usuario.items() if valor},
                "interacciones": {clave: valor for clave, valor in nulos_interaccion.items() if valor},
            },
            "3_estandarizacion": {
                "fechas_ingreso_utc": fechas_usuario,
                "etiquetas_a_arreglo": arreglos,
            },
            "4_tipos": {
                "usuarios_validos": len(usuarios_validos),
                "usuarios_invalidos": len(usuarios_invalidos),
                "interacciones_validas": len(interacciones_validas),
                "interacciones_tipo_invalido": len(interacciones_invalidas),
            },
            "5_referencias": {
                "con_usuario": len(aceptadas),
                "sin_usuario": len(huerfanas),
            },
            "6_consentimiento": {
                "usuarios_geo_anulada": geo_usuarios,
                "interacciones_geo_anulada": geo_interacciones,
            },
            "7_archivos": {
                "usuarios_limpios": str(ruta_usuarios.relative_to(ROOT)).replace("\\", "/"),
                "interacciones_limpias": str(ruta_interacciones.relative_to(ROOT)).replace("\\", "/"),
                "cuarentena": str(ruta_cuarentena.relative_to(ROOT)).replace("\\", "/"),
                "bitacora": str(ruta_bitacora.relative_to(ROOT)).replace("\\", "/"),
            },
            "8_carga": carga,
        },
        "usuarios": bitacora_usuarios,
        "interacciones": bitacora_interacciones,
    }
    ruta_bitacora.write_text(json.dumps(bitacora, ensure_ascii=False, indent=2), encoding="utf-8")
    print(ruta_usuarios.relative_to(ROOT))
    print(ruta_interacciones.relative_to(ROOT))
    print(ruta_cuarentena.relative_to(ROOT))
    print(ruta_bitacora.relative_to(ROOT))
    return bitacora


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ETL Fase 2 de COMMUNITY 360")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Ejecuta las 8 etapas y escribe la auditoría local, sin Firestore.",
    )
    argumentos = parser.parse_args(argv)
    bitacora = procesar(dry_run=argumentos.dry_run)
    print("--- Resumen ---")
    print(
        "Usuarios: "
        f"recibidos {bitacora['usuarios_recibidos']}, "
        f"aceptados {bitacora['usuarios_cargados']}, "
        f"transformados {bitacora['usuarios_transformados']}, "
        f"rechazados {bitacora['usuarios_duplicados'] + bitacora['usuarios_invalidos']}, "
        f"geo anulada {bitacora['usuarios_geo_anulada']}"
    )
    print(
        "Interacciones: "
        f"recibidas {bitacora['interacciones_recibidas']}, "
        f"aceptadas {bitacora['interacciones_cargadas']}, "
        f"transformadas {bitacora['interacciones_transformadas']}, "
        f"cuarentena {bitacora['interacciones_cuarentena']}, "
        f"duplicadas {bitacora['interacciones_duplicadas']}, "
        f"tipo inválido {bitacora['interacciones_tipo_invalido']}"
    )
    print(f"Modo: {bitacora['modo']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
