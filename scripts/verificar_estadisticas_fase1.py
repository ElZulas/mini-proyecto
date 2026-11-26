#!/usr/bin/env python3
"""Calcula y verifica las estadísticas exactas de los CSV de COMMUNITY 360.

El reporte es la fuente de las cifras del documento docs/fase_1_community_360.md.
Si un total citado en CIFRAS_DOCUMENTO no coincide con el CSV, el script termina
con código 1. No imprime estimaciones: cada valor sale de un conteo sobre el archivo.
"""

from __future__ import annotations

import csv
import json
import math
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from statistics import mean, median


ROOT = Path(__file__).resolve().parents[1]
USUARIOS_CSV = ROOT / "comunidad_virtual_usuarios.csv"
INTERACCIONES_CSV = ROOT / "comunidad_virtual_1000_interacciones.csv"

CAMPOS_USUARIO_ENTEROS = (
    "es_artista",
    "mensajes_30d",
    "reacciones_30d",
    "eventos_asistidos",
    "comisiones_compradas",
)
CAMPOS_USUARIO_FLOAT = ("latitud", "longitud", "sentimiento_promedio")
CAMPOS_INTERACCION_ENTEROS = ("longitud_texto", "reacciones_recibidas")
CAMPOS_INTERACCION_FLOAT = ("sentimiento",)


def cargar(ruta: Path) -> tuple[list[str], list[dict[str, str]]]:
    with ruta.open("r", encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)
        if lector.fieldnames is None:
            raise SystemExit(f"Sin encabezado: {ruta}")
        columnas = list(lector.fieldnames)
        filas = list(lector)
    return columnas, filas


def vacio(valor: str | None) -> bool:
    return valor is None or valor.strip() == ""


def nulos_por_columna(filas: list[dict[str, str]], columnas: list[str]) -> dict[str, int]:
    return {columna: sum(1 for fila in filas if vacio(fila.get(columna))) for columna in columnas}


def frecuencias(filas: list[dict[str, str]], columna: str) -> dict[str, int]:
    conteo: Counter[str] = Counter()
    for fila in filas:
        valor = fila.get(columna, "")
        conteo["<vacio>"] += 1 if vacio(valor) else 0
        if not vacio(valor):
            conteo[valor.strip()] += 1
    return dict(conteo.most_common())


def a_int(valor: str) -> int | None:
    if vacio(valor):
        return None
    return int(valor.strip())


def a_float(valor: str) -> float | None:
    if vacio(valor):
        return None
    return float(valor.strip())


def resumen_numerico(valores: list[float]) -> dict[str, float | int | None]:
    if not valores:
        return {"n": 0, "min": None, "max": None, "media": None, "mediana": None}
    return {
        "n": len(valores),
        "min": min(valores),
        "max": max(valores),
        "media": round(mean(valores), 6),
        "mediana": round(float(median(valores)), 6),
    }


def parse_fecha_dmy(valor: str) -> datetime | None:
    if vacio(valor):
        return None
    return datetime.strptime(valor.strip(), "%d/%m/%Y")


def rango_fechas_dmy(filas: list[dict[str, str]], columna: str) -> dict[str, str | int | None]:
    fechas = [parse_fecha_dmy(fila[columna]) for fila in filas]
    validas = [fecha for fecha in fechas if fecha is not None]
    if not validas:
        return {"n": 0, "min": None, "max": None, "invalidas": len(filas)}
    return {
        "n": len(validas),
        "min": min(validas).strftime("%d/%m/%Y"),
        "max": max(validas).strftime("%d/%m/%Y"),
        "invalidas": len(filas) - len(validas),
    }


def rango_timestamp(filas: list[dict[str, str]], columna: str) -> dict[str, str | int | None]:
    fechas: list[datetime] = []
    invalidas = 0
    for fila in filas:
        valor = fila.get(columna, "")
        if vacio(valor):
            invalidas += 1
            continue
        try:
            fechas.append(datetime.strptime(valor.strip(), "%Y-%m-%dT%H:%M:%SZ"))
        except ValueError:
            invalidas += 1
    if not fechas:
        return {"n": 0, "min": None, "max": None, "invalidas": invalidas}
    return {
        "n": len(fechas),
        "min": min(fechas).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "max": max(fechas).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "invalidas": invalidas,
    }


def duplicados(valores: list[str]) -> dict[str, int]:
    conteo = Counter(valores)
    repetidos = {clave: veces for clave, veces in conteo.items() if veces > 1}
    return {
        "unicos": len(conteo),
        "claves_repetidas": len(repetidos),
        "filas_en_claves_repetidas": sum(repetidos.values()),
        "filas_excedentes": sum(veces - 1 for veces in repetidos.values()),
    }


def etiquetas_de(valor: str) -> list[str]:
    if vacio(valor):
        return []
    return [parte.strip() for parte in valor.split("|") if parte.strip()]


def redondear(numero: float | None, decimales: int = 4) -> float | None:
    if numero is None:
        return None
    return round(numero, decimales)


