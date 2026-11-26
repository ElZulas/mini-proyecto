# COMMUNITY 360: Arquitectura de datos en la nube y dashboard analítico en tiempo real

**Documento de entrega final — Unidad III**  
**Archivo PDF esperado:** `PROY_U3_Final_Irigoyen_Gregorio.pdf`

> Este Markdown reúne la información pedida en `final.md`. Sirve como borrador para pasar a PDF bajo APA 7.ª edición.  
> Sustituye los marcadores `[CAPTURAR…]` y la URL de Vercel cuando tengas las evidencias.

---

## 1. Portada institucional

| Campo | Contenido |
| --- | --- |
| Universidad | Universidad Tecnológica Metropolitana (UTM) |
| Carrera | Ingeniería en Desarrollo de Software Multiplataforma |
| Asignatura | Bases de Datos en la Nube |
| Unidad | Unidad III |
| Título | COMMUNITY 360: Arquitectura de datos en la nube y dashboard analítico en tiempo real |
| Alumno | Saulo Gregorio Irigoyen de la Cruz |
| Modalidad | Individual |
| Fecha de entrega | *[completar con la fecha oficial de entrega]* |

---

## 2. Descripción general del sistema y solución planteada

### 2.1 Qué problema resuelve

COMMUNITY 360 concentra el padrón de una comunidad virtual y sus interacciones en una base documental en la nube (Cloud Firestore). Sobre esos datos se construyó una aplicación web que:

1. Autentica operadores del panel.
2. Calcula indicadores de participación, riesgo y sentimiento.
3. Refresca el dashboard cuando cambian los documentos, sin recargar la página.
4. Respeta el consentimiento: si `consentimiento_datos` es `no`, no se persiste ni se muestra geografía (`ciudad`, `latitud`, `longitud`).

Los CSV originales (`comunidad_virtual_usuarios.csv` e `comunidad_virtual_1000_interacciones.csv`) se depuraron con un ETL en Python. El resultado cargado fue: **1068 usuarios**, **207 interacciones válidas** y **793 registros en cuarentena** (referencias a `id_usuario` inexistentes), sin borrar en silencio los rechazos.

### 2.2 Módulos integrados

| Módulo | Función en el sistema |
| --- | --- |
| Autenticación (Login / Registro) | Firebase Authentication (correo y contraseña). Tras el login se abre una cookie de sesión `httpOnly` (`c360_sesion`) para proteger `/dashboard` y la API. |
| Métricas históricas (REST) | El endpoint `GET /api/analitica` agrega conteos y tasas desde Firestore. El panel histórico las consume con SWR (revalidación). |
| Actualización en vivo | Dos capas: (1) listeners `onSnapshot` de Firestore sobre `usuarios`, `interacciones` y `cuarentena`; (2) Socket.io en el servidor local (`server.mjs`) para emitir eventos cuando la API crea, edita o borra interacciones. En Vercel el vivo del panel se apoya en `onSnapshot` (`NEXT_PUBLIC_SOCKET_IO=0`). |
| Privacidad geográfica | En el ETL y en la API: si el usuario no consiente, se anulan campos de ubicación antes de escribir. El dashboard muestra el KPI “Sin ubicación” con esos 171 miembros. |
| Secciones del panel | Cada tarjeta KPI abre una página dedicada (`/dashboard/miembros`, `/riesgo`, `/interacciones`, etc.) con tablas alimentadas por datos reales. |

### 2.3 Resumen de la API REST

Se implementaron **8 operaciones HTTP** repartidas en **4 rutas** bajo `/api`:

