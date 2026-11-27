"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useUsuarios } from "@/hooks/useDatosComunidad";
import { usePanelAgregado } from "@/hooks/usePanelAgregado";

export default function PaginaRiesgo() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas: enRiesgo, error } = useUsuarios({ estatus: "en_riesgo" });
  const { panel } = usePanelAgregado();
  const { oscuro } = useTema();
  const enRiesgoTotal = panel.por_estatus.find((p) => p.clave === "en_riesgo")?.total ?? enRiesgo.length;

  return (
    <SeccionShell
      titulo="Riesgo de abandono"
      descripcion="Miembros marcados en riesgo: útil para moderación, retención y seguimiento de participación baja."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "En riesgo", valor: String(enRiesgoTotal) },
          {
            etiqueta: "Tasa",
            valor: panel.tasa_riesgo === null ? "—" : `${(panel.tasa_riesgo * 100).toFixed(1)} %`,
          },
          { etiqueta: "Padrón", valor: String(panel.usuarios) },
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
