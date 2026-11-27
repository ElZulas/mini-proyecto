"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useUsuarios } from "@/hooks/useDatosComunidad";

export default function PaginaInactivos() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas: inactivos, error } = useUsuarios({ estatus: "inactivo" });
  const { oscuro } = useTema();

  return (
    <SeccionShell
      titulo="Miembros inactivos"
      descripcion="Personas del padrón con poca o nula participación reciente."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras items={[{ etiqueta: "Inactivos", valor: String(inactivos.length) }]} />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <TablaBase
          columnas={["Id", "Alias", "Edad", "Interés", "Plataforma", "Mensajes 30d"]}
          filas={inactivos.map((fila) => [
            <span key="id" className="font-mono text-xs">{fila.id_usuario}</span>,
            fila.alias,
            fila.rango_edad,
            fila.interes_principal,
            fila.plataforma_principal,
            String(fila.mensajes_30d),
          ])}
        />
      </div>
    </SeccionShell>
  );
}
