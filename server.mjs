/**
 * Servidor Next.js + Socket.io.
 * WebSocket bidireccional para la Fase 5: la API publica cambios y el dashboard los recibe.
 */
import { createServer } from "node:http";
import { parse } from "node:url";

import next from "next";
import { Server } from "socket.io";

const puerto = Number(process.env.PORT || 3000);
const desarrollo = process.env.NODE_ENV !== "production";

const app = next({ dev: desarrollo, hostname: "localhost", port: puerto });
const manejar = app.getRequestHandler();

await app.prepare();

const servidor = createServer((req, res) => {
  const url = parse(req.url, true);
  manejar(req, res, url);
});

const io = new Server(servidor, {
  path: "/socket.io",
  addTrailingSlash: false,
  cors: { origin: true, credentials: true },
});

globalThis.__community360_io = io;

io.on("connection", (socket) => {
  socket.emit("estado", { conectado: true, en: new Date().toISOString() });
});

servidor.listen(puerto, () => {
  console.log(`> COMMUNITY 360 listo en http://localhost:${puerto}`);
  console.log(`> WebSocket (Socket.io) en path /socket.io`);
});
