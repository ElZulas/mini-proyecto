# COMMUNITY 360: Limpieza, transformación y carga de datos comunitarios en Firestore

Borrador para el PDF `PROY_U3_Fase2_Irigoyen_Gregorio.pdf`.

Al pasarlo a Word: Times New Roman 12 puntos, interlineado doble, márgenes de 2.54 cm y número de página arriba a la derecha. La portada queda sola en la primera página. Las tablas llevan número y título encima. Este archivo no sustituye las capturas: los recuadros `[CAPTURA: ...]` se reemplazan por la imagen correspondiente.

<div style="page-break-after: always;"></div>

## 1. Portada

Universidad Tecnológica Metropolitana (UTM)

Ingeniería en Desarrollo de Software Multiplataforma

Asignatura: Bases de Datos en la Nube

COMMUNITY 360: Limpieza, transformación y carga de datos comunitarios en Firestore

Saulo Gregorio Irigoyen de la Cruz

24 de noviembre de 2026

Modalidad individual. Fase 2.

<div style="page-break-after: always;"></div>

## 2. Auditoría de calidad y reglas de limpieza aplicadas

La corrida que respalda este apartado es la registrada en `data/procesados/bitacora_etl.json`, con identificador `2026-11-24T20:37:03Z` y cierre `2026-11-24T20:37:04Z`. El modo de esa corrida es `dry-run`: el script leyó los CSV originales, escribió los cuatro archivos de auditoría y no abrió Firestore. Los conteos de abajo salen de esa bitácora y de los CSV depurados.

Los archivos de origen son `comunidad_virtual_usuarios.csv` (1068 filas, 22 columnas) y `comunidad_virtual_1000_interacciones.csv` (1000 filas, 16 columnas). El modelo de destino es el de la Fase 1: colecciones `usuarios`, `interacciones` y `cuarentena` en Cloud Firestore (Irigoyen de la Cruz, 2026).

### 2.1 Balance de la corrida

Tabla 1

*Destino de cada fila recibida en la corrida del 24 de noviembre de 2026*

| Conjunto | Recibidos | Aceptados | Duplicados | Tipo inválido | Cuarentena |
| --- | ---: | ---: | ---: | ---: | ---: |
| Usuarios | 1068 | 1068 | 0 | 0 | — |
| Interacciones | 1000 | 207 | 0 | 0 | 793 |

*Nota.* La suma de control cierra: 1068 = 1068 + 0 + 0, y 1000 = 207 + 793 + 0. Cuarentena no aplica al padrón. El usuario sin consentimiento se acepta; lo que se anula es su geografía.

### 2.2 Duplicados

La primera etapa busca `id_usuario` repetido y `alias` repetido en el padrón, y `id_interaccion` repetido o par (`id_usuario`, `id_interaccion`) repetido en las interacciones. Conserva la primera aparición y anota la siguiente.

En estos dos archivos el excedente es cero. Los 1068 identificadores de usuario y los 1068 alias ya venían distintos. Las 1000 interacciones traen 1000 `id_interaccion` distintos y 1000 pares distintos. La regla queda activa para una exportación posterior; en esta muestra no hubo filas que descartar.

### 2.3 Vacíos normalizados a null

Una celda en blanco, o con solo espacios, pasa a null. En el CSV depurado el null se ve como celda vacía. En Firestore el valor es null, no una cadena vacía.

Tabla 2

*Celdas vacías convertidas a null*

| Archivo | Campo | Celdas |
| --- | --- | ---: |
| Usuarios | latitud | 275 |
| Usuarios | longitud | 275 |
| Interacciones | texto | 144 |
| Interacciones | pais | 173 |
| Interacciones | estado | 173 |
| Interacciones | ciudad | 173 |
| Interacciones | etiquetas | 231 |

