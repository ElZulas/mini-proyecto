"use client";

import useSWR from "swr";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useTema } from "@/components/theme/ThemeProvider";
import { conEtiqueta } from "@/lib/etiquetas-ui";
import type { Analitica } from "@/lib/tipos";

async function fetcher(url: string): Promise<{ estado: number; datos: Analitica }> {
  const respuesta = await fetch(url, { cache: "no-store" });
  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}`);
  }
  return { estado: respuesta.status, datos: (await respuesta.json()) as Analitica };
}

export default function PanelHistorico() {
  const { oscuro } = useTema();
  const { data, error, isValidating, mutate } = useSWR("/api/analitica", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
  const tarjeta = oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white shadow-sm";
  const muted = "text-zinc-500";
  const tooltip = oscuro
    ? { background: "#18181b", border: "1px solid #3f3f46", color: "#fafafa" }
    : { background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" };

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${tarjeta}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Consulta histórica</h2>
          <p className={`text-xs ${muted}`}>
            Resumen demográfico y de ubicaciones autorizadas. Se actualiza al consultar o al volver a esta pestaña.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void mutate();
          }}
          disabled={isValidating}
          className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {isValidating ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
      {data ? (
        <p className={`mt-3 text-sm ${oscuro ? "text-zinc-300" : "text-zinc-700"}`}>
          Consulta lista
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-400">No se pudo obtener el resumen histórico.</p> : null}
      {data ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-72">
            <p className={`mb-2 text-xs ${muted}`}>Miembros por rango de edad</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={conEtiqueta(data.datos.por_rango_edad)}>
                <XAxis dataKey="etiqueta" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" allowDecimals={false} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="total" fill="#22d3ee" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <p className={`mb-2 text-xs ${muted}`}>Ciudades con ubicación autorizada</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={conEtiqueta(data.datos.ciudades_con_consentimiento)} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" stroke="#a1a1aa" allowDecimals={false} />
                <YAxis type="category" dataKey="etiqueta" stroke="#a1a1aa" width={110} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="total" fill="#a3e635" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
