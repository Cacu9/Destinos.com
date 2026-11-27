import {
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_ORDEN,
  ETIQUETAS_SENTIDO,
  ETIQUETAS_TIPO_VUELO,
  MAXIMO_PASAJEROS,
  type Divisa,
  type FiltrosVuelos,
  type OrdenVuelos,
  type SentidoOrden,
  type Vuelo,
} from './tipos.ts'
import { COTIZACION_USD_ARS } from '../../lib/divisas.ts'

/** Nombre de cada filtro en la URL de la página (y en los campos del formulario). */
const PARAMETROS_URL = {
  flight_type: 'tipo',
  origin: 'origen',
  destination: 'destino',
  category: 'categoria',
  date: 'fecha',
  passengers: 'pasajeros',
  adults: 'mayores',
  children: 'menores',
} as const satisfies Record<keyof FiltrosVuelos, string>

export const PARAMETRO_ORDEN = 'orden'
export const PARAMETRO_SENTIDO = 'sentido'
export const ORDEN_POR_DEFECTO: OrdenVuelos = 'precio'
export const SENTIDO_POR_DEFECTO: SentidoOrden = 'asc'

/** Cotización de referencia en ARS para comparar precios de distintas divisas al ordenar. */
const TASAS_CAMBIO_ARS: Record<Divisa, number> = {
  ARS: 1,
  USD: COTIZACION_USD_ARS,
  EUR: Math.round(COTIZACION_USD_ARS * 1.08),
}

function valorDe<K extends string>(valor: string | null, etiquetas: Record<K, string>): K | undefined {
  return valor && Object.hasOwn(etiquetas, valor) ? (valor as K) : undefined
}

function codigoAeropuerto(valor: string | null): string | undefined {
  const codigo = valor?.trim().toUpperCase()
  return codigo && /^[A-Z]{3}$/.test(codigo) ? codigo : undefined
}

function cantidadPasajeros(valor: string | null): number | undefined {
  const cantidad = Number(valor)
  return Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= MAXIMO_PASAJEROS ? cantidad : undefined
}

/** Lee y valida los filtros de la URL; los valores inválidos se ignoran. */
export function filtrosDesdeParametros(parametros: URLSearchParams): FiltrosVuelos {
  const fecha = parametros.get(PARAMETROS_URL.date)
  return {
    flight_type: valorDe(parametros.get(PARAMETROS_URL.flight_type), ETIQUETAS_TIPO_VUELO),
    origin: codigoAeropuerto(parametros.get(PARAMETROS_URL.origin)),
    destination: codigoAeropuerto(parametros.get(PARAMETROS_URL.destination)),
    category: valorDe(parametros.get(PARAMETROS_URL.category), ETIQUETAS_CATEGORIA),
    date: fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined,
    passengers: cantidadPasajeros(parametros.get(PARAMETROS_URL.passengers)),
    ...(parametros.has(PARAMETROS_URL.adults)
      ? { adults: cantidadPasajeros(parametros.get(PARAMETROS_URL.adults)) }
      : {}),
    ...(parametros.has(PARAMETROS_URL.children)
      ? { children: cantidadPasajeros(parametros.get(PARAMETROS_URL.children)) }
      : {}),
    ...(parametros.has(PARAMETROS_URL.adults)
      ? { adults: cantidadPasajeros(parametros.get(PARAMETROS_URL.adults)) }
      : {}),
    ...(parametros.has(PARAMETROS_URL.children)
      ? { children: cantidadPasajeros(parametros.get(PARAMETROS_URL.children)) }
      : {}),
  }
}

export function cantidadParaBuscar(filtros: FiltrosVuelos): number {
  return (filtros.adults ?? 0) + (filtros.children ?? 0) || filtros.passengers || 1
}

export function ordenDesdeParametros(parametros: URLSearchParams): OrdenVuelos {
  return valorDe(parametros.get(PARAMETRO_ORDEN), ETIQUETAS_ORDEN) ?? ORDEN_POR_DEFECTO
}