*Nota.* El resto de columnas llegó sin celdas vacías. Latitud y longitud vienen juntas: no hay fila con una sola coordenada. Las 173 geografías vacías de las interacciones también vienen juntas; no hay país sin estado o ciudad a medias.

Las 144 celdas de `texto` vacío son reacciones, y el archivo trae 144 filas de tipo `reaccion`. El texto vacío es el formato de ese tipo. `longitud_texto` se conserva como entero reportado; no se recalcula a cero.

Las 231 etiquetas vacías quedan como arreglo vacío (`[]`), no como null, para que el campo exista siempre.

Las 275 coordenadas vacías del padrón no identifican por sí solas al grupo sin consentimiento. De esas 275, 171 pertenecen a usuarios con `consentimiento_datos = no` y 104 a usuarios con consentimiento `si`. El grupo se decide solo con el campo de consentimiento.

### 2.4 Fechas, categorías y etiquetas

`fecha_ingreso` y `ultima_actividad` llegan como `DD/MM/AAAA` y salen como timestamp UTC a las 00:00:00. Las 1068 fechas de ingreso convirtieron. El ejemplo `U000001` pasa de `21/04/2026` a `2026-04-21T00:00:00Z`.

El `timestamp` de la interacción ya venía en UTC con sufijo `Z`. La etapa lo acepta solo si cumple `AAAA-MM-DDThh:mm:ssZ`. Las 1000 filas cumplieron.

Las categorías se recortan y, si el texto coincide sin importar mayúsculas, se reescriben al valor del dominio cerrado de la Fase 1 (estatus, rango de edad, plataforma, canal, tipo, tema, dispositivo, especie, interés, país e idioma). En esta muestra los valores ya estaban en esa forma. Un valor fuera del dominio habría detenido la fila en la validación de tipos.

`etiquetas` se parte por `|`. Cada token se recorta. Las 1000 filas quedaron como arreglo. Una celda con varias etiquetas sale, por ejemplo, como `["juegos", "reglas", "aviso"]`. El vocabulario admitido es humor, evento, aviso, arte, musica, reglas y juegos, con un máximo de tres por evento.

`es_artista` pasa de `0`/`1` a `false`/`true`. En el CSV limpio se escribe `true` o `false`.

### 2.5 Tipos

Antes de aceptar una fila, el script exige el tipo final. En usuarios: identificador `U` más seis dígitos, alias presente, fechas ISO, consentimiento `si` o `no`, dominios categóricos, `es_artista` booleano, cuatro enteros mayores o iguales que cero y `sentimiento_promedio` decimal finito. Latitud y longitud son decimales o null, y tienen que venir las dos o ninguna.

En interacciones: identificador `I` más siete dígitos, `id_usuario` con forma `U` más seis dígitos, timestamp ISO, dominios de canal, tipo, tema, dispositivo e idioma, sentimiento decimal, `longitud_texto` y `reacciones_recibidas` enteros no negativos, y etiquetas dentro del vocabulario. El texto es obligatorio salvo cuando el tipo es `reaccion`.

El resultado fue 1068 usuarios válidos, 0 usuarios inválidos, 1000 interacciones válidas y 0 interacciones con tipo inválido. El motivo `tipo_invalido` existe en la cuarentena para una fila que no parsee; esta corrida no lo usó.

### 2.6 Huérfanos

Después de cerrar el padrón válido, cada interacción se cruza por `id_usuario`. Si el folio está, la fila sigue hacia `interacciones`. Si no está, se copia a `cuarentena` con `motivo_rechazo = id_usuario_inexistente` y `fecha_cuarentena` igual al inicio de la corrida (`2026-11-24T20:37:03Z`). No se borra.

De las 1000 interacciones válidas, 207 citan a un usuario del padrón y 793 no. Esas 793 son todas las filas de `cuarentena.csv` en esta corrida. Un caso comprobado es `I0000410`, que cita a `U005764`. El padrón depurado cubre de `U000001` a `U001068`, y `U005764` no está.

