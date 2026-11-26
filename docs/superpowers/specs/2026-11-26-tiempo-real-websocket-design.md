# Tiempo real híbrido — COMMUNITY 360

## Decisión
Firestore es la fuente de verdad. Socket.io cumple la evidencia de WebSockets de la Fase 5. `onSnapshot` sigue recalculando KPIs.

## Flujo
1. Postman llama `POST|PATCH|DELETE /api/interacciones`.
2. La API escribe en Firestore (Admin SDK).
3. La API emite `interaccion` por Socket.io.
4. El dashboard muestra el evento en el feed y actualiza números con `onSnapshot`.
5. El bloque histórico usa SWR sobre `GET /api/analitica` (revalidación al foco).

## Arranque
```bash
npm run dev
```
Servidor custom: `server.mjs` (Next + Socket.io en `/socket.io`).
