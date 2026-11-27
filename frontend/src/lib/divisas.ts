/**
 * Cotización de referencia para mostrar cada precio en pesos y en dólares. La conversión se redondea siempre hacia
 * arriba al entero, así el monto convertido nunca queda por debajo del precio publicado.
 */
export const COTIZACION_USD_ARS = 1450

export type DivisaPrincipal = 'ARS' | 'USD'

const formatoEntero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export function formatearMonto(monto: number, divisa: DivisaPrincipal): string {
  return `${divisa === 'USD' ? 'US$' : '$'} ${formatoEntero.format(Math.ceil(monto))}`
}

/** El mismo monto en la otra divisa (ARS ↔ USD) según la cotización de referencia, redondeado hacia arriba. */
export function convertirDivisa(monto: number, divisa: DivisaPrincipal): { monto: number; divisa: DivisaPrincipal } {
  return divisa === 'USD'
    ? { monto: Math.ceil(monto * COTIZACION_USD_ARS), divisa: 'ARS' }
    : { monto: Math.ceil(monto / COTIZACION_USD_ARS), divisa: 'USD' }
}

/** "US$ 128 USD" o "$ 185.600 ARS": el monto convertido a la otra divisa. */
export function textoEquivalente(monto: number, divisa: string): string | null {
  if (divisa !== 'ARS' && divisa !== 'USD') return null
  const otro = convertirDivisa(monto, divisa)
  return `${formatearMonto(otro.monto, otro.divisa)} ${otro.divisa}`
}
