export function mensajeAuth(codigo: string): string {
  const texto = codigo.toLowerCase();
  if (texto.includes("email-already-in-use")) {
    return "Ese correo ya tiene una cuenta. Prueba iniciar sesión.";
  }
  if (texto.includes("weak-password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (texto.includes("invalid-email")) {
    return "El correo no es válido.";
  }
  if (
    texto.includes("invalid-credential") ||
    texto.includes("wrong-password") ||
    texto.includes("user-not-found")
  ) {
    return "Correo o contraseña incorrectos.";
  }
  if (texto.includes("operation-not-allowed") || texto.includes("configuration-not-found")) {
    return "El acceso por correo aún no está activo en el proyecto.";
  }
  if (texto.includes("too-many-requests")) {
    return "Demasiados intentos. Espera un momento.";
  }
  return "No se pudo completar la operación.";
}
