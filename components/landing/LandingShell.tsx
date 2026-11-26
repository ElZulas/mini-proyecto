"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTema, type Tema } from "@/components/theme/ThemeProvider";

export default function LandingShell({ children }: { children: (tema: Tema) => ReactNode }) {
  const { tema, oscuro } = useTema();

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        oscuro ? "bg-[#07090d] text-[#f4f1ea]" : "bg-[#eef0f3] text-[#111827]"
      }`}
      data-tema={tema}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <p
          className={`font-display text-sm font-bold tracking-[0.2em] transition-colors duration-500 ${
            oscuro ? "text-[#f0a202]" : "text-[#111827]"
          }`}
        >
          COMMUNITY 360
        </p>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className={`hidden rounded-full px-4 py-2 text-sm font-medium transition sm:inline-flex ${
              oscuro ? "text-white/60 hover:text-white" : "text-[#4b5563] hover:text-[#111827]"
            }`}
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              oscuro
                ? "bg-[#f0a202] text-[#140f05] hover:brightness-110"
                : "bg-[#1f2937] text-white hover:bg-black"
            }`}
          >
            Crear cuenta
          </Link>
        </div>
      </header>
      {children(tema)}
    </div>
  );
}
