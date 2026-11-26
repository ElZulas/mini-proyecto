import type { User } from "firebase/auth";

export async function abrirSesionServidor(usuario: User): Promise<boolean> {
  const idToken = await usuario.getIdToken();
  const respuesta = await fetch("/api/sesion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return respuesta.ok;
}
