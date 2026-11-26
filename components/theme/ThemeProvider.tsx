"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "claro" | "oscuro";

const CLAVE = "c360-tema";

interface TemaContexto {
  tema: Tema;
  oscuro: boolean;
  setTema: (tema: Tema) => void;
}

const Contexto = createContext<TemaContexto | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaEstado] = useState<Tema>("oscuro");

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE) ?? window.localStorage.getItem("c360-tema-landing");
    if (guardado === "oscuro" || guardado === "claro") {
      setTemaEstado(guardado);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTemaEstado("claro");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    window.localStorage.setItem(CLAVE, tema);
  }, [tema]);

  function setTema(siguiente: Tema) {
    setTemaEstado(siguiente);
  }

  return <Contexto.Provider value={{ tema, oscuro: tema === "oscuro", setTema }}>{children}</Contexto.Provider>;
}

export function useTema(): TemaContexto {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error("useTema debe usarse dentro de ThemeProvider.");
  }
  return valor;
}