def analizar() -> dict:
    cols_u, usuarios = cargar(USUARIOS_CSV)
    cols_i, interacciones = cargar(INTERACCIONES_CSV)

    ids_usuario = [fila["id_usuario"].strip() for fila in usuarios]
    conjunto_usuarios = set(ids_usuario)
    numeros_usuario = sorted(int(identificador[1:]) for identificador in ids_usuario)
    nulos_u = nulos_por_columna(usuarios, cols_u)
    nulos_i = nulos_por_columna(interacciones, cols_i)

    sin_consentimiento = [fila for fila in usuarios if fila["consentimiento_datos"].strip() == "no"]
    con_consentimiento = [fila for fila in usuarios if fila["consentimiento_datos"].strip() == "si"]
    consentimiento_otro = [
        fila["consentimiento_datos"]
        for fila in usuarios
        if fila["consentimiento_datos"].strip() not in {"si", "no"}
    ]

    def geo(filas: list[dict[str, str]]) -> dict[str, int]:
        return {
            "n": len(filas),
            "ciudad_poblada": sum(1 for fila in filas if not vacio(fila["ciudad"])),
            "ciudad_vacia": sum(1 for fila in filas if vacio(fila["ciudad"])),
            "latitud_poblada": sum(1 for fila in filas if not vacio(fila["latitud"])),
            "latitud_vacia": sum(1 for fila in filas if vacio(fila["latitud"])),
            "longitud_poblada": sum(1 for fila in filas if not vacio(fila["longitud"])),
            "longitud_vacia": sum(1 for fila in filas if vacio(fila["longitud"])),
            "lat_y_lon_vacias": sum(
                1 for fila in filas if vacio(fila["latitud"]) and vacio(fila["longitud"])
            ),
            "lat_xor_lon": sum(
                1
                for fila in filas
                if vacio(fila["latitud"]) != vacio(fila["longitud"])
            ),
            "estado_poblado": sum(1 for fila in filas if not vacio(fila["estado"])),
            "pais_poblado": sum(1 for fila in filas if not vacio(fila["pais"])),
            "zona_horaria_poblada": sum(1 for fila in filas if not vacio(fila["zona_horaria"])),
        }

    zona_por_estado: dict[str, set[str]] = {}
    estado_por_zona: dict[str, set[str]] = {}
    for fila in usuarios:
        zona_por_estado.setdefault(fila["estado"].strip(), set()).add(fila["zona_horaria"].strip())
        estado_por_zona.setdefault(fila["zona_horaria"].strip(), set()).add(fila["estado"].strip())

    ids_interaccion = [fila["id_interaccion"].strip() for fila in interacciones]
    pares = [(fila["id_usuario"].strip(), fila["id_interaccion"].strip()) for fila in interacciones]
    ids_referenciados = [fila["id_usuario"].strip() for fila in interacciones]

    coinciden = [fila for fila in interacciones if fila["id_usuario"].strip() in conjunto_usuarios]
    huerfanas = [fila for fila in interacciones if fila["id_usuario"].strip() not in conjunto_usuarios]
    usuarios_con_interaccion = {fila["id_usuario"].strip() for fila in coinciden}
    usuarios_sin_interaccion = conjunto_usuarios - usuarios_con_interaccion

    consent_por_id = {fila["id_usuario"].strip(): fila["consentimiento_datos"].strip() for fila in usuarios}
    coinciden_no = [fila for fila in coinciden if consent_por_id[fila["id_usuario"].strip()] == "no"]
    coinciden_si = [fila for fila in coinciden if consent_por_id[fila["id_usuario"].strip()] == "si"]

    listas_etiquetas = [etiquetas_de(fila["etiquetas"]) for fila in interacciones]
    vocabulario: Counter[str] = Counter()
    for lista in listas_etiquetas:
        vocabulario.update(lista)
    conteo_cardinalidad = Counter(len(lista) for lista in listas_etiquetas)
    con_pipe = sum(1 for fila in interacciones if "|" in (fila.get("etiquetas") or ""))

    texto_vacio_por_tipo: Counter[str] = Counter()
    for fila in interacciones:
        if vacio(fila["texto"]):
            texto_vacio_por_tipo[fila["tipo"].strip() or "<vacio>"] += 1

    longitud_difiere = 0
    longitud_igual = 0
    for fila in interacciones:
        esperada = a_int(fila["longitud_texto"])
        real = len(fila["texto"])
        if esperada is None:
            continue
        if esperada == real:
            longitud_igual += 1
        else:
            longitud_difiere += 1

    geo_interaccion_vacia = sum(
        1
        for fila in interacciones
        if vacio(fila["pais"]) and vacio(fila["estado"]) and vacio(fila["ciudad"])
    )
    geo_interaccion_parcial = sum(
        1
        for fila in interacciones
        if not (
            (vacio(fila["pais"]) and vacio(fila["estado"]) and vacio(fila["ciudad"]))
            or (not vacio(fila["pais"]) and not vacio(fila["estado"]) and not vacio(fila["ciudad"]))
        )
    )

    filas_duplicadas_u = duplicados([json.dumps(fila, ensure_ascii=False, sort_keys=True) for fila in usuarios])
    filas_duplicadas_i = duplicados(
        [json.dumps(fila, ensure_ascii=False, sort_keys=True) for fila in interacciones]
    )

    numericos_u = {}
    for campo in CAMPOS_USUARIO_ENTEROS:
        valores = [a_int(fila[campo]) for fila in usuarios]
        invalidos = sum(1 for valor in valores if valor is None)
        numericos_u[campo] = resumen_numerico([float(valor) for valor in valores if valor is not None])
        numericos_u[campo]["vacios"] = invalidos
    for campo in CAMPOS_USUARIO_FLOAT:
        valores = []
        vacios = 0
        for fila in usuarios:
            numero = a_float(fila[campo])
            if numero is None:
                vacios += 1
            else:
                valores.append(numero)
        numericos_u[campo] = resumen_numerico(valores)
        numericos_u[campo]["vacios"] = vacios

    numericos_i = {}
    for campo in CAMPOS_INTERACCION_ENTEROS:
        valores = [a_int(fila[campo]) for fila in interacciones]
        numericos_i[campo] = resumen_numerico([float(valor) for valor in valores if valor is not None])
        numericos_i[campo]["vacios"] = sum(1 for valor in valores if valor is None)
    for campo in CAMPOS_INTERACCION_FLOAT:
        valores = []
        vacios = 0
        for fila in interacciones:
            numero = a_float(fila[campo])
            if numero is None:
                vacios += 1
            else:
                valores.append(numero)
        numericos_i[campo] = resumen_numerico(valores)
        numericos_i[campo]["vacios"] = vacios

    pares_estado_ciudad = {
        (fila["estado"].strip(), fila["ciudad"].strip()) for fila in usuarios
    }
    ciudades_por_estado: dict[str, set[str]] = {}
    estados_por_ciudad: dict[str, set[str]] = {}
    for fila in usuarios:
        ciudades_por_estado.setdefault(fila["estado"].strip(), set()).add(fila["ciudad"].strip())
        estados_por_ciudad.setdefault(fila["ciudad"].strip(), set()).add(fila["estado"].strip())

    campos_con_pipe_u = {
        columna: sum(1 for fila in usuarios if "|" in (fila.get(columna) or ""))
        for columna in cols_u
    }
    campos_con_pipe_i = {
        columna: sum(1 for fila in interacciones if "|" in (fila.get(columna) or ""))
        for columna in cols_i
    }

    fila_u1 = next(fila for fila in usuarios if fila["id_usuario"].strip() == "U000001")
    fila_i1825 = next(fila for fila in interacciones if fila["id_interaccion"].strip() == "I0001825")
    fila_i410 = next(fila for fila in interacciones if fila["id_interaccion"].strip() == "I0000410")
    consentimiento_por_id = {
        fila["id_usuario"].strip(): fila["consentimiento_datos"].strip() for fila in usuarios
    }

    return {
        "archivos": {
            "usuarios": USUARIOS_CSV.name,
            "interacciones": INTERACCIONES_CSV.name,
        },
        "usuarios": {
            "filas": len(usuarios),
            "columnas": len(cols_u),
            "nombres_columnas": cols_u,
            "nulos": nulos_u,
            "filas_completas_duplicadas": filas_duplicadas_u,
            "id_usuario": duplicados(ids_usuario),
            "id_usuario_min": min(ids_usuario),
            "id_usuario_max": max(ids_usuario),
            "id_usuario_patron_U_6digitos": sum(1 for identificador in ids_usuario if re.fullmatch(r"U\d{6}", identificador)),
            "id_usuario_contiguos_desde_1": numeros_usuario[0] == 1
            and numeros_usuario[-1] - numeros_usuario[0] + 1 == len(numeros_usuario),
            "alias": duplicados([fila["alias"].strip() for fila in usuarios]),
            "consentimiento": frecuencias(usuarios, "consentimiento_datos"),
            "consentimiento_valores_fuera_de_si_no": len(consentimiento_otro),
            "geo_sin_consentimiento": geo(sin_consentimiento),
            "geo_con_consentimiento": geo(con_consentimiento),
            "geo_total": geo(usuarios),
            "pais": frecuencias(usuarios, "pais"),
            "estado": frecuencias(usuarios, "estado"),
            "ciudad": frecuencias(usuarios, "ciudad"),
            "zona_horaria": frecuencias(usuarios, "zona_horaria"),
            "rango_edad": frecuencias(usuarios, "rango_edad"),
            "especie_fursona": frecuencias(usuarios, "especie_fursona"),
            "interes_principal": frecuencias(usuarios, "interes_principal"),
            "plataforma_principal": frecuencias(usuarios, "plataforma_principal"),
            "es_artista_valores": frecuencias(usuarios, "es_artista"),
            "estatus": frecuencias(usuarios, "estatus"),
            "numericos": numericos_u,
            "fecha_ingreso": rango_fechas_dmy(usuarios, "fecha_ingreso"),
            "ultima_actividad": rango_fechas_dmy(usuarios, "ultima_actividad"),
            "zonas_por_estado": {estado: sorted(zonas) for estado, zonas in sorted(zona_por_estado.items())},
            "estados_por_zona": {zona: sorted(estados) for zona, estados in sorted(estado_por_zona.items())},
            "campos_con_pipe": {k: v for k, v in campos_con_pipe_u.items() if v},
            "columnas_con_pipe": sum(1 for valor in campos_con_pipe_u.values() if valor),
            "pares_estado_ciudad": len(pares_estado_ciudad),
            "estados_distintos": len(ciudades_por_estado),
            "ciudades_distintas": len(estados_por_ciudad),
            "estados_con_una_sola_ciudad": sum(1 for ciudades in ciudades_por_estado.values() if len(ciudades) == 1),
            "ciudades_con_un_solo_estado": sum(1 for estados in estados_por_ciudad.values() if len(estados) == 1),
            "zonas_horarias_distintas": len(estado_por_zona),
            "zonas_que_determinan_un_solo_estado": sum(
                1 for estados in estado_por_zona.values() if len(estados) == 1
            ),
            "zonas_que_agrupan_varios_estados": sum(
                1 for estados in estado_por_zona.values() if len(estados) > 1
            ),
            "estados_en_america_mexico_city": len(estado_por_zona["America/Mexico_City"]),
            "estados_en_america_merida": len(estado_por_zona["America/Merida"]),
            "zonas_univocas_mismo_conteo_que_su_estado": all(
                sum(1 for fila in usuarios if fila["zona_horaria"].strip() == zona)
                == sum(1 for fila in usuarios if fila["estado"].strip() == next(iter(estados)))
                for zona, estados in estado_por_zona.items()
                if len(estados) == 1
            ),
            "estados_con_una_sola_zona": sum(1 for zonas in zona_por_estado.values() if len(zonas) == 1),
        },
        "interacciones": {
            "filas": len(interacciones),
            "columnas": len(cols_i),
            "nombres_columnas": cols_i,
            "nulos": nulos_i,
            "filas_completas_duplicadas": filas_duplicadas_i,
            "id_interaccion": duplicados(ids_interaccion),
            "id_interaccion_patron_I_7digitos": sum(
                1 for identificador in ids_interaccion if re.fullmatch(r"I\d{7}", identificador)
            ),
            "par_id_usuario_id_interaccion": duplicados(["|".join(par) for par in pares]),
            "id_usuario_distintos": len(set(ids_referenciados)),
            "canal": frecuencias(interacciones, "canal"),
            "tipo": frecuencias(interacciones, "tipo"),
            "tema": frecuencias(interacciones, "tema"),
            "idioma": frecuencias(interacciones, "idioma"),
            "dispositivo": frecuencias(interacciones, "dispositivo"),
            "numericos": numericos_i,
            "timestamp": rango_timestamp(interacciones, "timestamp"),
            "texto_vacio": sum(1 for fila in interacciones if vacio(fila["texto"])),
            "texto_vacio_por_tipo": dict(texto_vacio_por_tipo),
            "longitud_texto_igual_a_len_texto": longitud_igual,
            "longitud_texto_difiere_de_len_texto": longitud_difiere,
            "geo_pais_estado_ciudad_vacios": geo_interaccion_vacia,
            "geo_parcial": geo_interaccion_parcial,
            "etiquetas": {
                "vacias": conteo_cardinalidad.get(0, 0),
                "con_al_menos_una": sum(veces for n, veces in conteo_cardinalidad.items() if n >= 1),
                "con_pipe": con_pipe,
                "cardinalidad": {str(k): conteo_cardinalidad[k] for k in sorted(conteo_cardinalidad)},
                "vocabulario": dict(vocabulario.most_common()),
                "etiquetas_distintas": len(vocabulario),
                "ocurrencias_totales": sum(vocabulario.values()),
                "max_etiquetas_en_un_registro": max(conteo_cardinalidad) if conteo_cardinalidad else 0,
            },
            "campos_con_pipe": {k: v for k, v in campos_con_pipe_i.items() if v},
            "columnas_con_pipe": sum(1 for valor in campos_con_pipe_i.values() if valor),
        },
        "cruce": {
            "interacciones_con_usuario_en_padron": len(coinciden),
            "interacciones_sin_usuario_en_padron": len(huerfanas),
            "usuarios_referenciados_en_interacciones_validas": len(usuarios_con_interaccion),
            "usuarios_del_padron_sin_interaccion": len(usuarios_sin_interaccion),
            "id_usuario_huerfanos_distintos": len({fila["id_usuario"].strip() for fila in huerfanas}),
            "coinciden_consentimiento_si": len(coinciden_si),
            "coinciden_consentimiento_no": len(coinciden_no),
            "huerfanas_con_geo_completa": sum(
                1
                for fila in huerfanas
                if not vacio(fila["pais"]) and not vacio(fila["estado"]) and not vacio(fila["ciudad"])
            ),
            "huerfanas_sin_geo": sum(
                1
                for fila in huerfanas
                if vacio(fila["pais"]) and vacio(fila["estado"]) and vacio(fila["ciudad"])
            ),
            "coinciden_no_con_ciudad": sum(1 for fila in coinciden_no if not vacio(fila["ciudad"])),
            "coinciden_no_sin_ciudad": sum(1 for fila in coinciden_no if vacio(fila["ciudad"])),
            "coinciden_si_geo_completa": sum(
                1
                for fila in coinciden_si
                if not vacio(fila["pais"]) and not vacio(fila["estado"]) and not vacio(fila["ciudad"])
            ),
            "coinciden_no_geo_vacia": sum(
                1
                for fila in coinciden_no
                if vacio(fila["pais"]) and vacio(fila["estado"]) and vacio(fila["ciudad"])
            ),
            "ejemplo_I0000410_usuario": next(
                fila["id_usuario"].strip() for fila in interacciones if fila["id_interaccion"].strip() == "I0000410"
            ),
            "ejemplo_I0000410_en_padron": next(
                fila["id_usuario"].strip() in conjunto_usuarios
                for fila in interacciones
                if fila["id_interaccion"].strip() == "I0000410"
            ),
        },
        "ejemplos": {
            "U000001": {
                "alias": fila_u1["alias"],
                "fecha_ingreso": fila_u1["fecha_ingreso"],
                "pais": fila_u1["pais"],
                "estado": fila_u1["estado"],
                "ciudad": fila_u1["ciudad"],
                "latitud": fila_u1["latitud"],
                "longitud": fila_u1["longitud"],
                "zona_horaria": fila_u1["zona_horaria"],
                "rango_edad": fila_u1["rango_edad"],
                "especie_fursona": fila_u1["especie_fursona"],
                "interes_principal": fila_u1["interes_principal"],
                "plataforma_principal": fila_u1["plataforma_principal"],
                "es_artista": fila_u1["es_artista"],
                "mensajes_30d": fila_u1["mensajes_30d"],
                "reacciones_30d": fila_u1["reacciones_30d"],
                "eventos_asistidos": fila_u1["eventos_asistidos"],
                "comisiones_compradas": fila_u1["comisiones_compradas"],
                "sentimiento_promedio": fila_u1["sentimiento_promedio"],
                "ultima_actividad": fila_u1["ultima_actividad"],
                "estatus": fila_u1["estatus"],
                "consentimiento_datos": fila_u1["consentimiento_datos"],
            },
            "I0001825": {
                "id_usuario": fila_i1825["id_usuario"].strip(),
                "en_padron": fila_i1825["id_usuario"].strip() in conjunto_usuarios,
                "consentimiento_autor": consentimiento_por_id.get(fila_i1825["id_usuario"].strip(), ""),
                "timestamp": fila_i1825["timestamp"],
                "canal": fila_i1825["canal"],
                "tipo": fila_i1825["tipo"],
                "texto": fila_i1825["texto"],
                "tema": fila_i1825["tema"],
                "sentimiento": fila_i1825["sentimiento"],
                "idioma": fila_i1825["idioma"],
                "pais": fila_i1825["pais"],
                "estado": fila_i1825["estado"],
                "ciudad": fila_i1825["ciudad"],
                "dispositivo": fila_i1825["dispositivo"],
                "longitud_texto": fila_i1825["longitud_texto"],
                "reacciones_recibidas": fila_i1825["reacciones_recibidas"],
                "etiquetas": fila_i1825["etiquetas"],
            },
            "I0000410": {
                "id_usuario": fila_i410["id_usuario"].strip(),
                "en_padron": fila_i410["id_usuario"].strip() in conjunto_usuarios,
                "timestamp": fila_i410["timestamp"],
                "canal": fila_i410["canal"],
                "tipo": fila_i410["tipo"],
                "texto_vacio": vacio(fila_i410["texto"]),
                "tema": fila_i410["tema"],
                "sentimiento": fila_i410["sentimiento"],
                "idioma": fila_i410["idioma"],
                "pais_vacio": vacio(fila_i410["pais"]),
                "estado_vacio": vacio(fila_i410["estado"]),
                "ciudad_vacio": vacio(fila_i410["ciudad"]),
                "dispositivo": fila_i410["dispositivo"],
                "longitud_texto": fila_i410["longitud_texto"],
                "reacciones_recibidas": fila_i410["reacciones_recibidas"],
                "etiquetas": fila_i410["etiquetas"],
            },
        },
    }


