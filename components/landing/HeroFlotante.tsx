"use client";

import { useEffect, useState } from "react";

/**
 * Pieza central estilo MetaMask: tarjeta del producto flotando
 * sobre una forma angular con degradado, con parallax suave al mouse.
 */
export default function HeroFlotante() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mover = (evento: MouseEvent) => {
      const x = (evento.clientX / window.innerWidth - 0.5) * 18;
      const y = (evento.clientY / window.innerHeight - 0.5) * 14;
      setOffset({ x, y });
    };
    window.addEventListener("mousemove", mover);
    return () => window.removeEventListener("mousemove", mover);
  }, []);

  return (
    <div className="relative mx-auto flex h-[28rem] w-full max-w-md items-center justify-center sm:h-[32rem]">
      <div className="anim-blob absolute inset-4 -z-0">
        <div style={{ transform: `translate(${offset.x * 0.35}px, ${offset.y * 0.35}px)` }} className="h-full w-full">
          <svg viewBox="0 0 420 460" className="h-full w-full drop-shadow-2xl" aria-hidden>
            <defs>
              <linearGradient id="blobC360" x1="0%" y1="20%" x2="100%" y2="90%">
                <stop offset="0%" stopColor="#f0a202" />
                <stop offset="48%" stopColor="#ff6b4a" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <path
              fill="url(#blobC360)"
              d="M210 18 L390 110 L360 300 L210 442 L60 300 L30 110 Z"
            />
          </svg>
        </div>
      </div>

      <div className="anim-float-card relative z-10 w-[88%]">
        <div
          className="rounded-[1.75rem] border border-white/10 bg-[#0b0d10] p-5 text-white shadow-[0_40px_80px_rgba(0,0,0,0.35)]"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">Comunidad</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">en vivo</span>
          </div>
          <p className="mt-8 text-sm text-white/50">Miembros depurados</p>
          <p className="font-display text-4xl font-bold tracking-tight">1,068</p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">+207 interacciones válidas</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-white/40">Riesgo</p>
              <p className="mt-1 text-lg font-semibold">en_riesgo</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-white/40">Privacidad</p>
              <p className="mt-1 text-lg font-semibold">171 sin geo</p>
            </div>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="anim-barra h-full w-[78%] rounded-full bg-gradient-to-r from-[#f0a202] to-[#2dd4bf]" />
          </div>
        </div>
      </div>
    </div>
  );
}
