"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";

import AuthShell from "@/components/AuthShell";
import CampoAuth from "@/components/CampoAuth";
import { abrirSesionServidor } from "@/lib/abrir-sesion";
import { mensajeAuth } from "@/lib/auth-mensajes";
import { auth, configuracionLista } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    setError("");
    if (!auth || !configuracionLista()) {
      setError("La aplicación aún no está configurada para iniciar sesión.");
      return;
    }
    setOcupado(true);
    try {
      const credencial = await signInWithEmailAndPassword(auth, correo.trim(), clave);
      const ok = await abrirSesionServidor(credencial.user);
      if (!ok) {
        setError("No se pudo abrir la sesión. Intenta de nuevo.");
        return;
      }
      router.replace("/dashboard");
    } catch (causa) {
      setError(mensajeAuth(causa instanceof Error ? causa.message : ""));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <AuthShell
      titulo="Entrar"
      subtitulo="Accede al panel analítico de la comunidad."
      pie={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-[#f0a202] hover:underline">
            Crear una
          </Link>
        </>
      }
    >
      <form onSubmit={entrar} className="anim-subir-delay-1">
        <CampoAuth
          id="correo"
          etiqueta="Correo"
          tipo="email"
          valor={correo}
          onChange={setCorreo}
          autoComplete="username"
        />
        <CampoAuth
          id="clave"
          etiqueta="Contraseña"
          tipo="password"
          valor={clave}
          onChange={setClave}
          autoComplete="current-password"
          minimo={6}
        />
        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={ocupado}
          className="mt-6 w-full rounded-xl bg-[var(--acento)] px-3 py-3 font-semibold text-[#140f05] transition hover:brightness-110 disabled:opacity-60"
        >
          {ocupado ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