# Cifras citadas en docs/fase_1_community_360.md.
# Cada ruta se resuelve dentro del diccionario de analizar().
CIFRAS_DOCUMENTO: dict[str, object] = {
    "usuarios.filas": 1068,
    "usuarios.columnas": 22,
    "usuarios.filas_completas_duplicadas.claves_repetidas": 0,
    "usuarios.id_usuario.unicos": 1068,
    "usuarios.id_usuario.claves_repetidas": 0,
    "usuarios.alias.unicos": 1068,
    "usuarios.alias.claves_repetidas": 0,
    "usuarios.id_usuario_min": "U000001",
    "usuarios.id_usuario_max": "U001068",
    "usuarios.id_usuario_patron_U_6digitos": 1068,
    "usuarios.id_usuario_contiguos_desde_1": True,
    "usuarios.nulos.id_usuario": 0,
    "usuarios.nulos.alias": 0,
    "usuarios.nulos.fecha_ingreso": 0,
    "usuarios.nulos.pais": 0,
    "usuarios.nulos.estado": 0,
    "usuarios.nulos.ciudad": 0,
    "usuarios.nulos.latitud": 275,
    "usuarios.nulos.longitud": 275,
    "usuarios.nulos.zona_horaria": 0,
    "usuarios.nulos.rango_edad": 0,
    "usuarios.nulos.especie_fursona": 0,
    "usuarios.nulos.interes_principal": 0,
    "usuarios.nulos.plataforma_principal": 0,
    "usuarios.nulos.es_artista": 0,
    "usuarios.nulos.mensajes_30d": 0,
    "usuarios.nulos.reacciones_30d": 0,
    "usuarios.nulos.eventos_asistidos": 0,
    "usuarios.nulos.comisiones_compradas": 0,
    "usuarios.nulos.sentimiento_promedio": 0,
    "usuarios.nulos.ultima_actividad": 0,
    "usuarios.nulos.estatus": 0,
    "usuarios.nulos.consentimiento_datos": 0,
    "usuarios.fecha_ingreso.n": 1068,
    "usuarios.fecha_ingreso.min": "01/01/2022",
    "usuarios.fecha_ingreso.max": "08/11/2026",
    "usuarios.fecha_ingreso.invalidas": 0,
    "usuarios.ultima_actividad.n": 1068,
    "usuarios.ultima_actividad.min": "09/10/2025",
    "usuarios.ultima_actividad.max": "09/11/2026",
    "usuarios.ultima_actividad.invalidas": 0,
    "usuarios.consentimiento.si": 897,
    "usuarios.consentimiento.no": 171,
    "usuarios.consentimiento_valores_fuera_de_si_no": 0,
    "usuarios.geo_total.lat_xor_lon": 0,
    "usuarios.geo_sin_consentimiento.n": 171,
    "usuarios.geo_sin_consentimiento.ciudad_poblada": 171,
    "usuarios.geo_sin_consentimiento.latitud_vacia": 171,
    "usuarios.geo_sin_consentimiento.longitud_vacia": 171,
    "usuarios.geo_sin_consentimiento.latitud_poblada": 0,
    "usuarios.geo_sin_consentimiento.longitud_poblada": 0,
    "usuarios.geo_sin_consentimiento.lat_xor_lon": 0,
    "usuarios.geo_sin_consentimiento.estado_poblado": 171,
    "usuarios.geo_sin_consentimiento.pais_poblado": 171,
    "usuarios.geo_sin_consentimiento.zona_horaria_poblada": 171,
    "usuarios.geo_con_consentimiento.n": 897,
    "usuarios.geo_con_consentimiento.ciudad_poblada": 897,
    "usuarios.geo_con_consentimiento.latitud_vacia": 104,
    "usuarios.geo_con_consentimiento.longitud_vacia": 104,
    "usuarios.geo_con_consentimiento.latitud_poblada": 793,
    "usuarios.geo_con_consentimiento.longitud_poblada": 793,
    "usuarios.geo_con_consentimiento.lat_xor_lon": 0,
    "usuarios.geo_con_consentimiento.estado_poblado": 897,
    "usuarios.geo_con_consentimiento.pais_poblado": 897,
    "usuarios.geo_con_consentimiento.zona_horaria_poblada": 897,
    "usuarios.pares_estado_ciudad": 21,
    "usuarios.estados_distintos": 21,
    "usuarios.ciudades_distintas": 21,
    "usuarios.estados_con_una_sola_ciudad": 21,
    "usuarios.ciudades_con_un_solo_estado": 21,
    "usuarios.estado.CDMX": 200,
    "usuarios.ciudad.Ciudad de México": 200,
    "usuarios.estado.Yucatán": 158,
    "usuarios.ciudad.Mérida": 158,
    "usuarios.estado.Jalisco": 96,
    "usuarios.ciudad.Guadalajara": 96,
    "usuarios.estado.Nuevo León": 91,
    "usuarios.ciudad.Monterrey": 91,
    "usuarios.estado.Quintana Roo": 61,
    "usuarios.ciudad.Cancún": 61,
    "usuarios.estado.Querétaro": 51,
    "usuarios.ciudad.Querétaro": 51,
    "usuarios.estado.Puebla": 44,
    "usuarios.ciudad.Puebla": 44,
    "usuarios.estado.Tabasco": 41,
    "usuarios.ciudad.Villahermosa": 41,
    "usuarios.estado.Baja California": 39,
    "usuarios.ciudad.Tijuana": 39,
    "usuarios.estado.Buenos Aires": 36,
    "usuarios.ciudad.Buenos Aires": 36,
    "usuarios.estado.Cundinamarca": 35,
    "usuarios.ciudad.Bogotá": 35,
    "usuarios.estado.Guanajuato": 35,
    "usuarios.ciudad.León": 35,
    "usuarios.estado.Campeche": 34,
    "usuarios.ciudad.Campeche": 34,
    "usuarios.estado.California": 23,
    "usuarios.ciudad.Los Ángeles": 23,
    "usuarios.estado.Oaxaca": 23,
    "usuarios.ciudad.Oaxaca": 23,
    "usuarios.estado.Lima": 22,
    "usuarios.ciudad.Lima": 22,
    "usuarios.estado.Veracruz": 20,
    "usuarios.ciudad.Veracruz": 20,
    "usuarios.estado.Región Metropolitana": 20,
    "usuarios.ciudad.Santiago": 20,
    "usuarios.estado.Comunidad de Madrid": 16,
    "usuarios.ciudad.Madrid": 16,
    "usuarios.estado.Chihuahua": 12,
    "usuarios.ciudad.Chihuahua": 12,
    "usuarios.estado.Texas": 11,
    "usuarios.ciudad.Houston": 11,
    "usuarios.pais.México": 905,
    "usuarios.pais.Argentina": 36,
    "usuarios.pais.Colombia": 35,
    "usuarios.pais.Estados Unidos": 34,
    "usuarios.pais.Perú": 22,
    "usuarios.pais.Chile": 20,
    "usuarios.pais.España": 16,
    "usuarios.zonas_horarias_distintas": 13,
    "usuarios.zonas_que_determinan_un_solo_estado": 11,
    "usuarios.zonas_que_agrupan_varios_estados": 2,
    "usuarios.estados_en_america_mexico_city": 8,
    "usuarios.estados_en_america_merida": 2,
    "usuarios.zonas_univocas_mismo_conteo_que_su_estado": True,
    "usuarios.estados_con_una_sola_zona": 21,
    "usuarios.estados_por_zona.America/Mexico_City": [
        "CDMX",
        "Guanajuato",
        "Jalisco",
        "Oaxaca",
        "Puebla",
        "Querétaro",
        "Tabasco",
        "Veracruz",
    ],
    "usuarios.estados_por_zona.America/Merida": ["Campeche", "Yucatán"],
    "usuarios.zona_horaria.America/Mexico_City": 510,
    "usuarios.zona_horaria.America/Merida": 192,
    "usuarios.zona_horaria.America/Monterrey": 91,
    "usuarios.zona_horaria.America/Cancun": 61,
    "usuarios.zona_horaria.America/Tijuana": 39,
    "usuarios.zona_horaria.America/Argentina/Buenos_Aires": 36,
    "usuarios.zona_horaria.America/Bogota": 35,
    "usuarios.zona_horaria.America/Los_Angeles": 23,
    "usuarios.zona_horaria.America/Lima": 22,
    "usuarios.zona_horaria.America/Santiago": 20,
    "usuarios.zona_horaria.Europe/Madrid": 16,
    "usuarios.zona_horaria.America/Chihuahua": 12,
    "usuarios.zona_horaria.America/Chicago": 11,
    "usuarios.rango_edad.18-24": 534,
    "usuarios.rango_edad.25-31": 328,
    "usuarios.rango_edad.32-38": 133,
    "usuarios.rango_edad.39+": 73,
    "usuarios.especie_fursona.Zorro": 154,
    "usuarios.especie_fursona.Perro": 143,
    "usuarios.especie_fursona.Lobo": 141,
    "usuarios.especie_fursona.Gato": 115,
    "usuarios.especie_fursona.Híbrido/Otro": 103,
    "usuarios.especie_fursona.Dragón": 81,
    "usuarios.especie_fursona.Husky": 76,
    "usuarios.especie_fursona.Coyote": 69,
    "usuarios.especie_fursona.Conejo": 62,
    "usuarios.especie_fursona.Reptil": 45,
    "usuarios.especie_fursona.Ave": 41,
    "usuarios.especie_fursona.Tigre": 38,
    "usuarios.interes_principal.Arte digital": 211,
    "usuarios.interes_principal.Videojuegos": 162,
    "usuarios.interes_principal.Convenciones": 105,
    "usuarios.interes_principal.Streaming/Contenido": 102,
    "usuarios.interes_principal.Arte tradicional": 95,
    "usuarios.interes_principal.Cómics": 93,
    "usuarios.interes_principal.Fursuit": 91,
    "usuarios.interes_principal.Música": 79,
    "usuarios.interes_principal.Escritura/Historias": 76,
    "usuarios.interes_principal.Cosplay": 54,
    "usuarios.plataforma_principal.Telegram": 333,
    "usuarios.plataforma_principal.Facebook": 240,
    "usuarios.plataforma_principal.TikTok": 159,
    "usuarios.plataforma_principal.Instagram": 144,
    "usuarios.plataforma_principal.Twitter/X": 102,
    "usuarios.plataforma_principal.Discord": 90,
    "usuarios.es_artista_valores.0": 780,
    "usuarios.es_artista_valores.1": 288,
    "usuarios.estatus.en_riesgo": 421,
    "usuarios.estatus.activo": 390,
    "usuarios.estatus.inactivo": 257,
    "usuarios.columnas_con_pipe": 0,
    "usuarios.numericos.mensajes_30d.n": 1068,
    "usuarios.numericos.mensajes_30d.min": 0,
    "usuarios.numericos.mensajes_30d.max": 817,
    "usuarios.numericos.mensajes_30d.media": 7.832397,
    "usuarios.numericos.mensajes_30d.mediana": 3,
    "usuarios.numericos.reacciones_30d.n": 1068,
    "usuarios.numericos.reacciones_30d.min": 0,
    "usuarios.numericos.reacciones_30d.max": 2026,
    "usuarios.numericos.reacciones_30d.media": 19.962547,
    "usuarios.numericos.reacciones_30d.mediana": 7,
    "usuarios.numericos.eventos_asistidos.n": 1068,
    "usuarios.numericos.eventos_asistidos.min": 0,
    "usuarios.numericos.eventos_asistidos.max": 8,
    "usuarios.numericos.eventos_asistidos.media": 0.464419,
    "usuarios.numericos.eventos_asistidos.mediana": 0,
    "usuarios.numericos.comisiones_compradas.n": 1068,
    "usuarios.numericos.comisiones_compradas.min": 0,
    "usuarios.numericos.comisiones_compradas.max": 5,
    "usuarios.numericos.comisiones_compradas.media": 0.691948,
    "usuarios.numericos.comisiones_compradas.mediana": 0,
    "usuarios.numericos.sentimiento_promedio.n": 1068,
    "usuarios.numericos.sentimiento_promedio.min": -0.768,
    "usuarios.numericos.sentimiento_promedio.max": 1,
    "usuarios.numericos.sentimiento_promedio.media": 0.255006,
    "usuarios.numericos.sentimiento_promedio.mediana": 0.254,
    "usuarios.numericos.latitud.n": 793,
    "usuarios.numericos.latitud.min": -34.6781,
    "usuarios.numericos.latitud.max": 40.4919,
    "usuarios.numericos.latitud.media": 18.101831,
    "usuarios.numericos.latitud.mediana": 20.638,
    "usuarios.numericos.latitud.vacios": 275,
    "usuarios.numericos.longitud.n": 793,
    "usuarios.numericos.longitud.min": -118.3149,
    "usuarios.numericos.longitud.max": -3.6508,
    "usuarios.numericos.longitud.media": -93.604957,
    "usuarios.numericos.longitud.mediana": -99.0733,
    "usuarios.numericos.longitud.vacios": 275,
    "interacciones.filas": 1000,
    "interacciones.columnas": 16,
    "interacciones.filas_completas_duplicadas.claves_repetidas": 0,
    "interacciones.id_interaccion.unicos": 1000,
    "interacciones.id_interaccion.claves_repetidas": 0,
    "interacciones.id_interaccion_patron_I_7digitos": 1000,
    "interacciones.par_id_usuario_id_interaccion.unicos": 1000,
    "interacciones.par_id_usuario_id_interaccion.claves_repetidas": 0,
    "interacciones.nulos.id_interaccion": 0,
    "interacciones.nulos.id_usuario": 0,
    "interacciones.nulos.timestamp": 0,
    "interacciones.nulos.canal": 0,
    "interacciones.nulos.tipo": 0,
    "interacciones.nulos.texto": 144,
    "interacciones.nulos.tema": 0,
    "interacciones.nulos.sentimiento": 0,
    "interacciones.nulos.idioma": 0,
    "interacciones.nulos.pais": 173,
    "interacciones.nulos.estado": 173,
    "interacciones.nulos.ciudad": 173,
    "interacciones.nulos.dispositivo": 0,
    "interacciones.nulos.longitud_texto": 0,
    "interacciones.nulos.reacciones_recibidas": 0,
    "interacciones.nulos.etiquetas": 231,
    "interacciones.timestamp.n": 1000,
    "interacciones.timestamp.min": "2026-10-10T01:56:26Z",
    "interacciones.timestamp.max": "2026-11-08T23:50:15Z",
    "interacciones.timestamp.invalidas": 0,
    "interacciones.idioma.es": 1000,
    "interacciones.geo_pais_estado_ciudad_vacios": 173,
    "interacciones.geo_parcial": 0,
    "interacciones.texto_vacio": 144,
    "interacciones.texto_vacio_por_tipo.reaccion": 144,
    "interacciones.tipo.reaccion": 144,
    "interacciones.longitud_texto_igual_a_len_texto": 856,
    "interacciones.longitud_texto_difiere_de_len_texto": 144,
    "interacciones.canal.Telegram": 304,
    "interacciones.canal.Facebook": 225,
    "interacciones.canal.Instagram": 157,
    "interacciones.canal.TikTok": 137,
    "interacciones.canal.Twitter/X": 101,
    "interacciones.canal.Discord": 76,
    "interacciones.tipo.mensaje": 449,
    "interacciones.tipo.comentario": 251,
    "interacciones.tipo.respuesta_encuesta": 112,
    "interacciones.tipo.rsvp_evento": 44,
    "interacciones.tema.arte_comisiones": 211,
    "interacciones.tema.reglas_moderacion": 175,
    "interacciones.tema.eventos_convenciones": 155,
    "interacciones.tema.videojuegos": 135,
    "interacciones.tema.memes_humor": 104,
    "interacciones.tema.fursuits": 80,
    "interacciones.tema.seguridad_privacidad": 76,
    "interacciones.tema.musica": 64,
    "interacciones.dispositivo.Android": 551,
    "interacciones.dispositivo.iOS": 226,
    "interacciones.dispositivo.Web": 135,
    "interacciones.dispositivo.Escritorio": 88,
    "interacciones.numericos.longitud_texto.n": 1000,
    "interacciones.numericos.longitud_texto.min": 38,
    "interacciones.numericos.longitud_texto.max": 77,
    "interacciones.numericos.longitud_texto.media": 55.603,
    "interacciones.numericos.longitud_texto.mediana": 54,
    "interacciones.numericos.reacciones_recibidas.n": 1000,
    "interacciones.numericos.reacciones_recibidas.min": 0,
    "interacciones.numericos.reacciones_recibidas.max": 19,
    "interacciones.numericos.reacciones_recibidas.media": 2.575,
    "interacciones.numericos.reacciones_recibidas.mediana": 2,
    "interacciones.numericos.sentimiento.n": 1000,
    "interacciones.numericos.sentimiento.min": -0.9,
    "interacciones.numericos.sentimiento.max": 0.95,
    "interacciones.numericos.sentimiento.media": 0.26355,
    "interacciones.numericos.sentimiento.mediana": 0.415,
    "interacciones.columnas_con_pipe": 1,
    "interacciones.campos_con_pipe.etiquetas": 516,
    "interacciones.etiquetas.vacias": 231,
    "interacciones.etiquetas.con_al_menos_una": 769,
    "interacciones.etiquetas.con_pipe": 516,
    "interacciones.etiquetas.cardinalidad.0": 231,
    "interacciones.etiquetas.cardinalidad.1": 253,
    "interacciones.etiquetas.cardinalidad.2": 277,
    "interacciones.etiquetas.cardinalidad.3": 239,
    "interacciones.etiquetas.etiquetas_distintas": 7,
    "interacciones.etiquetas.ocurrencias_totales": 1524,
    "interacciones.etiquetas.max_etiquetas_en_un_registro": 3,
    "interacciones.etiquetas.vocabulario.humor": 232,
    "interacciones.etiquetas.vocabulario.evento": 229,
    "interacciones.etiquetas.vocabulario.aviso": 228,
    "interacciones.etiquetas.vocabulario.arte": 221,
    "interacciones.etiquetas.vocabulario.musica": 208,
    "interacciones.etiquetas.vocabulario.reglas": 206,
    "interacciones.etiquetas.vocabulario.juegos": 200,
    "cruce.interacciones_con_usuario_en_padron": 207,
    "cruce.coinciden_consentimiento_si": 181,
    "cruce.coinciden_consentimiento_no": 26,
    "cruce.interacciones_sin_usuario_en_padron": 793,
    "interacciones.id_usuario_distintos": 750,
    "cruce.usuarios_referenciados_en_interacciones_validas": 136,
    "cruce.id_usuario_huerfanos_distintos": 614,
    "cruce.usuarios_del_padron_sin_interaccion": 932,
    "cruce.ejemplo_I0000410_usuario": "U005764",
    "cruce.ejemplo_I0000410_en_padron": False,
    "cruce.huerfanas_con_geo_completa": 646,
    "cruce.huerfanas_sin_geo": 147,
    "cruce.coinciden_no_con_ciudad": 0,
    "cruce.coinciden_no_sin_ciudad": 26,
    "cruce.coinciden_si_geo_completa": 181,
    "cruce.coinciden_no_geo_vacia": 26,
    "ejemplos.U000001.alias": "PixelZac83",
    "ejemplos.U000001.fecha_ingreso": "21/04/2026",
    "ejemplos.U000001.pais": "México",
    "ejemplos.U000001.estado": "Yucatán",
    "ejemplos.U000001.ciudad": "Mérida",
    "ejemplos.U000001.latitud": "20.936",
    "ejemplos.U000001.longitud": "-89.6843",
    "ejemplos.U000001.zona_horaria": "America/Merida",
    "ejemplos.U000001.rango_edad": "18-24",
    "ejemplos.U000001.especie_fursona": "Reptil",
    "ejemplos.U000001.interes_principal": "Arte digital",
    "ejemplos.U000001.plataforma_principal": "Facebook",
    "ejemplos.U000001.es_artista": "1",
    "ejemplos.U000001.mensajes_30d": "4",
    "ejemplos.U000001.reacciones_30d": "13",
    "ejemplos.U000001.eventos_asistidos": "0",
    "ejemplos.U000001.comisiones_compradas": "0",
    "ejemplos.U000001.sentimiento_promedio": "0.394",
    "ejemplos.U000001.ultima_actividad": "04/10/2026",
    "ejemplos.U000001.estatus": "en_riesgo",
    "ejemplos.U000001.consentimiento_datos": "si",
    "ejemplos.I0001825.id_usuario": "U000852",
    "ejemplos.I0001825.en_padron": True,
    "ejemplos.I0001825.consentimiento_autor": "si",
    "ejemplos.I0001825.timestamp": "2026-10-28T16:59:03Z",
    "ejemplos.I0001825.canal": "Facebook",
    "ejemplos.I0001825.tipo": "comentario",
    "ejemplos.I0001825.texto": "¿Alguien conoce bandas locales de la región?",
    "ejemplos.I0001825.tema": "musica",
    "ejemplos.I0001825.sentimiento": "0.86",
    "ejemplos.I0001825.idioma": "es",
    "ejemplos.I0001825.pais": "México",
    "ejemplos.I0001825.estado": "Yucatán",
    "ejemplos.I0001825.ciudad": "Mérida",
    "ejemplos.I0001825.dispositivo": "Android",
    "ejemplos.I0001825.longitud_texto": "44",
    "ejemplos.I0001825.reacciones_recibidas": "2",
    "ejemplos.I0001825.etiquetas": "",
    "ejemplos.I0000410.id_usuario": "U005764",
    "ejemplos.I0000410.en_padron": False,
    "ejemplos.I0000410.timestamp": "2026-10-31T06:31:24Z",
    "ejemplos.I0000410.canal": "Instagram",
    "ejemplos.I0000410.tipo": "reaccion",
    "ejemplos.I0000410.texto_vacio": True,
    "ejemplos.I0000410.tema": "reglas_moderacion",
    "ejemplos.I0000410.sentimiento": "-0.75",
    "ejemplos.I0000410.idioma": "es",
    "ejemplos.I0000410.pais_vacio": True,
    "ejemplos.I0000410.estado_vacio": True,
    "ejemplos.I0000410.ciudad_vacio": True,
    "ejemplos.I0000410.dispositivo": "Android",
    "ejemplos.I0000410.longitud_texto": "50",
    "ejemplos.I0000410.reacciones_recibidas": "3",
    "ejemplos.I0000410.etiquetas": "arte",
}


