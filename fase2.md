FASE 2 DEL MINIPROYECTO: LIMPIEZA DE DATOS, PROCESAMIENTO Y
CARGA EN LA NUBE
• Modalidad: Individual.
• Formato de entrega: Documento en formato PDF bajo los lineamientos de las
normas APA 7.ª edición.
• Nomenclatura del archivo: PROY_U3_Fase2_PrimerApellido_Nombre.pdf
Indicaciones Generales y Condición de Avance
• Requisito Obligatorio de Validación Previa: No puedes avanzar ni realizar la
entrega de esta Fase 2 si tu Fase 1 no ha sido revisada y validada previamente
por el docente. Antes de desarrollar el script o cargar datos a la nube, deberás
aplicar todas las correcciones señaladas en la retroalimentación de la Fase 1 para
asegurar que tu esquema coincida con el modelo aprobado.
• Originalidad: Toda explicación técnica, análisis de anomalías y conclusiones deben
estar redactados sin RASTROS de IA.
Script de Procesamiento Requerido (ETL)
Desarrollar un script de procesamiento reproducible (en Python, Node.js o el lenguaje
elegido para tu backend) que ejecute secuencialmente las siguientes 8 actividades sobre los
archivos originales (comunidad_virtual_usuarios.csv y
comunidad_virtual_interacciones_1000.csv):
1. Eliminación de registros duplicados mediante criterios de identificación única
(id_usuario, id_interaccion o alias repetidos).
2. Normalización de valores vacíos y nulos (ej. cadenas vacías en reacciones sin
texto, campos faltantes).
3. Estandarización de fechas, categorías y formatos (homologación de zonas
horarias/timestamps, mayúsculas/minúsculas y separación de campos
multivaluados).
4. Validación de tipos de datos (verificación estricta de enteros, flotantes, booleanos
y fechas antes de su inserción).
5. Verificación de referencias entre usuarios e interacciones (asegurar la integridad
lógica mediante id_usuario descartando o aislando registros huérfanos).
6. Eliminación de ciudad, coordenadas y demás información geográfica no
autorizada para todos los usuarios donde consentimiento_datos sea negativo
("no").
7. Generación de archivos depurados (exportación local de los datasets limpios
listos para auditoría).
8. Carga de los registros válidos en la base de datos en la nube aprovisionada en la
Fase 1 (SQL, NoSQL o ambos motores en caso de arquitectura híbrida).
Apartados del Documento PDF
1. Portada:
o Nombre de la universidad, carrera, asignatura, título formal del proyecto,
nombre completo del alumno y fecha de entrega.
2. Auditoría de Calidad y Reglas de Limpieza Aplicadas:
o Descripción técnica redactada con palabras propias de las anomalías
encontradas en los CSV originales (cantidad de duplicados eliminados,
valores nulos normalizados, registros huérfanos detectados y total de
usuarios depurados por falta de consentimiento geográfico).
3. Documentación del Script de Procesamiento (ETL):
o Explicación lógica de cada una de las 8 etapas del script y bloques de código
clave con sintaxis limpia (sin exponer contraseñas ni cadenas de conexión
reales).
4. Evidencia de Ejecución y Carga en la Nube:
o Capturas de pantalla legibles de la terminal/consola mostrando la ejecución
exitosa del script y la generación de los archivos depurados.
o Capturas de pantalla de la consola o panel de la base de datos en la nube
(SQL, NoSQL o ambos si es híbrido) demostrando las tablas o colecciones
creadas, el conteo final de registros cargados y una consulta comprobando
que los usuarios sin consentimiento no conservan datos geográficos.
(Nota: La extensión en páginas no determina la calificación; se evaluará el rigor técnico
de la limpieza de datos, el cumplimiento de las reglas de privacidad, la integridad de la
carga en la nube y la originalidad de la redacción).