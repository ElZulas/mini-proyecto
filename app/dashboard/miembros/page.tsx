"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useUsuarios } from "@/hooks/useDatosComunidad";
import { etiquetaLegible } from "@/lib/etiquetas-ui";
import { contar } from "@/lib/kpis";

export default function PaginaMiembros() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas, error } = useUsuarios();
  const { oscuro } = useTema();
  const porInteres = contar(filas.map((f) => f.interes_principal)).slice(0, 5);

  return (
    <SeccionShell
      titulo="Miembros"
      descripcion="Padrón completo de la comunidad: intereses, plataforma, actividad reciente y estatus de participación."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "Total", valor: String(filas.length) },
          { etiqueta: "Artistas", valor: String(filas.filter((f) => f.es_artista).length) },
          { etiqueta: "Interés top", valor: porInteres[0] ? etiquetaLegible(porInteres[0].clave) : "—" },
        ]}
      />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <TablaBase
          columnas={["Id", "Alias", "Estatus", "Edad", "Interés", "Plataforma", "Ciudad"]}
          filas={filas.slice(0, 80).map((fila) => [
            <span key="id" className="font-mono text-xs">{fila.id_usuario}</span>,
            fila.alias,
            etiquetaLegible(fila.estatus),
            fila.rango_edad,
            fila.interes_principal,
            fila.plataforma_principal,
            fila.ciudad ?? "—",
          ])}
        />
        {filas.length > 80 ? (
          <p className="mt-3 text-xs text-zinc-500">Mostrando los primeros 80 de {filas.length} miembros.</p>
        ) : null}
      </div>
    </SeccionShell>
  );
}