def buscar(arbol: dict, ruta: str) -> object:
    actual: object = arbol
    for parte in ruta.split("."):
        if not isinstance(actual, dict) or parte not in actual:
            raise KeyError(ruta)
        actual = actual[parte]
    return actual


def invariantes(arbol: dict) -> list[str]:
    """Relaciones que el documento usa al sumar conteos ya publicados."""
    errores: list[str] = []
    usuarios = arbol["usuarios"]
    interacciones = arbol["interacciones"]
    cruce = arbol["cruce"]

    def exigir(condicion: bool, mensaje: str) -> None:
        if not condicion:
            errores.append(mensaje)

    exigir(
        usuarios["consentimiento"]["si"] + usuarios["consentimiento"]["no"] == usuarios["filas"],
        "consentimiento no suma el padrón",
    )
    exigir(
        usuarios["geo_sin_consentimiento"]["latitud_vacia"]
        + usuarios["geo_con_consentimiento"]["latitud_vacia"]
        == usuarios["nulos"]["latitud"],
        "los vacíos de latitud no cuadran con el corte de consentimiento",
    )
    exigir(
        cruce["interacciones_con_usuario_en_padron"] + cruce["interacciones_sin_usuario_en_padron"]
        == interacciones["filas"],
        "el cruce no suma las interacciones",
    )
    exigir(
        cruce["coinciden_consentimiento_si"] + cruce["coinciden_consentimiento_no"]
        == cruce["interacciones_con_usuario_en_padron"],
        "el consentimiento del cruce no suma las coincidencias",
    )
    exigir(
        cruce["usuarios_referenciados_en_interacciones_validas"]
        + cruce["usuarios_del_padron_sin_interaccion"]
        == usuarios["filas"],
        "usuarios con y sin interacción no suman el padrón",
    )
    exigir(
        cruce["usuarios_referenciados_en_interacciones_validas"] + cruce["id_usuario_huerfanos_distintos"]
        == interacciones["id_usuario_distintos"],
        "los id_usuario distintos no cuadran con el cruce",
    )
    exigir(
        cruce["huerfanas_con_geo_completa"] + cruce["huerfanas_sin_geo"]
        == cruce["interacciones_sin_usuario_en_padron"],
        "la geografía de las huérfanas no suma",
    )
    exigir(
        interacciones["geo_pais_estado_ciudad_vacios"]
        == cruce["coinciden_no_geo_vacia"] + cruce["huerfanas_sin_geo"],
        "las geografías vacías no cuadran con consentimiento y huérfanas",
    )
    exigir(
        interacciones["texto_vacio"]
        == interacciones["texto_vacio_por_tipo"]["reaccion"]
        == interacciones["tipo"]["reaccion"],
        "el texto vacío no coincide con el tipo reaccion",
    )
    exigir(
        interacciones["longitud_texto_igual_a_len_texto"] + interacciones["longitud_texto_difiere_de_len_texto"]
        == interacciones["filas"],
        "la comparación de longitud_texto no cubre todas las filas",
    )
    exigir(
        interacciones["longitud_texto_difiere_de_len_texto"] == interacciones["texto_vacio"],
        "longitud_texto difiere en filas que sí traen texto",
    )
    cardinalidad = interacciones["etiquetas"]["cardinalidad"]
    exigir(sum(cardinalidad.values()) == interacciones["filas"], "la cardinalidad de etiquetas no suma 1000")
    exigir(
        cardinalidad["2"] + cardinalidad["3"] == interacciones["etiquetas"]["con_pipe"],
        "el separador de etiquetas no coincide con las filas de 2 y 3",
    )
    exigir(
        cardinalidad["1"] + cardinalidad["2"] + cardinalidad["3"]
        == interacciones["etiquetas"]["con_al_menos_una"],
        "las filas con etiqueta no cuadran",
    )
    exigir(
        sum(interacciones["etiquetas"]["vocabulario"].values())
        == interacciones["etiquetas"]["ocurrencias_totales"],
        "las ocurrencias de etiquetas no cuadran",
    )
    for campo in (
        "pais",
        "estado",
        "ciudad",
        "zona_horaria",
        "rango_edad",
        "especie_fursona",
        "interes_principal",
        "plataforma_principal",
        "es_artista_valores",
        "estatus",
    ):
        total = sum(valor for clave, valor in usuarios[campo].items() if clave != "<vacio>")
        exigir(total == usuarios["filas"], f"la distribución de {campo} no suma el padrón")
    for campo in ("canal", "tipo", "tema", "idioma", "dispositivo"):
        total = sum(valor for clave, valor in interacciones[campo].items() if clave != "<vacio>")
        exigir(total == interacciones["filas"], f"la distribución de {campo} no suma las interacciones")
    return errores


