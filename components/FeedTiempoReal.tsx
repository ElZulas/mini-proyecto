"use client";

import { useTema } from "@/components/theme/ThemeProvider";
import type { AvisoPanel } from "@/hooks/usePanelAgregado";
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
  avisos = [],
  firestoreVivo = false,
}: {
  estado: EstadoSocket;
  eventos: EventoInteraccion[];
  avisos?: AvisoPanel[];
  firestoreVivo?: boolean;
}) {
  const { oscuro } = useTema();
  const enVivo = firestoreVivo || estado === "conectado";
  const color = enVivo ? "bg-emerald-400" : "bg-amber-400";
  const texto = enVivo ? "En vivo · Firestore" : "Sincronizando…";
  const tarjeta = oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white shadow-sm";
  const item = oscuro ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50";
  const muted = "text-zinc-500";

  const filasSocket = eventos.map((evento) => ({
    key: `ws-${evento.tipo}-${evento.id_interaccion}-${evento.en}`,
    texto: (
      <>
        Interacción <span className="font-mono text-amber-500">{evento.id_interaccion}</span> {ETIQUETA[evento.tipo]}
        {evento.canal ? <span className={muted}> · {evento.canal}</span> : null}
      </>
    ),
    hora: evento.en,
  }));

  const filasAvisos = avisos.map((aviso) => ({
    key: `fs-${aviso.id}`,
    texto: <>{aviso.mensaje}</>,
    hora: aviso.en,
  }));

  const filas = [...filasAvisos, ...filasSocket].slice(0, 12);

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${tarjeta}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Actividad reciente</h2>
          <p className={`text-xs ${muted}`}>
            Avisos del panel cuando Postman crea, edita o elimina (sin recargar).
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
      {filas.length === 0 ? (
        <p className={`mt-4 text-sm ${muted}`}>
          Todavía no hay cambios recientes. Cuando mandes POST/PATCH/DELETE, saldrá aquí el aviso.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filas.map((fila) => (
            <li
              key={fila.key}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${item}`}
            >
              <span>{fila.texto}</span>
              <span className={`font-mono text-xs ${muted}`}>{new Date(fila.hora).toLocaleTimeString("es-MX")}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
