/** Contrato de la búsqueda de vuelos. Los nombres de campos y valores son los de la API (`/api/flights/`). */

export type TipoVuelo = 'one_way' | 'round_trip' | 'multi_city'
export type CategoriaVuelo = 'economy' | 'premium_economy' | 'business' | 'first'
export type TarifaVuelo = 'flexible' | 'standard' | 'promotional'
export type Divisa = 'ARS' | 'USD' | 'EUR'
export type OrdenVuelos = 'precio' | 'duracion' | 'escalas'
export type SentidoOrden = 'asc' | 'desc'

export interface Aeropuerto {
  code: string
  name: string
  city: string
  country: string
}

export interface Aerolinea {
  code: string
  name: string
}

export interface TramoVuelo {
  flight_number: string
  origin: Aeropuerto
  destination: Aeropuerto
  /** Fecha y hora local de salida, `YYYY-MM-DDTHH:mm`. */
  departure: string
  /** Fecha y hora local de llegada, `YYYY-MM-DDTHH:mm`. */
  arrival: string
  duration_minutes: number
  /** Códigos de los aeropuertos de escala de este tramo. Vacío si es directo. */
  stops: string[]
  /** Cantidad numérica de escalas cuando la API no detalla los códigos de aeropuerto. */
  stops_count?: number
}

export interface Vuelo {
  id: number
  /** Identificador real en el backend (`/api/flights/<id>/`), cuando proviene de la API. */
  backend_id?: number
  flight_number: string
  airline: Aerolinea
  flight_type: TipoVuelo
  origin: Aeropuerto
  destination: Aeropuerto
  /** Fecha y hora local de salida del primer tramo, `YYYY-MM-DDTHH:mm`. */
  departure: string
  /** Fecha y hora local de llegada del tramo principal, `YYYY-MM-DDTHH:mm`. */
  arrival: string
  /** Duración total de vuelo en minutos (suma de tramos). */
  duration_minutes: number
  /** Todos los aeropuertos de escala del itinerario, en orden. Vacío si es directo. */
  stops: string[]
  /** Cantidad numérica de escalas cuando la API no detalla los códigos de aeropuerto. */
  stops_count?: number
  /** Tramos del viaje: 1 para solo ida, 2 para ida y vuelta, 2 o más para multidestino. */
  legs: TramoVuelo[]
  category: CategoriaVuelo
  fare: TarifaVuelo
  /** Precio por pasajero en la divisa indicada. */
  price: number
  currency: Divisa
  seats_available: number
  cancellation_summary: string
}

/** Todos los filtros son opcionales: sin filtros se listan todos los vuelos disponibles. */
export type FiltrosVuelos = {
  flight_type?: TipoVuelo
  origin?: string
  destination?: string
  category?: CategoriaVuelo
  date?: string
  passengers?: number
}

export const MAXIMO_PASAJEROS = 9
export const PAIS_LOCAL = 'Argentina'

export const ETIQUETAS_TIPO_VUELO: Record<TipoVuelo, string> = {
  one_way: 'Solo ida',
  round_trip: 'Ida y vuelta',
  multi_city: 'Multidestino',
}

export const ETIQUETAS_CATEGORIA: Record<CategoriaVuelo, string> = {
  economy: 'Económica',
  premium_economy: 'Premium Economy',
  business: 'Ejecutiva',
  first: 'Primera',
}

export const ETIQUETAS_TARIFA: Record<TarifaVuelo, string> = {
  flexible: 'Flexible',
  standard: 'Estándar',
  promotional: 'Promocional',
}

export const ETIQUETAS_ORDEN: Record<OrdenVuelos, string> = {
  precio: 'Precio',
  duracion: 'Duración',
  escalas: 'Escalas',
}

export const ETIQUETAS_SENTIDO: Record<SentidoOrden, string> = {
  asc: 'Menor a mayor',
  desc: 'Mayor a menor',
}
