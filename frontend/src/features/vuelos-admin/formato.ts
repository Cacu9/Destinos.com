import type { DivisaAdmin } from './consultas'

const SIMBOLOS_DIVISA: Record<DivisaAdmin, string> = {
  ARS: '$',
  USD: 'US$',
}

const formatoEntero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const formatoDecimal = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatearPrecioDivisa(valor: string | number, divisa: DivisaAdmin = 'ARS'): string {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return String(valor)
  const texto = Number.isInteger(numero) ? formatoEntero.format(numero) : formatoDecimal.format(numero)
  return `${SIMBOLOS_DIVISA[divisa]} ${texto}`
}

export function formatearFechaHoraCorta(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : formatoFechaHora.format(fecha)
}

export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${String(resto).padStart(2, '0')} min`
}

/** Convierte un ISO datetime del backend a valor de `<input type="datetime-local">` (`YYYY-MM-DDTHH:mm`). */
export function isoAInputLocal(iso?: string): string {
  if (!iso) return ''
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
}

/** Convierte el valor de `<input type="datetime-local">` a ISO-8601 con zona horaria. */
export function inputLocalAIso(valor: string): string {
  if (!valor) return ''
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toISOString()
}
