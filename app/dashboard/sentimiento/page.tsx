"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useInteracciones } from "@/hooks/useDatosComunidad";
import { etiquetaLegible } from "@/lib/etiquetas-ui";
import { promedio } from "@/lib/kpis";

export default function PaginaSentimiento() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas, error } = useInteracciones();
  const { oscuro } = useTema();
  const media = promedio(filas.map((f) => f.sentimiento));
  const positivas = filas.filter((f) => f.sentimiento >= 0.4).length;
  const negativas = filas.filter((f) => f.sentimiento <= -0.2).length;
  const orden = [...filas].sort((a, b) => b.sentimiento - a.sentimiento);

  return (
    <SeccionShell
      titulo="Sentimiento"
      descripcion="Tono de las conversaciones: promedio general y ejemplos de aportes más positivos o tensos."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "Promedio", valor: media === null ? "—" : media.toFixed(3) },
          { etiqueta: "Más positivos", valor: String(positivas) },
          { etiqueta: "Más tensos", valor: String(negativas) },
        ]}
      />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <h2 className="mb-3 text-sm font-semibold">Más positivos</h2>
        <TablaBase
          columnas={["Sentimiento", "Tema", "Canal", "Texto"]}
          filas={orden.slice(0, 12).map((fila) => [
            fila.sentimiento.toFixed(2),
            etiquetaLegible(fila.tema),
            fila.canal,
            <span key="t" className="max-w-md truncate block">{fila.texto ?? "—"}</span>,
          ])}
        />
      </div>
      <div className={`mt-4 rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <h2 className="mb-3 text-sm font-semibold">Más tensos</h2>
        <TablaBase
          columnas={["Sentimiento", "Tema", "Canal", "Texto"]}
          filas={[...orden].reverse().slice(0, 12).map((fila) => [
            fila.sentimiento.toFixed(2),
            etiquetaLegible(fila.tema),
            fila.canal,
            <span key="t" className="max-w-md truncate block">{fila.texto ?? "—"}</span>,
          ])}
        />
      </div>
    </SeccionShell>
  );
}
