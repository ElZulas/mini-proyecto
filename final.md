LINEAMIENTOS DE ENTREGA FINAL DEL MINIPROYECTO: COMMUNITY
360
Asignatura: Bases de Datos en la Nube (Unidad III)
Modalidad: Individual
Formato de entrega: Documento formal en formato PDF bajo los lineamientos de las
normas APA 7.ª edición.
Nomenclatura del archivo: PROY_U3_Final_PrimerApellido_Nombre.pdf
Indicaciones Generales
• Enfoque del reporte: No debe ser un manual excesivamente técnico de código,
sino una descripción general, clara y argumentada de la solución creada,
explicando cómo opera el sistema, cómo se estructuraron sus servicios y qué
decisiones arquitectónicas sustentan la base de datos.
• Criterio de evaluación: La extensión en páginas no define la calificación; eviten
texto de relleno.
• Originalidad y Uso Responsable de IA: Todo el documento debe estar redactado
100% con tus propias palabras. Si te apoyas en herramientas de Inteligencia
Artificial para organizar ideas o revisar sintaxis, es tu responsabilidad reescribir,
asimilar y personalizar el contenido; si se detectan rastros evidentes de texto
generado por IA (frases genéricas, estructura mecánica de chat, adjetivos
exagerados o incoherencias con tu propio proyecto), se aplicará una penalización
directa sobre la calificación del reporte.
Estructura Formal del Documento PDF
1. Portada Institucional (APA 7):
o Nombre de la universidad, carrera, asignatura, título formal del proyecto
(COMMUNITY 360: Arquitectura de datos en la nube y dashboard analítico
en tiempo real), nombre completo del alumno y fecha de entrega.
2. Descripción General del Sistema y Solución Planteada:
o Explicación clara de cómo la aplicación web resuelve la integración y
análisis de la comunidad virtual.
o Descripción breve de los módulos integrados: autenticación (Login),
consulta de métricas históricas (REST), actualización en vivo sin recargar la
página (WebSockets) y cumplimiento de privacidad geográfica.
o Resumen de la API desarrollada: indicar explícitamente cuántos endpoints
REST crearon, cuál es el propósito de cada uno y cómo interactúan con el
dashboard.
3. Evolución del Stack Tecnológico:
o Listado de las tecnologías finales utilizadas (base de datos en la nube,
backend, frontend, WebSockets, graficación y plataforma de despliegue).
o Modificaciones respecto a la Fase 1: Indicar si cambiaron alguna
herramienta planteada inicialmente, explicando qué se modificó y por qué
motivo técnico u operativo.
4. Análisis de Base de Datos y Escalabilidad (Enfoque Principal):
o Con base en el motor implementado (SQL, NoSQL o Híbrido), analizar el
comportamiento de la persistencia en la nube:
▪ Soporte ante grandes volúmenes de información: Evaluar si su
arquitectura actual resistiría un crecimiento masivo de usuarios e
interacciones (ej. pasar de 1,000 a cientos de miles de registros en
tiempo real) y qué cuellos de botella surgirían.
▪ Modificaciones propuestas para escalar: Explicar qué cambios
técnicos realizarían en su proyecto para hacerlo escalable ( migración
a un esquema híbrido, agregación de tecnologías entre otros
aspectos).
5. Evidencias del Sistema Desplegado:
o Capturas de pantalla legibles, acompañadas de una breve descripción
funcional de cada vista:
▪ Arquitectura de consumo: Identificar y explicar qué secciones o
indicadores del dashboard se alimentan mediante WebSockets y
cuáles mediante peticiones REST, justificando técnicamente por qué
se eligió cada mecanismo según la frecuencia de cambio de los datos
y su impacto operativo.
▪ Justificación y utilidad de las métricas: Describir cada métrica o
visualización implementada (gráficas de barras, dona, indicadores
dinámicos, etc.), explicando por qué se seleccionó y de qué manera
específica aporta valor para gestionar la comunidad a través de la
información (por ejemplo: detectar usuarios en riesgo de abandono,
identificar temas críticos de moderación o decidir dónde organizar
eventos presenciales).
▪ Pruebas de actualización en vivo: Presentar al menos 3 pruebas
funcionales en captura de pantalla dividida (petición ejecutada desde
Postman —POST, PUT o DELETE— junto con la vista del dashboard
en el navegador), demostrando que los apartados conectados por
WebSockets se actualizan automáticamente en tiempo real sin
recargar la página.
Consideración sobre evidencias: No existe un número mínimo ni máximo fijo de
capturas de pantalla; la cantidad dependerá de la estructura y cantidad de vistas de tu
propio sistema, siempre que cada imagen sea legible y demuestre claramente la
funcionalidad solicitada.
6. Enlaces de Despliegue y Credenciales de Evaluación (Obligatorio):
o Liga pública del proyecto ya desplegado (frontend y backend funcionales
y activos para revisión).
o Usuario docente: Debe estar creado y activo en el sistema el usuario del
profesor con acceso al dashboard usando exactamente los siguientes datos:
▪ Usuario: lizandro.reyes
▪ Correo (en caso de autenticarse con correo):
lizandro.reyes@utmetropolitana.edu.mx
▪ Contraseña: lizandr0_reye$
7. Conclusiones y Referencias Bibliográficas (APA 7):
o Reflexión personal sobre los retos y aprendizajes al desplegar el sistema en
la nube, junto con el listado de fuentes consultadas y citadas en el texto en
formato APA 7.ª edición (en caso de utilizar referencias).