Las 793 conservan la geografía con la que llegaron. No hay un registro de consentimiento al cual aplicar la anulación.

### 2.7 Consentimiento y geografía

171 usuarios tienen `consentimiento_datos = no`. En el CSV original esos 171 ya traían latitud y longitud vacías, y traían poblados `ciudad`, `estado`, `pais` y `zona_horaria`. Dejar la ciudad, el estado, el país o la zona horaria reconstruye la ubicación que las coordenadas ya no muestran: en este padrón el estado determina la ciudad, y 11 de 13 zonas horarias determinan un solo estado (Irigoyen de la Cruz, 2026).

La etapa 6 pone en null, para esos 171, los seis campos: `pais`, `estado`, `ciudad`, `latitud`, `longitud` y `zona_horaria`. El resto del perfil se queda. `U000004` sale con consentimiento `no` y las seis celdas geográficas vacías. `U000001` tiene consentimiento `si`, ciudad Mérida y latitud 20.936.

La misma regla baja a las interacciones cuyo autor no consiente: `pais`, `estado` y `ciudad` del evento quedan en null. En esta muestra son 26 interacciones. Esas 26 ya traían la geografía vacía; la etapa igual las deja en null para que la regla no dependa de cómo venga el siguiente archivo. `I0004553`, del usuario `U000828`, es una de ellas.

Los 897 usuarios con consentimiento `si` conservan país, estado, ciudad y zona horaria. De ellos, 104 siguen sin coordenadas porque el archivo original no las traía. Eso no es una anulación por consentimiento.

## 3. Documentación del script de procesamiento (ETL)

El script es `scripts/etl_fase2.py`. Corre con Python 3 y Pandas. Lee los dos CSV como texto (`dtype=str` y `keep_default_na=False`) para que un vacío no se convierta solo en `NaN` antes de contarlo. La carga a la nube usa Firebase Admin SDK y solo se importa cuando la corrida no es dry-run.

Comando de auditoría, el que produjo la bitácora citada:

```powershell
python scripts/etl_fase2.py --dry-run
```

Comando de carga real, sin esa bandera. Las credenciales salen de `.env.local` o del entorno del proceso. El script no trae proyecto, correo de cuenta de servicio ni llave privada.

```powershell
python scripts/etl_fase2.py
```

Las ocho etapas van en este orden dentro de `procesar`.

### 3.1 Etapa 1. Duplicados

En el padrón se conserva la primera fila de cada `id_usuario`. Si el alias ya apareció en otra fila con otro identificador, la segunda también sale, con motivo `alias_repetido`.

```python
def etapa_1_duplicados(filas, campo_id, campo_extra=None):
    vistos_id, vistos_extra, unicas, duplicadas = set(), set(), [], []
    for fila in filas:
        identificador = (fila.get(campo_id) or "").strip()
        extra = (fila.get(campo_extra) or "").strip() if campo_extra else ""
        if identificador and identificador in vistos_id:
            duplicadas.append({"id": identificador, "motivo": f"{campo_id}_repetido"})
            continue
        if extra and extra in vistos_extra:
            duplicadas.append({"id": identificador, "motivo": f"{campo_extra}_repetido"})
            continue
        if identificador:
            vistos_id.add(identificador)
        if extra:
            vistos_extra.add(extra)
        unicas.append(fila)
    return unicas, duplicadas
```

En las interacciones, `marcar_pares` aplica dos criterios: `id_interaccion` repetido y par (`id_usuario`, `id_interaccion`) repetido. El duplicado no entra a cuarentena. Se cuenta en la bitácora y se queda fuera de los archivos limpios. En esta corrida ambos contadores quedaron en 0.

### 3.2 Etapa 2. Nulos

`texto_limpio` recorta espacios y devuelve `None` si no queda texto. `etapa_2_nulos` recorre cada columna pedida y cuenta esas celdas. Así se separan los 144 textos vacíos, las 231 etiquetas vacías y las 275 coordenadas de cada eje.

