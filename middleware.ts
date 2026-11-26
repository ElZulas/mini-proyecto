import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Extensiones y rutas que no deben verse ni explorarse desde el navegador. */
const EXTENSIONES_BLOQUEADAS =
  /\.(?:php|asp|aspx|jsp|cgi|env|sql|bak|old|swp|ini|cfg|yml|yaml|log|md|csv|json|map|txt|py|sh|ps1|bat|cmd|pem|key|crt|p12|pfx)$/i;

const RUTAS_INTERNAS =
  /^\/(?:data|scripts|docs|\.certs|\.git|\.env|node_modules|agent-transcripts)(?:\/|$)/i;

function cabecerasSeguridad(respuesta: NextResponse): NextResponse {
  respuesta.headers.set("X-Content-Type-Options", "nosniff");
  respuesta.headers.set("X-Frame-Options", "DENY");
  respuesta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  respuesta.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  respuesta.headers.set("X-DNS-Prefetch-Control", "off");
  respuesta.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    respuesta.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return respuesta;
}

function esNavegacionHtml(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

export function middleware(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  const sesion = request.cookies.get("c360_sesion")?.value;

  // Bloqueo de rutas y archivos internos (CSV, scripts, docs, secretos).
  if (RUTAS_INTERNAS.test(ruta) || EXTENSIONES_BLOQUEADAS.test(ruta)) {
    return cabecerasSeguridad(new NextResponse(null, { status: 404 }));
  }

  // URLs “bonitas”: si alguien pide /algo.html o /algo.php → 404 (sin filtrar estructura).
  if (ruta.includes(".") && !ruta.startsWith("/_next/") && !ruta.startsWith("/favicon")) {
    const ultima = ruta.split("/").pop() ?? "";
    if (ultima.includes(".") && !ultima.startsWith("_")) {
      // Permitir assets estáticos conocidos en /public (svg, png, ico, webp, woff…).
      if (!/\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|css|js)$/i.test(ultima)) {
        return cabecerasSeguridad(new NextResponse(null, { status: 404 }));
      }
    }
  }

  // La API no se “navega” desde el navegador; solo clientes JSON / Postman / fetch.
  if (ruta.startsWith("/api/") && esNavegacionHtml(request) && request.method === "GET") {
    return cabecerasSeguridad(new NextResponse(null, { status: 404 }));
  }

  if (ruta.startsWith("/dashboard") && !sesion) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return cabecerasSeguridad(NextResponse.redirect(login));
  }

  if ((ruta === "/login" || ruta === "/registro") && sesion) {
    const panel = request.nextUrl.clone();
    panel.pathname = "/dashboard";
    return cabecerasSeguridad(NextResponse.redirect(panel));
  }

  // Quitar barra final innecesaria (salvo raíz).
  if (ruta.length > 1 && ruta.endsWith("/")) {
    const limpia = request.nextUrl.clone();
    limpia.pathname = ruta.replace(/\/+$/, "");
    return cabecerasSeguridad(NextResponse.redirect(limpia, 308));
  }

  return cabecerasSeguridad(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Todo excepto estáticos internos de Next y favicon.
     * Así aplicamos cabeceras y bloqueamos extensiones en cualquier ruta.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
