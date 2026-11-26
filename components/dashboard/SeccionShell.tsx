"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTema } from "@/components/theme/ThemeProvider";

export default function SeccionShell({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  const { oscuro } = useTema();

  return (
    <main
      className={`min-h-screen transition-colors duration-500 ${
        oscuro ? "bg-zinc-950 text-zinc-100" : "bg-[#eef0f3] text-zinc-900"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            title="Volver al panel"
            aria-label="Volver al panel"
            className={`group inline-flex h-10 w-10 items-center justify-center rounded-full border transition hover:-translate-x-0.5 ${
              oscuro
                ? "border-white/10 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>

        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">Detalle</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{titulo}</h1>
          <p className={`mt-3 text-base leading-relaxed ${oscuro ? "text-zinc-400" : "text-zinc-500"}`}>{descripcion}</p>
        </header>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