| # | Método y ruta | Propósito | Relación con el dashboard |
| --- | --- | --- | --- |
| 1 | `POST /api/sesion` | Verifica el `idToken` de Firebase y crea la cookie de sesión. | Permite entrar al panel después del login. |
| 2 | `DELETE /api/sesion` | Cierra la cookie de sesión. | Se usa al cerrar sesión. |
| 3 | `GET /api/analitica` | Devuelve KPIs agregados (usuarios, interacciones, cuarentena, tasas, series por canal/tipo/tema/estatus). | Alimenta el bloque histórico vía SWR/REST. |
| 4 | `GET /api/interacciones` | Lista interacciones con filtros opcionales (`canal`, `tipo`, `tema`, `limite`). | Consulta histórica / Postman; el panel vivo prioriza Firestore. |
| 5 | `POST /api/interacciones` | Alta de una interacción (validación de esquema + privacidad + existencia de usuario). | Dispara evento Socket.io; el dashboard refleja el cambio en vivo. |
| 6 | `GET /api/interacciones/[id]` | Lectura de una interacción por id. | Depuración y pruebas. |
| 7 | `PATCH /api/interacciones/[id]` | Actualización parcial. | Misma reacción en vivo vía Socket.io / listeners. |
| 8 | `DELETE /api/interacciones/[id]` | Eliminación. | Idem. |

Todas las rutas de datos exigen autenticación (Bearer token de Firebase o cookie de sesión) y responden con códigos HTTP semánticos (`200`, `201`, `400`, `401`, `404`, `409`, `500`). **No hay formularios CRUD de interacciones en el dashboard**; esas operaciones se prueban desde Postman, como pide la rúbrica.

---

## 3. Evolución del stack tecnológico

### 3.1 Tecnologías finales

| Capa | Tecnología |
| --- | --- |
| Base de datos en la nube | Firebase Cloud Firestore (NoSQL documental) |
| Autenticación | Firebase Authentication (correo/contraseña) + cookie de sesión |
| Backend / API | Next.js App Router (Route Handlers) + Firebase Admin SDK |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Tiempo real | Firestore `onSnapshot` + Socket.io (servidor local `server.mjs`, path `/socket.io`) |
| Graficación | Recharts (barras, dona/pastel) |
| ETL (Fase 2) | Python 3, Pandas, Firebase Admin SDK |
| Despliegue | Vercel (frontend + API serverless) |
| Control de versiones | GitHub (`ElZulas/mini-proyecto`) |

### 3.2 Cambios respecto a la Fase 1

En la Fase 1 se eligió Firestore y una aplicación Next.js con autenticación Firebase. Eso se mantuvo. Los ajustes operativos fueron:

1. **Servidor híbrido local:** además de los listeners de Firestore (equivalente reactivo pedido), se añadió Socket.io sobre un `server.mjs` propio para evidenciar WebSockets frente a Postman, porque el docente pidió ese canal de forma explícita.
2. **Despliegue en Vercel:** el runtime serverless de Vercel no ejecuta el `server.mjs` de forma persistente. Por eso en producción se desactiva Socket.io con `NEXT_PUBLIC_SOCKET_IO=0` y el panel sigue actualizándose con `onSnapshot`. Localmente (`npm run dev`) conviven ambos mecanismos.
3. **Sesión por cookie:** además del Bearer token (útil en Postman), el navegador usa cookie `httpOnly` para no exponer el token en el front y proteger rutas con middleware.
4. **URLs y seguridad de borde:** middleware con cabeceras de seguridad, bloqueo de rutas/extensiones internas y preparación para HTTPS en Vercel.

No se cambió el paradigma documental ni el proveedor de nube elegidos en Fase 1; se refinó la forma de consumir y desplegar.

---

## 4. Análisis de base de datos y escalabilidad

### 4.1 Comportamiento del motor (Firestore)

Firestore almacena documentos en colecciones (`usuarios`, `interacciones`, `cuarentena`, `operadores`). El modelo evita JOINs: las interacciones referencian `id_usuario` y la integridad referencial se resolvió en el ETL (huérfanos → cuarentena). Lecturas del dashboard usan listeners o lecturas Admin en la API.

**Ante un crecimiento de 1 000 a cientos de miles de registros**, la arquitectura actual aguantaría el almacenamiento y la escritura dispersa, pero aparecerían cuellos de botella en:

