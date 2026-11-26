# AGENTS.md - Proyecto COMMUNITY 360 (Bases de Datos en la Nube)

## Contexto del Proyecto
Sistema web full-stack de análisis de datos comunitarios con persistencia en la nube (Firebase), consultas históricas mediante API REST y actualizaciones reactivas en tiempo real.

## Stack Tecnológico Obligatorio
- **Frontend / Fullstack Framework:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Gráficas y Visualización:** Recharts o Chart.js (responsivo).
- **Base de Datos en la Nube:** Firebase Cloud Firestore (NoSQL Documental).
- **Autenticación:** Firebase Authentication (Correo/Contraseña) + protección de rutas (Middleware / Server-side / Client-side).
- **Tiempo Real:** Firestore `onSnapshot` listeners actuando como mecanismo reactivo equivalente a WebSockets.
- **Procesamiento ETL (Fase 2):** Python 3 + Pandas + Firebase Admin SDK.

## Reglas Críticas de Negocio y Rúbrica (NO VIOLAR)
1. **Privacidad Obligatoria (`consentimiento_datos`):**
   - En `comunidad_virtual_usuarios.csv`, todo usuario con `consentimiento_datos == "no"` TIENE PROHIBIDO persistir información geográfica.
   - Antes de subir a Firestore, se deben eliminar o establecer en `null` los campos: `ciudad`, `latitud`, `longitud` (y cualquier dato que infiera ubicación).
2. **Integridad y Cuarentena (Fase 2):**
   - Al procesar `comunidad_virtual_1000_interacciones.csv`, se debe verificar que `id_usuario` exista en el padrón de usuarios depurado.
   - Las interacciones con `id_usuario` inexistente NO se borran silenciosamente; se deben guardar en una colección separada llamada `cuarentena` (o `rechazos`) y registrarse en una bitácora de ejecución (`etl_log.json` / `.txt`).
   - Eliminar registros duplicados basándose en `id_usuario` e `id_interaccion`.
3. **Restricción del Dashboard (Fase 5 y 6):**
   - **PROHIBIDO** incluir formularios en el dashboard para crear, editar o eliminar interacciones.
   - Las operaciones CRUD sobre interacciones se ejecutarán externamente (vía Postman apuntando a los endpoints de nuestra API REST en `/api/interacciones`), y el dashboard debe reaccionar automáticamente mediante los listeners en tiempo real (`onSnapshot`) sin recargar la página.
4. **Seguridad (Fase 3):**
   - Cero credenciales hardcodeadas. Todo debe ir en `.env.local` (`NEXT_PUBLIC_FIREBASE_...` y `FIREBASE_SERVICE_ACCOUNT_...` para el backend/Admin SDK).
   - Los endpoints de la API REST (`/api/*`) deben validar token de autenticación (Bearer token de Firebase Auth) y validar los esquemas de entrada devolviendo códigos HTTP semánticos (`200`, `201`, `400`, `401`, `404`, `500`).
5. **Datos Reales:**
   - Prohibido usar datos mockeados o estáticos en el dashboard. Todas las métricas deben calcularse dinámicamente a partir de los datos reales en Firestore.

## Estructura de Colecciones en Firestore
- `usuarios` (ID: `id_usuario`): `{ alias, fecha_ingreso, pais, estado, ciudad, latitud, longitud, zona_horaria, rango_edad, especie_fursona, interes_principal, plataforma_principal, es_artista, mensajes_30d, reacciones_30d, eventos_asistidos, comisiones_compradas, sentimiento_promedio, ultima_actividad, estatus, consentimiento_datos }`
- `interacciones` (ID: `id_interaccion`): `{ id_usuario, timestamp, canal, tipo, texto, tema, sentimiento, idioma, pais, estado, ciudad, dispositivo, longitud_texto, reacciones_recibidas, etiquetas }`
- `cuarentena` (ID: `id_interaccion` o auto): `{ ...datos_interaccion, motivo_rechazo, fecha_cuarentena }`