export function sentidoDesdeParametros(parametros: URLSearchParams): SentidoOrden {
  return valorDe(parametros.get(PARAMETRO_SENTIDO), ETIQUETAS_SENTIDO) ?? SENTIDO_POR_DEFECTO
}

export function parametrosDesdeFiltros(
  filtros: FiltrosVuelos,
  orden: OrdenVuelos,
  sentido: SentidoOrden = SENTIDO_POR_DEFECTO,
): URLSearchParams {
  const parametros = new URLSearchParams()
  for (const [clave, nombre] of Object.entries(PARAMETROS_URL) as [keyof FiltrosVuelos, string][]) {
    const valor = filtros[clave]
    if (valor !== undefined) parametros.set(nombre, String(valor))
  }
  if (orden !== ORDEN_POR_DEFECTO) parametros.set(PARAMETRO_ORDEN, orden)
  if (sentido !== SENTIDO_POR_DEFECTO) parametros.set(PARAMETRO_SENTIDO, sentido)
  return parametros
}

export function hayFiltrosActivos(filtros: FiltrosVuelos): boolean {
  return Object.values(filtros).some((valor) => valor !== undefined)
}

export function precioEnArs(vuelo: Pick<Vuelo, 'price' | 'currency'>): number {
  return vuelo.price * TASAS_CAMBIO_ARS[vuelo.currency]
}

export function cantidadEscalas(vuelo: Pick<Vuelo, 'stops' | 'stops_count'>): number {
  return vuelo.stops_count ?? vuelo.stops.length
}

const COMPARADORES: Record<OrdenVuelos, (a: Vuelo, b: Vuelo) => number> = {
  precio: (a, b) => precioEnArs(a) - precioEnArs(b),
  duracion: (a, b) => a.duration_minutes - b.duration_minutes,
  escalas: (a, b) => cantidadEscalas(a) - cantidadEscalas(b),
}

/** Ordena por el criterio y sentido elegidos; los empates se resuelven por precio, duración e id. */
export function ordenarVuelos(vuelos: Vuelo[], orden: OrdenVuelos, sentido: SentidoOrden = 'asc'): Vuelo[] {
  const factor = sentido === 'asc' ? 1 : -1
  return vuelos.toSorted(
    (a, b) =>
      COMPARADORES[orden](a, b) * factor ||
      (precioEnArs(a) - precioEnArs(b)) * factor ||
      (a.duration_minutes - b.duration_minutes) * factor ||
      a.id - b.id,
  )
}

export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${String(resto).padStart(2, '0')} min`
}

const FORMATOS_MONEDA: Record<Divisa, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }),
}

const SIMBOLOS_DIVISA: Record<Divisa, string> = {
  ARS: '$',
  USD: 'US$',
  EUR: '€',
}

export function formatearPrecio(monto: number, divisa: Divisa = 'ARS'): string {
  return `${SIMBOLOS_DIVISA[divisa]} ${FORMATOS_MONEDA[divisa].format(monto)}`
}

export function formatearHora(fechaHora: string): string {
  return fechaHora.slice(11, 16)
}

const formatoFecha = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

export function formatearFecha(fechaHora: string): string {
  const [anio, mes, dia] = fechaHora.slice(0, 10).split('-').map(Number)
  return formatoFecha.format(new Date(anio, mes - 1, dia))
}

/** Días de calendario entre la salida y la llegada (el "+1" de los vuelos nocturnos). */
export function diasEntre(salida: string, llegada: string): number {
  const dia = (fechaHora: string) => Date.parse(`${fechaHora.slice(0, 10)}T00:00:00Z`)
  return Math.round((dia(llegada) - dia(salida)) / 86_400_000)
}

export function textoEscalas(escalas: string[], cantidad?: number): string {
  const total = cantidad ?? escalas.length
  if (total === 0) return 'Directo'
  return total === 1 ? '1 escala' : `${total} escalas`
}

/** Fecha de hoy en formato `YYYY-MM-DD`, en la zona horaria del navegador. */
export function fechaDeHoy(): string {
  return new Date().toLocaleDateString('en-CA')
}