1. **Lecturas completas de colección** en `GET /api/analitica` e, en menor medida, en agregaciones hechas en el cliente tras `onSnapshot` de colecciones enteras. A escala grande eso implica más lecturas facturadas y más memoria en el navegador.
2. **Falta de agregados precalculados:** hoy las tasas y conteos se derivan al vuelo. Con alto volumen conviene materializar KPIs.
3. **Índices y consultas filtradas:** filtros combinados (canal + fecha + tema) exigirían índices compuestos y paginación; hoy varias consultas traen el conjunto y filtran en memoria.
4. **WebSocket en un solo proceso:** el Socket.io local no escala horizontalmente sin un adaptador (Redis) o un servicio dedicado.

### 4.2 Modificaciones propuestas para escalar

1. **Colección (o documentos) de agregados:** un job o Cloud Function que actualice `kpis/resumen` al escribir interacciones; el dashboard escucharía un documento chico en lugar de toda la colección.
2. **Paginación y consultas acotadas:** `limit` + cursores en Firestore; el histórico REST ya limita resultados, pero el vivo debería hacer lo mismo por ventana de tiempo.
3. **Esquema híbrido selectivo:** mantener Firestore para el operativo en tiempo real y, si se necesitan reportes pesados, exportar a BigQuery o a un almacén columnar para analítica batch.
4. **Capa de mensajería gestionada:** sustituir o complementar Socket.io local por un servicio con fan-out horizontal (por ejemplo Firebase Cloud Messaging / un bus con Redis) si el requisito de WebSocket debe vivir también en producción multi-instancia.
5. **Reglas e índices alineados al crecimiento:** índices por `timestamp`, `canal`, `estatus` y retención/archivado de interacciones viejas.

---

## 5. Evidencias del sistema desplegado

> Insertar capturas legibles en el PDF. Abajo va el texto que debe acompañar cada bloque.

### 5.1 Arquitectura de consumo (REST vs tiempo real)

| Sección / indicador | Mecanismo | Justificación |
| --- | --- | --- |
| KPIs del panel vivo (miembros, riesgo, interacciones, sentimiento, en revisión, sin ubicación, activos/inactivos) | Firestore `onSnapshot` (+ aviso Socket.io cuando la API muta) | Cambian con alta frecuencia operativa; el usuario debe ver el efecto de un POST/PATCH/DELETE sin F5. |
| Gráficas del panel vivo (canal, tipo, tema, estatus, etc.) | Calculadas en cliente a partir de los snapshots | Misma fuente viva; evita otro round-trip REST por cada tick. |
| Panel / bloque histórico de analítica | `GET /api/analitica` + SWR | Agregado puntual, coste controlable, útil para contrastar una foto consolidada; no hace falta un socket solo para un resumen. |
| CRUD de interacciones | REST (`POST` / `PATCH` / `DELETE`) desde Postman | El dashboard no edita interacciones; la API es la puerta de escritura autenticada. |

**[CAPTURAR]** Vista general del dashboard con KPIs y gráficas.  
**[CAPTURAR]** Landing + login.  
**[CAPTURAR]** Una sección dedicada (por ejemplo Miembros o En revisión).

### 5.2 Justificación y utilidad de las métricas

| Métrica / visualización | Por qué está | Valor para gestionar la comunidad |
| --- | --- | --- |
| Miembros (1068) | Tamaño del padrón | Dimensión base de cualquier decisión de moderación o eventos. |
| Tasa de riesgo + tarjeta “En riesgo” | `%` de `estatus = en_riesgo` | Detectar abandono potencial y priorizar campañas de reactivación. |
| Activos / Inactivos | Segmentación por estatus | Separar a quienes participan de quienes ya no aparecen. |
| Interacciones válidas | Volumen de mensajes/comentarios/reacciones limpios | Medir actividad real tras el ETL. |
| En revisión (cuarentena, 793) | Huérfanos e inconsistencias | Cola de moderación/datos; no se ocultan errores de integridad. |
| Sentimiento promedio | Tono agregado de textos | Alertar si el clima de la comunidad se deteriora. |
| Sin ubicación (171) | Usuarios sin consentimiento geo | Cumplimiento de privacidad y límite de análisis territorial. |
| Barras por canal | Dónde ocurre la conversación | Decidir en qué plataforma reforzar presencia. |
| Dona / pastel por tipo | Mezcla mensaje vs reacción vs comentario | Entender el estilo de participación. |
| Series por tema / interés / edad (según vista) | Perfil demográfico y temático | Elegir contenidos, moderación y sedes de eventos solo con geo consentida. |

