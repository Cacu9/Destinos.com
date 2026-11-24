/** `Object.entries` conservando el tipo de las claves de un mapa de etiquetas. */
export function entradasDe<K extends string>(etiquetas: Record<K, string>): [K, string][] {
  return Object.entries(etiquetas) as [K, string][]
}
