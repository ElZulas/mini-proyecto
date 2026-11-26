"use client";

import { useTema } from "@/components/theme/ThemeProvider";
import type { EstadoSocket } from "@/hooks/useCanalTiempoReal";
import type { EventoInteraccion } from "@/lib/eventos-tiempo-real";

const ETIQUETA: Record<EventoInteraccion["tipo"], string> = {
  creada: "nueva",
  modificada: "actualizada",
  eliminada: "eliminada",
};

export default function FeedTiempoReal({
  estado,
  eventos,
}: {
  estado: EstadoSocket;
  eventos: EventoInteraccion[];
}) {
  const { oscuro } = useTema();
  const color =
    estado === "conectado" ? "bg-emerald-400" : estado === "conectando" ? "bg-amber-400" : "bg-rose-400";
  const texto =
    estado === "conectado" ? "En vivo" : estado === "conectando" ? "Conectando…" : "Sin conexión en vivo";
  const tarjeta = oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white shadow-sm";
  const item = oscuro ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50";
  const muted = "text-zinc-500";

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${tarjeta}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Actividad reciente</h2>
          <p className={`text-xs ${muted}`}>
            Cambios de interacciones que llegan al panel sin recargar la página.
          </p>
        </div>
        <p
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
            oscuro ? "border-zinc-700" : "border-zinc-300"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${color}`} />
          {texto}
        </p>
      </div>
      {eventos.length === 0 ? (
        <p className={`mt-4 text-sm ${muted}`}>
          Todavía no hay cambios recientes. Cuando se cree, edite o elimine una interacción, aparecerá aquí.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {eventos.map((evento) => (
            <li
              key={`${evento.tipo}-${evento.id_interaccion}-${evento.en}`}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${item}`}
            >
              <span>
                Interacción <span className="font-mono text-amber-500">{evento.id_interaccion}</span>{" "}
                <span>{ETIQUETA[evento.tipo]}</span>
                {evento.canal ? <span className={muted}> · {evento.canal}</span> : null}
              </span>
              <span className={`font-mono text-xs ${muted}`}>{new Date(evento.en).toLocaleTimeString("es-MX")}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