### 5.3 Pruebas de actualización en vivo (mínimo 3)

Para cada prueba: captura dividida **Postman (izquierda) + dashboard (derecha)** sin recargar el navegador.

1. **POST** `/api/interacciones` con Bearer token → aparece la interacción / sube el contador / llega el aviso de cambio reciente.  
2. **PATCH** `/api/interacciones/{id}` → se refleja el campo editado (texto, tema, sentimiento, etc.).  
3. **DELETE** `/api/interacciones/{id}` → desaparece del listado/contadores en vivo.

**[CAPTURAR prueba 1 — POST]**  
**[CAPTURAR prueba 2 — PATCH]**  
**[CAPTURAR prueba 3 — DELETE]**

*Nota operativa:* en local, con `npm run dev` (`server.mjs`), el canal Socket.io refuerza el aviso inmediato. En Vercel, la misma mutación se ve por `onSnapshot` al escribir Firestore.

---

## 6. Enlaces de despliegue y credenciales de evaluación

### 6.1 Liga pública

| Recurso | URL |
| --- | --- |
| Aplicación desplegada (Vercel) | **[PEGAR AQUÍ la URL `https://….vercel.app`]** |
| Repositorio | https://github.com/ElZulas/mini-proyecto |

*Verificar antes de entregar:* login, dashboard con datos reales, secciones KPI y que el dominio esté en **Firebase Authentication → Authorized domains**.

### 6.2 Usuario docente (obligatorio)

| Campo | Valor |
| --- | --- |
| Usuario | `lizandro.reyes` |
| Correo | `lizandro.reyes@utmetropolitana.edu.mx` |
| Contraseña | `lizandr0_reye$` |

Cuenta creada en Firebase Authentication con claim `admin` y registro en la colección `operadores`. Acceso al dashboard con el correo y la contraseña anteriores.

---

## 7. Conclusiones y referencias

### 7.1 Conclusiones (borrador en primera persona — reescribe con tu voz)

Desplegar COMMUNITY 360 obligó a cerrar el ciclo que empezó en el análisis de los CSV: limpiar datos, respetar el consentimiento geográfico, no ocultar los registros huérfanos y consumir Firestore tanto por API como en el navegador. El mayor aprendizaje técnico fue separar **qué debe ser histórico (REST)** de **qué debe ser reactivo (`onSnapshot` / WebSocket)**. En local fue viable demostrar Socket.io junto a Postman; en Vercel hubo que aceptar el modelo serverless y apoyar el vivo en los listeners de Firestore. También quedó claro que agregar en el cliente funciona con ~1 000 documentos, pero no es la forma definitiva de escalar: harían falta agregados materializados e índices más específicos. En conjunto, el proyecto muestra una base documental en la nube operable, con privacidad aplicada y un panel útil para observar riesgo, actividad y calidad de los datos.

### 7.2 Referencias (APA 7.ª edición — ajustar según lo que cites en el PDF)

Firebase. (s. f.). *Cloud Firestore*. Google. https://firebase.google.com/docs/firestore

Firebase. (s. f.). *Firebase Authentication*. Google. https://firebase.google.com/docs/auth

Firebase. (s. f.). *Get realtime updates with Cloud Firestore*. Google. https://firebase.google.com/docs/firestore/query-data/listen

Next.js. (s. f.). *App Router*. Vercel. https://nextjs.org/docs/app

Socket.IO. (s. f.). *Introduction*. https://socket.io/docs/v4/

American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.).

---

## Checklist rápido antes de generar el PDF

- [ ] Portada con fecha correcta  
- [ ] Contar y nombrar los 8 endpoints en el texto final  
- [ ] Pegar URL de Vercel y probar login del profesor  
- [ ] Insertar capturas (dashboard, REST vs vivo, 3 pruebas Postman)  
- [ ] Revisar que no queden frases genéricas; reescribir a tu estilo  
- [ ] Exportar como `PROY_U3_Final_Irigoyen_Gregorio.pdf`  
