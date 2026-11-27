"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import FeedTiempoReal from "@/components/FeedTiempoReal";
import PanelHistorico from "@/components/PanelHistorico";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTema } from "@/components/theme/ThemeProvider";
import { useCanalTiempoReal } from "@/hooks/useCanalTiempoReal";
import { usePanelAgregado } from "@/hooks/usePanelAgregado";
import { CANALES, TEMAS } from "@/lib/dominios";
import { conEtiqueta, etiquetaLegible } from "@/lib/etiquetas-ui";
import { auth } from "@/lib/firebase-client";

const COLORES = ["#f59e0b", "#22d3ee", "#a3e635", "#fb7185", "#c4b5fd", "#38bdf8"];

export default function PanelVivo() {
  const router = useRouter();
  const { panel, vivo: firestoreVivo, error, pulso } = usePanelAgregado();
  const canal = useCanalTiempoReal(true);
  const { oscuro } = useTema();
  const tarjeta = oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white shadow-sm";
  const muted = oscuro ? "text-zinc-400" : "text-zinc-500";
  const suave = oscuro ? "text-zinc-500" : "text-zinc-400";

  const resumen = useMemo(
    () => ({
      tasa: panel.tasa_riesgo,
      sentimiento: panel.sentimiento_promedio,
      sinConsentimiento: panel.sin_consentimiento,
      porCanal: panel.por_canal,
      porTipo: panel.por_tipo,
      porEstatus: panel.por_estatus,
    }),
    [panel],
  );

  const calor = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const celda of panel.calor) {
      mapa.set(`${celda.tema}|${celda.canal}`, celda.total);
    }
    const maximo = Math.max(1, ...mapa.values(), 0);
    return { mapa, maximo };
  }, [panel.calor]);

  const recientes = panel.recientes;

  async function salir() {
    await fetch("/api/sesion", { method: "DELETE" });
    if (auth) {
      await signOut(auth);
    }
    router.replace("/login");
  }

  // Verde si el agregado ya trae datos (aunque el socket de Vercel no exista).
  const enVivo = firestoreVivo || panel.usuarios > 0;
  const colorOk = "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]";
  const colorDatos = enVivo ? colorOk : "bg-zinc-500";
  const colorVivo = enVivo ? colorOk : "bg-amber-400";
  const etiquetaVivo = enVivo
    ? "Actualizaciones en vivo (Firestore)"
    : "Conectando con Firestore…";
  return (
    <main
      className={`min-h-screen transition-colors duration-500 ${
        oscuro ? "bg-zinc-950 text-zinc-100" : "bg-[#eef0f3] text-zinc-900"
      }`}
    >
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={salir}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className={`group inline-flex h-10 w-10 items-center justify-center rounded-full border transition hover:-translate-x-0.5 ${
            oscuro
              ? "border-white/10 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span
            title={enVivo ? "Datos sincronizados" : "Sin conexión a los datos"}
            aria-label={enVivo ? "Datos sincronizados" : "Sin conexión a los datos"}
            className={`h-2.5 w-2.5 rounded-full ${colorDatos}`}
          />
          <span title={etiquetaVivo} aria-label={etiquetaVivo} className={`h-2.5 w-2.5 rounded-full ${colorVivo}`} />
        </div>
      </div>

      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">En vivo</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">COMMUNITY 360</h1>
        <p className={`mt-3 text-base leading-relaxed ${muted}`}>
          Panel de la comunidad: participación, riesgo, temas y privacidad, actualizado al momento.
        </p>
      </header>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      {canal.ultimo ? (
        <p
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            oscuro
              ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
              : "border-amber-500/30 bg-amber-50 text-amber-900"
          }`}
        >
          Cambio reciente: {etiquetaEvento(canal.ultimo.tipo)} · {canal.ultimo.id_interaccion}
        </p>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta
          href="/dashboard/miembros"
          clase={tarjeta}
          muted={suave}
          titulo="Miembros"
          valor={String(panel.usuarios)}
          nota="Total de personas en el padrón de la comunidad."
        />
        <Tarjeta
          href="/dashboard/riesgo"
          clase={tarjeta}
          muted={suave}
          titulo="Tasa de riesgo"
          valor={resumen.tasa === null ? "—" : `${(resumen.tasa * 100).toFixed(1)} %`}
          nota="Porcentaje de miembros en riesgo de abandono."
        />
        <Tarjeta
          href="/dashboard/interacciones"
          clase={tarjeta}
          muted={suave}
          titulo="Interacciones"
          valor={String(panel.interacciones)}
          nota="Mensajes, comentarios y reacciones válidas."
        />
        <Tarjeta
          href="/dashboard/sentimiento"
          clase={tarjeta}
          muted={suave}
          titulo="Sentimiento"
          valor={resumen.sentimiento === null ? "—" : resumen.sentimiento.toFixed(3)}
          nota="Tono promedio de las conversaciones recientes."
        />
        <Tarjeta
          href="/dashboard/revision"
          clase={tarjeta}
          muted={suave}
          titulo="En revisión"
          valor={String(panel.cuarentena)}
          nota="Interacciones retenidas por inconsistencias."
        />
        <Tarjeta
          href="/dashboard/privacidad"
          clase={tarjeta}
          muted={suave}
          titulo="Sin ubicación"
          valor={String(resumen.sinConsentimiento)}
          nota="Miembros que no autorizan datos geográficos."
        />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {resumen.porEstatus.map((punto) => (
          <Tarjeta
            key={punto.clave}
            href={rutaEstatus(punto.clave)}
            clase={tarjeta}
            muted={suave}
            titulo={etiquetaLegible(punto.clave)}
            valor={String(punto.total)}
            nota="Ver el detalle de este grupo."
            compacta
          />
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Grafica clase={tarjeta} titulo="Interacciones por canal">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conEtiqueta(resumen.porCanal)} layout="vertical" margin={{ left: 16, right: 8 }}>
              <XAxis type="number" stroke="#a1a1aa" allowDecimals={false} />
              <YAxis type="category" dataKey="etiqueta" stroke="#a1a1aa" width={88} />
              <Tooltip contentStyle={tooltipDe(oscuro)} />
              <Bar dataKey="total" fill="#f59e0b" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Grafica>
        <Grafica clase={tarjeta} titulo="Interacciones por tipo">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={conEtiqueta(resumen.porTipo)} dataKey="total" nameKey="etiqueta" innerRadius={52} outerRadius={80}>
                {resumen.porTipo.map((punto, indice) => (
                  <Cell key={punto.clave} fill={COLORES[indice % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipDe(oscuro)} />
            </PieChart>
          </ResponsiveContainer>
        </Grafica>
      </section>

      <section className={`mt-4 rounded-2xl border p-4 ${tarjeta}`}>
        <h2 className="text-sm font-semibold">Temas por canal</h2>
        <p className={`mb-3 text-xs ${suave}`}>Qué tanto se habla de cada tema en cada plataforma.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className={`text-left ${suave}`}>Tema</th>
                {CANALES.map((canalItem) => (
                  <th key={canalItem} className={`px-1 ${muted}`}>
                    {canalItem}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEMAS.map((tema) => (
                <tr key={tema}>
                  <td className={`pr-2 ${oscuro ? "text-zinc-300" : "text-zinc-700"}`}>{etiquetaLegible(tema)}</td>
                  {CANALES.map((canalItem) => {
                    const total = calor.mapa.get(`${tema}|${canalItem}`) ?? 0;
                    const alpha = total === 0 ? 0.08 : 0.15 + 0.85 * (total / calor.maximo);
                    return (
                      <td
                        key={canalItem}
                        className="rounded px-1 py-2 text-center font-medium"
                        style={{ backgroundColor: `rgba(245, 158, 11, ${alpha})`, color: alpha > 0.55 ? "#18181b" : "#fafafa" }}
                      >
                        {total}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mt-4 rounded-2xl border p-4 ${tarjeta}`}>
        <h2 className="text-sm font-semibold">Últimas interacciones</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={`text-xs uppercase ${suave}`}>
              <tr>
                <th className="py-2">Id</th>
                <th>Usuario</th>
                <th>Canal</th>
                <th>Tipo</th>
                <th>Tema</th>
                <th>Sentimiento</th>
                <th>Texto</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((fila) => (
                <tr key={fila.id_interaccion} className={`border-t ${oscuro ? "border-zinc-800" : "border-zinc-200"}`}>
                  <td className="py-2 font-mono text-xs">{fila.id_interaccion}</td>
                  <td className="font-mono text-xs">{fila.id_usuario}</td>
                  <td>{fila.canal}</td>
                  <td>{etiquetaLegible(fila.tipo)}</td>
                  <td>{etiquetaLegible(fila.tema)}</td>
                  <td>{fila.sentimiento.toFixed(2)}</td>
                  <td className={`max-w-xs truncate ${muted}`}>{fila.texto ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FeedTiempoReal estado={canal.estado} eventos={canal.eventos} firestoreVivo={enVivo} />
      <PanelHistorico />

      <footer className={`mt-10 border-t pt-4 text-xs ${oscuro ? "border-white/10" : "border-zinc-200"} ${muted}`}>
        {pulso > 0
          ? `Última actualización · ${new Date(pulso).toLocaleTimeString("es-MX")}`
          : "Esperando la primera actualización…"}
      </footer>
    </div>
    </main>
  );
}

function tooltipDe(oscuro: boolean) {
  return oscuro
    ? { background: "#18181b", border: "1px solid #3f3f46", color: "#fafafa" }
    : { background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" };
}

function etiquetaEvento(tipo: string): string {
  if (tipo === "creada") return "nueva interacción";
  if (tipo === "modificada") return "interacción actualizada";
  if (tipo === "eliminada") return "interacción eliminada";
  return tipo;
}

function rutaEstatus(clave: string): string {
  if (clave === "en_riesgo") return "/dashboard/riesgo";
  if (clave === "activo") return "/dashboard/activos";
  if (clave === "inactivo") return "/dashboard/inactivos";
  return "/dashboard/miembros";
}

function Tarjeta({
  titulo,
  valor,
  nota,
  clase,
  muted,
  href,
  compacta = false,
}: {
  titulo: string;
  valor: string;
  nota: string;
  clase: string;
  muted: string;
  href: string;
  compacta?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-amber-400/50 ${clase}`}
    >
      <span
        aria-hidden
        className={`absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm transition group-hover:translate-x-0.5 group-hover:border-amber-400/60 group-hover:text-amber-300 ${muted}`}
      >
        →
      </span>
      <p className={`pr-8 text-xs uppercase tracking-wide ${muted}`}>{titulo}</p>
      <p className={`mt-2 font-semibold ${compacta ? "text-2xl" : "text-3xl"}`}>{valor}</p>
      {nota ? <p className={`mt-2 text-xs ${muted}`}>{nota}</p> : null}
    </Link>
  );
}

function Grafica({ titulo, children, clase }: { titulo: string; children: ReactNode; clase: string }) {
  return (
    <article className={`h-80 rounded-2xl border p-4 ${clase}`}>
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      <div className="h-64">{children}</div>
    </article>
  );
}
