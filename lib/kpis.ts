export interface Punto {
  clave: string;
  total: number;
}

/** Conteo por categoría. El orden es total descendente y, en empate, la clave en español. */
export function contar(valores: string[]): Punto[] {
  const mapa = new Map<string, number>();
  for (const valor of valores) {
    mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave, "es"));
}

/**
 * Tasa de riesgo = usuarios con estatus "en_riesgo" / total de usuarios.
 * Si no hay usuarios, la tasa no está definida.
 */
export function tasaRiesgo(enRiesgo: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return enRiesgo / total;
}

/**
 * Promedio aritmético = Σ valor_i / n.
 * En sentimiento, valor_i es el sentimiento de cada interacción y n es el total observado.
 */
export function promedio(valores: number[]): number | null {
  if (valores.length === 0) {
    return null;
  }
  const suma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return suma / valores.length;
}
