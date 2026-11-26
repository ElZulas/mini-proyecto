"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { motivoLegible, useCuarentena } from "@/hooks/useDatosComunidad";
import { etiquetaLegible } from "@/lib/etiquetas-ui";
import { contar } from "@/lib/kpis";

export default function PaginaRevision() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas, error } = useCuarentena();
  const { oscuro } = useTema();
  const porMotivo = contar(filas.map((f) => f.motivo_rechazo));

  return (
    <SeccionShell
      titulo="En revisión"
      descripcion="Interacciones retenidas por inconsistencias. No se eliminan en silencio: quedan documentadas para auditoría."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "Total", valor: String(filas.length) },
          {
            etiqueta: "Motivo principal",
            valor: porMotivo[0] ? motivoLegible(porMotivo[0].clave) : "—",
          },
          { etiqueta: "Motivos distintos", valor: String(porMotivo.length) },
        ]}
      />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <TablaBase
          columnas={["Id", "Usuario citado", "Motivo", "Canal", "Tema", "Texto"]}
          filas={filas.slice(0, 80).map((fila) => [
            <span key="id" className="font-mono text-xs">{fila.id_interaccion}</span>,
            <span key="u" className="font-mono text-xs">{fila.id_usuario}</span>,
            motivoLegible(fila.motivo_rechazo),
            fila.canal ?? "—",
            fila.tema ? etiquetaLegible(fila.tema) : "—",
            <span key="t" className="max-w-xs truncate block">{fila.texto ?? "—"}</span>,
          ])}
        />
        {filas.length > 80 ? (
          <p className="mt-3 text-xs text-zinc-500">Mostrando 80 de {filas.length} registros en revisión.</p>
        ) : null}
      </div>
    </SeccionShell>
  );
}