## Convenciones de Código
- Código limpio, modular, tipado estricto con TypeScript en frontend/backend.
- Componentes de UI en estética Dark Mode minimalista y alto contraste.
- Documentar las fórmulas matemáticas de los KPIs en comentarios del código para facilitar la redacción del reporte técnico PDF.

## Entregable Fase 1 (Documento Técnico en PDF)
El documento debe incluir exactamente estos 6 apartados:
1. Portada: Universidad Tecnológica Metropolitana (UTM), Ingeniería en Desarrollo de Software Multiplataforma, asignatura Bases de Datos en la Nube, título "COMMUNITY 360: Arquitectura de datos en la nube y dashboard analítico en tiempo real", alumno Saulo Gregorio Irigoyen de la Cruz, fecha de entrega.
2. Análisis Exploratorio de los CSV:
   - Atributos, tipos, nulos y dependencias de `comunidad_virtual_usuarios.csv` (1068 filas, 22 cols) y `comunidad_virtual_1000_interacciones.csv` (1000 filas, 16 cols).
   - Campos multivaluados (ej. `etiquetas` separadas por `|` como `humor|musica|aviso`) y cómo modelarlos en el paradigma elegido.
   - Relación lógica mediante `id_usuario` (en el cruce actual, 207 interacciones coinciden con usuarios del CSV y 793 quedan sin correspondencia directa -> cuarentena).
   - Estrategia de privacidad: 171 usuarios tienen `consentimiento_datos == "no"` y todos tienen `ciudad` poblada; deben limpiarse/excluirse `ciudad`, `latitud` y `longitud` antes de persistir.
3. Comparativa Técnica SQL vs. NoSQL: Cuadro comparativo propio (estructura, integridad, escalabilidad, procesamiento en tiempo real).
4. Elección Sustentada de Tecnología y Arquitectura: Defensa clara del paradigma y herramientas seleccionadas.
5. Modelado Formal de Datos: Esquema documental (JSON/BSON), tipos, embebidos/referencias e índices (si se usa NoSQL/Firestore).
6. Diccionario de Datos: Tabla formal por colección/entidad con atributo, tipo, llaves/restricciones, obligatoriedad y descripción operativa.


## FASE 2

## Reglas y Requisitos de la Fase 2 (ETL y Carga en la Nube)
- **Condición previa:** Respetar el modelo y los criterios acordados en `docs/fase_1_community_360.md`.
- **8 etapas obligatorias del ETL (`scripts/etl_fase2.py`):**
  1. Eliminación de registros duplicados mediante criterios de identificación única (`id_usuario`, `id_interaccion` o alias repetidos si aplica).
  2. Normalización de valores vacíos y nulos (ej. cadenas vacías en reacciones sin texto -> `null`, campos faltantes).
  3. Estandarización de fechas, categorías y formatos (timestamps/fechas homologadas, categorías estandarizadas y separación de campos multivaluados como `etiquetas` con `|`).
  4. Validación estricta de tipos de datos (enteros, flotantes, booleanos y fechas antes de insertar).
  5. Verificación de referencias entre usuarios e interacciones mediante `id_usuario`, aislando registros huérfanos en cuarentena sin eliminsarlos silenciosamente.
  6. Eliminación/anulación (`null`) de `ciudad`, coordenadas y demás información geográfica no autorizada cuando `consentimiento_datos == "no"`[cite: 9, 10].
  7. Generación de archivos depurados locales en `/data/procesados/` (`usuarios_limpios.csv`, `interacciones_limpias.csv`, `cuarentena.csv` y `bitacora_etl.json`) para auditoría.
  8. Carga de registros válidos y cuarentena a la base de datos en la nube (con modo `--dry-run` y lectura de credenciales desde `.env.local`, nunca hardcodeadas).
- **Entregable Fase 2:** Documento técnico en PDF bajo normas **APA 7.ª edición**, nombrado `PROY_U3_Fase2_Irigoyen_Gregorio.pdf`, con redacción natural y técnica sin clichés ni rastros evidentes de IA.