```python
def texto_limpio(valor):
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return None
    limpio = " ".join(str(valor).replace("\u00a0", " ").split())
    return limpio or None
```

### 3.3 Etapa 3. Fechas, categorías y etiquetas

La fecha de padrón se interpreta con `%d/%m/%Y` y se guarda como `AAAA-MM-DDT00:00:00Z`. Si no parsea, el texto original sigue adelante y la etapa 4 lo rechaza. El timestamp de la interacción solo se acepta si ya cumple el patrón UTC.

La categoría conocida se reescribe con el mapa `casefold` del dominio. Una categoría desconocida no se inventa: sigue como texto y falla en la validación.

```python
def a_etiquetas(valor):
    if not isinstance(valor, str):
        return []
    etiquetas = []
    for parte in valor.split("|"):
        limpia = texto_limpio(parte)
        if limpia is None:
            continue
        etiquetas.append(MAPAS["etiquetas"].get(limpia.casefold(), limpia))
    return etiquetas
```

### 3.4 Etapa 4. Tipos

`validar_usuario` y `validar_interaccion` devuelven el documento ya tipado o la lista de campos que fallaron. Enteros solo con dígitos y sin signo negativo. Decimales finitos. `es_artista` solo desde `"0"` o `"1"`. El texto de una interacción que no es reacción no puede quedar en null.

Un usuario inválido no se escribe y la bitácora lo marca `invalido`. Una interacción inválida sí se conserva: va a `cuarentena` con `motivo_rechazo = tipo_invalido` y el detalle del campo en la bitácora. Esta corrida no produjo ninguno de los dos casos (0 y 0).

### 3.5 Etapa 5. Referencias

El padrón de comparación es el conjunto de `id_usuario` que pasó la etapa 4, ya sin duplicados ni inválidos. La interacción cuyo folio no está en ese conjunto se aparta. El motivo fijo es `id_usuario_inexistente`.

```python
padron = {str(fila["id_usuario"]) for fila in usuarios_validos}
aceptadas, huerfanas = [], []
for fila in interacciones_validas:
    if str(fila["id_usuario"]) in padron:
        aceptadas.append(fila)
    else:
        huerfanas.append(fila)
```

La corrida separó 207 y 793. Cada huérfana recibe `fecha_cuarentena` con la hora de inicio de la misma corrida, para que el lote se pueda reconstruir.

### 3.6 Etapa 6. Consentimiento

La anulación ocurre después de validar, sobre el documento ya aceptado. Si se hiciera antes, un país vacío por error de captura se confundiría con la regla de privacidad.

```python
CAMPOS_GEO_USUARIO = ("pais", "estado", "ciudad", "latitud", "longitud", "zona_horaria")
CAMPOS_GEO_INTERACCION = ("pais", "estado", "ciudad")

def anular_geo_usuario(fila):
    if fila.get("consentimiento_datos") != "no":
        return False
    for campo in CAMPOS_GEO_USUARIO:
        fila[campo] = None
    return True
```

En las interacciones aceptadas, la anulación de `pais`, `estado` y `ciudad` se aplica solo cuando el autor, ya en el padrón, tiene consentimiento `no`. Fueron 171 usuarios y 26 interacciones. La cuarentena no entra a esta etapa.

### 3.7 Etapa 7. Archivos depurados

La salida queda en `data/procesados/`:

- `usuarios_limpios.csv`, 1068 filas de datos.
- `interacciones_limpias.csv`, 207 filas de datos.
- `cuarentena.csv`, 793 filas de datos, con `motivo_rechazo` y `fecha_cuarentena`.
- `bitacora_etl.json`, con contadores, el resultado de cada etapa y una entrada por fila recibida.

