/** Lee los campos con nombre de un formulario como textos sin espacios al inicio ni al final. */
export function leerFormulario<T extends string>(formulario: HTMLFormElement): Record<T, string> {
  return Object.fromEntries(
    [...new FormData(formulario).entries()].map(([clave, valor]) => [clave, String(valor).trim()]),
  ) as Record<T, string>
}
