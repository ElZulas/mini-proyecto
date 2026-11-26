"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import ResumenCifras from "@/components/dashboard/ResumenCifras";
import SeccionShell from "@/components/dashboard/SeccionShell";
import TablaBase from "@/components/dashboard/TablaBase";
import { useTema } from "@/components/theme/ThemeProvider";
import { useUsuarios } from "@/hooks/useDatosComunidad";
import { etiquetaLegible } from "@/lib/etiquetas-ui";

export default function PaginaPrivacidad() {
  return (
    <GuardSesion>
      <Contenido />
    </GuardSesion>
  );
}

function Contenido() {
  const { filas, error } = useUsuarios();
  const { oscuro } = useTema();
  const sinUbicacion = filas.filter((fila) => fila.consentimiento_datos === "no");

  return (
    <SeccionShell
      titulo="Sin ubicación"
      descripcion="Miembros que no autorizan el tratamiento de datos geográficos. Su ciudad y coordenadas no se muestran ni se usan en el análisis de mapa."
    >
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      <ResumenCifras
        items={[
          { etiqueta: "Sin consentimiento geo", valor: String(sinUbicacion.length) },
          { etiqueta: "Con consentimiento", valor: String(filas.length - sinUbicacion.length) },
          {
            etiqueta: "Proporción",
            valor: filas.length === 0 ? "—" : `${((sinUbicacion.length / filas.length) * 100).toFixed(1)} %`,
          },
        ]}
      />
      <div className={`rounded-2xl border p-4 ${oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"}`}>
        <TablaBase
          columnas={["Id", "Alias", "Estatus", "Edad", "Interés", "Ubicación"]}
          filas={sinUbicacion.map((fila) => [
            <span key="id" className="font-mono text-xs">{fila.id_usuario}</span>,
            fila.alias,
            etiquetaLegible(fila.estatus),
            fila.rango_edad,
            fila.interes_principal,
            "Oculta por privacidad",
          ])}
          vacio="Todos los miembros autorizan ubicación."
        />
      </div>
    </SeccionShell>
  );
}