Al escribir el CSV, null se vuelve celda vacía, el booleano se vuelve `true` o `false`, y el arreglo se vuelve JSON. Esas cuatro convenciones están declaradas en la propia bitácora (`nulo_en_csv`, `booleano_en_csv`, `arreglo_en_csv`, `fecha_en_csv`).

```python
def serializar_celda(valor):
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return ""
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, list):
        return json.dumps(valor, ensure_ascii=False)
    if isinstance(valor, float):
        return format(valor, ".10g")
    return str(valor)
```

Antes de escribir, `comprobar` revisa que la bitácora cubra todas las filas, que ningún `id_interaccion` esté a la vez en interacciones y en cuarentena, que todo usuario con consentimiento `no` tenga los seis campos geográficos en null, y que toda interacción aceptada apunte a un usuario del padrón limpio. Si alguna de esas condiciones falla, el script termina con código 1 y no da la corrida por buena.

### 3.8 Etapa 8. Carga en la nube

Con `--dry-run` la etapa imprime que no abre Firestore y no lee credenciales. La bitácora guarda `"modo": "dry-run"` y ceros en `escritos`.

Sin la bandera, `leer_env_local` arma el diccionario desde `.env.local` y, si existen, desde las variables de entorno `FIREBASE_*` o `GOOGLE_APPLICATION_CREDENTIALS`. Acepta el JSON de la cuenta de servicio en `FIREBASE_SERVICE_ACCOUNT_JSON` o `FIREBASE_SERVICE_ACCOUNT`, o una ruta en `FIREBASE_SERVICE_ACCOUNT_PATH`. Si no hay ninguna, la carga se detiene con código 2 después de haber escrito ya los archivos locales. El mensaje de error nombra las variables; no imprime su contenido.

```python
def credencial(env):
    crudo = env.get("FIREBASE_SERVICE_ACCOUNT_JSON") or env.get("FIREBASE_SERVICE_ACCOUNT")
    ruta = env.get("FIREBASE_SERVICE_ACCOUNT_PATH") or env.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not crudo and not ruta:
        raise RuntimeError(
            "Falta la credencial. Define FIREBASE_SERVICE_ACCOUNT_JSON, "
            "FIREBASE_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS en .env.local."
        )
    # El JSON o el archivo se leen aquí. No se registran en la bitácora.
```

La escritura usa el Admin SDK, en lotes de hasta 400 documentos. El identificador del documento es `id_usuario` o `id_interaccion`. Las fechas ISO se convierten a timestamp UTC en el momento del `set`. Colecciones: `usuarios` (fechas `fecha_ingreso` y `ultima_actividad`), `interacciones` (`timestamp`) y `cuarentena` (`timestamp` y `fecha_cuarentena`). Un `set` con el mismo id reemplaza el documento anterior; no borra documentos ajenos a esta corrida.

## 4. Evidencia de ejecución y carga en la nube

La evidencia local ya se puede tomar de la corrida `2026-11-24T20:37:03Z`. La evidencia de Firebase se toma después, con `python scripts/etl_fase2.py` y sin `--dry-run`. Cada recuadro indica qué tiene que verse. Si el número de la captura no coincide con la tabla 1, la captura no sirve para este entregable.

### 4.1 Terminal y archivos locales

[CAPTURA: terminal completa de `python scripts/etl_fase2.py --dry-run`. Tiene que leerse, en orden, usuarios duplicados 0, interacciones duplicadas 0, 550 celdas vacías de usuarios a null, texto vacío 144, etiquetas vacías 231, 1068 fechas homologadas, 1000 etiquetas a arreglo, 1068 usuarios válidos, 0 inválidos, 1000 interacciones válidas, 0 con tipo inválido, 207 con usuario en el padrón, 793 huérfanas, 171 usuarios con geografía anulada, 26 interacciones con geografía anulada, y el resumen final en modo dry-run.]

[CAPTURA: carpeta `data/procesados` con los cuatro archivos `usuarios_limpios.csv`, `interacciones_limpias.csv`, `cuarentena.csv` y `bitacora_etl.json`, y la fecha de modificación del 24 de noviembre de 2026.]