def verificar(arbol: dict) -> list[str]:
    errores: list[str] = []
    if not CIFRAS_DOCUMENTO:
        errores.append("CIFRAS_DOCUMENTO está vacío: el documento aún no ancla sus totales.")
    for ruta, esperado in CIFRAS_DOCUMENTO.items():
        try:
            obtenido = buscar(arbol, ruta)
        except KeyError:
            errores.append(f"{ruta}: ruta inexistente")
            continue
        if _numeros(esperado, obtenido):
            if not math.isclose(float(obtenido), float(esperado), rel_tol=0, abs_tol=1e-9):
                errores.append(f"{ruta}: documentado={esperado} calculado={obtenido}")
        elif obtenido != esperado:
            errores.append(f"{ruta}: documentado={esperado!r} calculado={obtenido!r}")
    return errores


def _numeros(esperado: object, obtenido: object) -> bool:
    return (
        isinstance(esperado, (int, float))
        and isinstance(obtenido, (int, float))
        and not isinstance(esperado, bool)
        and not isinstance(obtenido, bool)
    )


def main() -> int:
    arbol = analizar()
    if "--solo-calcular" in sys.argv:
        json.dump(arbol, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    errores = invariantes(arbol) + verificar(arbol)
    if errores:
        print("VERIFICACION FALLIDA", file=sys.stderr)
        for error in errores:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"VERIFICACION OK: {len(CIFRAS_DOCUMENTO)} cifras coinciden con los CSV.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
