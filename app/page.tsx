"use client";

import Link from "next/link";

import HeroFlotante from "@/components/landing/HeroFlotante";
import LandingShell from "@/components/landing/LandingShell";
import Reveal from "@/components/landing/Reveal";

const capacidades = [
  {
    titulo: "Depuración",
    texto: "ETL reproducible: duplicados, nulos, tipos, cuarentena de huérfanos y bitácora de carga.",
  },
  {
    titulo: "Privacidad",
    texto: "Sin ciudad ni coordenadas cuando consentimiento_datos es no. También en visualizaciones.",
  },
  {
    titulo: "API REST",
    texto: "Consultas históricas y CRUD de interacciones desde Postman, con token y códigos HTTP.",
  },
  {
    titulo: "Tiempo real",
    texto: "WebSocket + onSnapshot: el dashboard reacciona al cambio sin recargar la página.",
  },
];

export default function LandingPage() {
  return (
    <LandingShell>
      {(tema) => {
        const oscuro = tema === "oscuro";
        return (
          <>
            <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-16 pt-6 lg:grid-cols-2 lg:gap-4 lg:pb-24 lg:pt-10">
              <div className="anim-hero-texto max-w-xl">
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.22em] ${
                    oscuro ? "text-[#2dd4bf]" : "text-[#b45309]"
                  }`}
                >
                  Datos en la nube
                </p>
                <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                  Analiza
                  <br />
                  la comunidad.
                  <br />
                  <span className={oscuro ? "text-white/40" : "text-[#6b7280]"}>En vivo.</span>
                </h1>
                <p className={`mt-6 max-w-md text-lg leading-relaxed ${oscuro ? "text-white/55" : "text-[#4b5563]"}`}>
                  Integra el padrón y las interacciones, limpia inconsistencias, respeta el consentimiento
                  geográfico y observa indicadores históricos y reactivos en un solo panel.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/registro"
                    className={`rounded-full px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                      oscuro
                        ? "bg-[#f0a202] text-[#140f05] hover:brightness-110"
                        : "bg-[#111827] text-white hover:bg-black"
                    }`}
                  >
                    Crear cuenta
                  </Link>
                  <Link
                    href="/login"
                    className={`rounded-full border px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                      oscuro
                        ? "border-white/15 bg-white/5 text-white hover:border-[#f0a202]"
                        : "border-[#d1d5db] bg-white text-[#111827] hover:border-[#111827]"
                    }`}
                  >
                    Entrar al panel
                  </Link>
                </div>
              </div>
              <HeroFlotante />
            </section>

            <section
              className={`border-t transition-colors duration-500 ${
                oscuro ? "border-white/10 bg-[#0c1018]" : "border-[#dde1e6] bg-white"
              }`}
            >
              <div className="mx-auto max-w-6xl px-4 py-20">
                <Reveal>
                  <h2 className="max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
                    De CSV rotos a señales claras para moderar, planear y retener.
                  </h2>
                </Reveal>
                <Reveal delayMs={80}>
                  <p className={`mt-5 max-w-2xl text-lg ${oscuro ? "text-white/55" : "text-[#4b5563]"}`}>
                    La comunidad vive en Telegram, Discord, TikTok, Instagram y Facebook. COMMUNITY 360 junta
                    ese rastro: participación, temas calientes, riesgo de abandono y privacidad obligatoria
                    cuando no hay consentimiento de datos.
                  </p>
                </Reveal>

                <div className="mt-12 grid gap-4 sm:grid-cols-2">
                  {capacidades.map((item, indice) => (
                    <Reveal key={item.titulo} delayMs={indice * 90}>
                      <article
                        className={`group h-full rounded-[1.75rem] border p-6 transition duration-500 hover:-translate-y-1 ${
                          oscuro
                            ? "border-white/10 bg-white/[0.03] hover:border-[#f0a202]/40 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                            : "border-[#e5e7eb] bg-[#f8fafc] hover:border-[#f0a202]/50 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                            oscuro ? "text-[#f0a202]" : "text-[#b45309]"
                          }`}
                        >
                          0{indice + 1}
                        </p>
                        <h3 className="mt-3 font-display text-2xl font-bold">{item.titulo}</h3>
                        <p className={`mt-2 ${oscuro ? "text-white/55" : "text-[#4b5563]"}`}>{item.texto}</p>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            <section
              className={`text-white transition-colors duration-500 ${oscuro ? "bg-[#05070b]" : "bg-[#0b0d10]"}`}
            >
              <div className="mx-auto max-w-6xl px-4 py-20">
                <Reveal>
                  <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
                    Privacidad primero.
                    <span className="text-white/45"> Siempre.</span>
                  </h2>
                </Reveal>
                <Reveal delayMs={100}>
                  <p className="mt-5 max-w-2xl text-lg text-white/60">
                    Si un miembro marcó consentimiento_datos = no, su ciudad, latitud, longitud y cualquier
                    pista de ubicación se anulan antes de persistir y no alimentan el mapa analítico.
                  </p>
                </Reveal>
                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  {[
                    ["1,068", "usuarios cargados"],
                    ["207", "interacciones válidas"],
                    ["793", "en cuarentena"],
                  ].map(([valor, nota], indice) => (
                    <Reveal key={nota} delayMs={indice * 100}>
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
                        <p className="font-display text-4xl font-bold text-[#f0a202]">{valor}</p>
                        <p className="mt-2 text-sm text-white/55">{nota}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            <section className={`transition-colors duration-500 ${oscuro ? "bg-[#07090d]" : "bg-[#eef0f3]"}`}>
              <div className="mx-auto max-w-6xl px-4 py-20 text-center">
                <Reveal>
                  <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
                    Donde vive el análisis
                  </h2>
                </Reveal>
                <Reveal delayMs={80}>
                  <p className={`mx-auto mt-4 max-w-xl text-lg ${oscuro ? "text-white/55" : "text-[#4b5563]"}`}>
                    Crea tu cuenta, abre el dashboard y mira cómo un cambio por API se refleja al instante.
                  </p>
                </Reveal>
                <Reveal delayMs={140}>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/registro"
                      className={`rounded-full px-7 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                        oscuro
                          ? "bg-[#f0a202] text-[#140f05] hover:brightness-110"
                          : "bg-[#111827] text-white hover:bg-black"
                      }`}
                    >
                      Crear cuenta hoy
                    </Link>
                    <Link
                      href="/login"
                      className={`rounded-full border px-7 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                        oscuro
                          ? "border-white/15 bg-white/5 text-white"
                          : "border-[#d1d5db] bg-white text-[#111827]"
                      }`}
                    >
                      Ya tengo cuenta
                    </Link>
                  </div>
                </Reveal>
              </div>
            </section>

            <footer
              className={`border-t px-4 py-8 text-center text-xs transition-colors duration-500 ${
                oscuro ? "border-white/10 text-white/40" : "border-[#dde1e6] text-[#6b7280]"
              }`}
            >
              COMMUNITY 360 · Bases de Datos en la Nube · UTM
            </footer>
          </>
        );
      }}
    </LandingShell>
  );
}
