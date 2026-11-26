"use client";

import { useTema } from "@/components/theme/ThemeProvider";

type Props = {
  id: string;
  etiqueta: string;
  tipo: "email" | "password" | "text";
  valor: string;
  onChange: (valor: string) => void;
  autoComplete: string;
  minimo?: number;
};

export default function CampoAuth({ id, etiqueta, tipo, valor, onChange, autoComplete, minimo }: Props) {
  const { oscuro } = useTema();

  return (
    <label className={`mt-5 block text-sm ${oscuro ? "text-[var(--texto)]" : "text-[#111827]"}`} htmlFor={id}>
      {etiqueta}
      <input
        id={id}
        type={tipo}
        autoComplete={autoComplete}
        required
        minLength={minimo}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 outline-none transition focus:border-[var(--acento)] focus:ring-2 focus:ring-[var(--acento)]/30 ${
          oscuro
            ? "border-[var(--linea)] bg-[#0a0d13] text-[var(--texto)]"
            : "border-[#d1d5db] bg-white text-[#111827]"
        }`}
      />
    </label>
  );
}
