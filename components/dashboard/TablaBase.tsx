"use client";

import type { ReactNode } from "react";

import { useTema } from "@/components/theme/ThemeProvider";

export default function TablaBase({
  columnas,
  filas,
  vacio = "No hay registros para mostrar.",
}: {
  columnas: string[];
  filas: ReactNode[][];
  vacio?: string;
}) {
  const { oscuro } = useTema();

  if (filas.length === 0) {
    return <p className={`text-sm ${oscuro ? "text-zinc-500" : "text-zinc-500"}`}>{vacio}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className={`text-xs uppercase ${oscuro ? "text-zinc-500" : "text-zinc-500"}`}>
          <tr>
            {columnas.map((columna) => (
              <th key={columna} className="py-2 pr-3 font-medium">
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, indice) => (
            <tr key={indice} className={`border-t ${oscuro ? "border-zinc-800" : "border-zinc-200"}`}>
              {fila.map((celda, j) => (
                <td key={j} className="py-2.5 pr-3 align-top">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
