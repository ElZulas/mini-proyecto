"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useInteracciones } from "@/hooks/useDatosComunidad";
import { etiquetaLegible } from "@/lib/etiquetas-ui";
import { contar } from "@/lib/kpis";

export default function PaginaInteracciones() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas, error } = useInteracciones();
  const { oscuro } = useTema();
  const porCanal = contar(filas.map((f) => f.canal));
  const ordenadas = [...filas].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  return (
    <SeccionShell
      titulo="Interacciones"
      descripcion="Conversaciones válidas de la comunidad: canal, tipo, tema, dispositivo y tono de cada aporte."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "Total", valor: String(filas.length) },
          { etiqueta: "Canal top", valor: porCanal[0]?.clave ?? "—" },
          { etiqueta: "Con texto", valor: String(filas.filter((f) => f.texto).length) },
        ]}
      />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <TablaBase
          columnas={["Id", "Usuario", "Canal", "Tipo", "Tema", "Sentimiento", "Texto"]}
          filas={ordenadas.slice(0, 80).map((fila) => [
            <span key="id" className="font-mono text-xs">{fila.id_interaccion}</span>,
            <span key="u" className="font-mono text-xs">{fila.id_usuario}</span>,
            fila.canal,
            etiquetaLegible(fila.tipo),
            etiquetaLegible(fila.tema),
            fila.sentimiento.toFixed(2),
            <span key="t" className="max-w-xs truncate block">{fila.texto ?? "—"}</span>,
          ])}
        />
        {filas.length > 80 ? (
          <p className="mt-3 text-xs text-zinc-500">Mostrando las 80 más recientes de {filas.length}.</p>
        ) : null}
      </div>
    </SeccionShell>
  );
}