[CAPTURA: inicio de `bitacora_etl.json`. Tienen que leerse `corrida_id` `2026-11-24T20:37:03Z`, `modo` `dry-run`, `usuarios_recibidos` 1068, `usuarios_cargados` 1068, `usuarios_geo_anulada` 171, `interacciones_cargadas` 207, `interacciones_cuarentena` 793, `interacciones_duplicadas` 0 e `interacciones_tipo_invalido` 0.]

[CAPTURA: `usuarios_limpios.csv` abierto en la fila `U000001`. Consentimiento `si`, ciudad Mérida, latitud 20.936, `es_artista` `true`, `fecha_ingreso` `2026-04-21T00:00:00Z`.]

[CAPTURA: `usuarios_limpios.csv` con filtro `consentimiento_datos = no`. El filtro debe dar 171 filas. En cuadro, la fila `U000004` con `pais`, `estado`, `ciudad`, `latitud`, `longitud` y `zona_horaria` vacíos, y el resto de columnas con datos.]

[CAPTURA: `interacciones_limpias.csv` con 207 filas de datos, sin contar el encabezado. Incluir una fila cuya columna `etiquetas` se lea como JSON, por ejemplo `["juegos", "reglas", "aviso"]`.]

[CAPTURA: `cuarentena.csv` con 793 filas de datos. En cuadro, la fila `I0000410`, `id_usuario` `U005764`, `motivo_rechazo` `id_usuario_inexistente` y `fecha_cuarentena` `2026-11-24T20:37:03Z`.]

[CAPTURA: en `interacciones_limpias.csv`, la fila `I0004553` del usuario `U000828`. `pais`, `estado` y `ciudad` vacíos. En la bitácora esa fila está marcada `geo_anulada: true`.]

### 4.2 Consola de Firestore

Estas cuatro capturas se toman en la consola del proyecto de Firebase, o en una consulta del Admin SDK, después de la carga real. El documento de cada colección usa el id de negocio como id del documento.

[CAPTURA: colección `usuarios` con conteo 1068.]

[CAPTURA: colección `interacciones` con conteo 207.]

[CAPTURA: colección `cuarentena` con conteo 793. Visible el documento `I0000410` y el campo `motivo_rechazo` con valor `id_usuario_inexistente`.]

[CAPTURA: documento `usuarios/U000004`. Campo `consentimiento_datos` igual a `no`. Campos `pais`, `estado`, `ciudad`, `latitud`, `longitud` y `zona_horaria` en null. Alias y estatus presentes.]

[CAPTURA: documento `usuarios/U000001`. Campo `consentimiento_datos` igual a `si`. Ciudad Mérida y latitud 20.936 presentes. Sirve para mostrar que la anulación quedó limitada al grupo sin consentimiento.]

[CAPTURA: documento `interacciones/I0004553`. Campo `id_usuario` igual a `U000828`. Campos `pais`, `estado` y `ciudad` en null.]

Consulta de comprobación, en la consola o en un script aparte, sin pegar credenciales en el PDF: filtrar `usuarios` donde `consentimiento_datos == "no"` y contar 171. Abrir uno cualquiera de ese filtro y revisar que los seis campos geográficos estén en null. El conteo tiene que coincidir con `usuarios_geo_anulada` de la bitácora de la carga real. Esa bitácora, a diferencia de la citada en el apartado 2, debe decir `"modo": "carga"` y reportar escritos 1068, 207 y 793.

## Referencias

Irigoyen de la Cruz, S. G. (2026). *COMMUNITY 360: Arquitectura de datos en la nube y dashboard analítico en tiempo real* (Fase 1). Universidad Tecnológica Metropolitana.

Google. (s. f.). *Add the Firebase Admin SDK to your server*. Firebase Documentation. https://firebase.google.com/docs/admin/setup
