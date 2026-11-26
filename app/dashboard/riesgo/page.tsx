"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useUsuarios } from "@/hooks/useDatosComunidad";
import { tasaRiesgo } from "@/lib/kpis";

export default function PaginaRiesgo() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas, error } = useUsuarios();
  const { oscuro } = useTema();
  const enRiesgo = filas.filter((fila) => fila.estatus === "en_riesgo");
  const tasa = tasaRiesgo(enRiesgo.length, filas.length);

  return (
    <SeccionShell
      titulo="Riesgo de abandono"
      descripcion="Miembros marcados en riesgo: útil para moderación, retención y seguimiento de participación baja."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "En riesgo", valor: String(enRiesgo.length) },
          { etiqueta: "Tasa", valor: tasa === null ? "—" : `${(tasa * 100).toFixed(1)} %` },
          { etiqueta: "Padron", valor: String(filas.length) },
        ]}
      />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <TablaBase
          columnas={["Id", "Alias", "Mensajes 30d", "Reacciones 30d", "Sentimiento", "Plataforma"]}
          filas={enRiesgo.map((fila) => [
            <span key="id" className="font-mono text-xs">{fila.id_usuario}</span>,
            fila.alias,
            String(fila.mensajes_30d),
            String(fila.reacciones_30d),
            fila.sentimiento_promedio.toFixed(3),
            fila.plataforma_principal,
          ])}
          vacio="No hay miembros en riesgo."
        />
      </div>
    </SeccionShell>
  );
}
