"use client";

import { useTema } from "@/components/theme/ThemeProvider";

export default function ThemeToggle() {
  const { tema, setTema } = useTema();
  const oscuro = tema === "oscuro";

  return (
    <button
      type="button"
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      onClick={() => setTema(oscuro ? "claro" : "oscuro")}
      className={`relative h-10 w-[4.25rem] shrink-0 rounded-full border p-1 transition-colors duration-500 ${
        oscuro ? "border-white/15 bg-[#1a1f2a]" : "border-[#d1d5db] bg-white"
      }`}
    >
      <span
        className={`absolute inset-y-1 left-1 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          oscuro
            ? "translate-x-[1.85rem] bg-[#f0a202] text-[#111827]"
            : "translate-x-0 bg-[#111827] text-[#f8fafc]"
        }`}
      >
        <span className="relative h-4 w-4">
          <svg
            viewBox="0 0 24 24"
            className={`absolute inset-0 h-4 w-4 transition-all duration-500 ${
              oscuro ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className={`absolute inset-0 h-4 w-4 transition-all duration-500 ${
              oscuro ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            }`}
            fill="currentColor"
          >
            <path d="M21 14.3A8.5 8.5 0 0 1 9.7 3 7 7 0 1 0 21 14.3z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
