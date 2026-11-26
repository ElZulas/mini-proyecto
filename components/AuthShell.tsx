"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTema } from "@/components/theme/ThemeProvider";

export default function AuthShell({
  titulo,
  subtitulo,
  children,
  pie,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  pie: ReactNode;
}) {
  const { oscuro } = useTema();

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-500 ${
        oscuro ? "fondo-atmosfera text-[#f4f1ea]" : "bg-[#eef0f3] text-[#111827]"
      }`}
    >
      {oscuro ? <div className="rejilla pointer-events-none absolute inset-0" /> : null}
      <div className="anim-brillo pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-[var(--acento)]/20 blur-3xl" />
      <div className="anim-flotar pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-[var(--acento-2)]/15 blur-3xl" />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="anim-subir relative z-10 w-full max-w-md">
        <Link
          href="/"
          className={`mb-6 inline-block font-display text-sm font-bold tracking-[0.22em] transition hover:brightness-110 ${
            oscuro ? "text-[var(--acento)]" : "text-[#b45309]"
          }`}
        >
          COMMUNITY 360
        </Link>
        <div
          className={`rounded-3xl border p-7 shadow-[0_30px_80px_rgba(0,0,0,0.18)] backdrop-blur transition-colors duration-500 ${
            oscuro ? "border-[var(--linea)] bg-[var(--panel)]/90" : "border-[#e5e7eb] bg-white/90"
          }`}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">{titulo}</h1>
          <p className={`mt-2 text-sm ${oscuro ? "text-[var(--muted)]" : "text-[#6b7280]"}`}>{subtitulo}</p>
          {children}
        </div>
        <p className={`anim-subir-delay-1 mt-5 text-center text-sm ${oscuro ? "text-[var(--muted)]" : "text-[#6b7280]"}`}>
          {pie}
        </p>
      </div>
    </main>
  );
}
