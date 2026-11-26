"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase-client";

export default function GuardSesion({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!auth) {
      router.replace("/login");
      return;
    }
    return onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        await fetch("/api/sesion", { method: "DELETE" });
        router.replace("/login");
        return;
      }
      setListo(true);
    });
  }, [router]);

  if (!listo) {
    return <p className="min-h-screen p-8 text-zinc-400">Comprobando sesión…</p>;
  }
  return <>{children}</>;
}
