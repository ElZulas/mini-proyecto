"use client";

import { useTema } from "@/components/theme/ThemeProvider";

export default function ResumenCifras({ items }: { items: Array<{ etiqueta: string; valor: string }> }) {
  const { oscuro } = useTema();
  const tarjeta = oscuro ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white shadow-sm";

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.etiqueta} className={`rounded-2xl border px-4 py-3 ${tarjeta}`}>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{item.etiqueta}</p>
          <p className="mt-1 text-2xl font-semibold">{item.valor}</p>
        </article>
      ))}
    </div>
  );
}
