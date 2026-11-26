"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";

import AuthShell from "@/components/AuthShell";
import CampoAuth from "@/components/CampoAuth";
import { abrirSesionServidor } from "@/lib/abrir-sesion";
import { mensajeAuth } from "@/lib/auth-mensajes";
import { auth, configuracionLista } from "@/lib/firebase-client";

export default function RegistroPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    setError("");
    if (clave !== clave2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!auth || !configuracionLista()) {
      setError("La aplicación aún no está configurada para crear cuentas.");
      return;
    }
    setOcupado(true);
    try {
      const credencial = await createUserWithEmailAndPassword(auth, correo.trim(), clave);
      const ok = await abrirSesionServidor(credencial.user);
      if (!ok) {
        setError("La cuenta se creó, pero no se pudo abrir la sesión. Entra desde Iniciar sesión.");
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
      titulo="Crear cuenta"
      subtitulo="Regístrate para consultar el dashboard en tiempo real."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#f0a202] hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={registrar} className="anim-subir-delay-1">
        <CampoAuth
          id="correo"
          etiqueta="Correo"
          tipo="email"
          valor={correo}
          onChange={setCorreo}
          autoComplete="email"
        />
        <CampoAuth
          id="clave"
          etiqueta="Contraseña"
          tipo="password"
          valor={clave}
          onChange={setClave}
          autoComplete="new-password"
          minimo={6}
        />
        <CampoAuth
          id="clave2"
          etiqueta="Confirmar contraseña"
          tipo="password"
          valor={clave2}
          onChange={setClave2}
          autoComplete="new-password"
          minimo={6}
        />
        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={ocupado}
          className="mt-6 w-full rounded-xl bg-[var(--acento)] px-3 py-3 font-semibold text-[#140f05] transition hover:brightness-110 disabled:opacity-60"
        >
          {ocupado ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthShell>
  );
}
