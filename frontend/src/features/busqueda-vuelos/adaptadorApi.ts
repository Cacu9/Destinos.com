import {
  PAIS_LOCAL,
  type Aeropuerto,
  type CategoriaVuelo,
  type Divisa,
  type FiltrosVuelos,
  type TarifaVuelo,
  type TipoVuelo,
  type TramoVuelo,
  type Vuelo,
} from './tipos.ts'
import { cantidadParaBuscar } from './utilidades.ts'
import { AEROPUERTOS_DEMO } from './vuelosDemo.ts'

export interface TarifaPublicaApi {
  id: number
  cabin_class: CategoriaVuelo
  cabin_class_display: string
  price_ars: string
  currency: Divisa
  currency_display?: string
  available_seats: number
  is_refundable?: boolean
}

export interface TarifaDetalleApi extends TarifaPublicaApi {
  baggage_included: string
  is_refundable: boolean
}

export interface TramoApi {
  position: number
  flight_number: string
  origin_city: string
  origin_code: string
  destination_city: string
  destination_code: string
  departure_at: string
  arrival_at: string
  duration_minutes: number
  stops: number
}

export interface ReglaCancelacionApi {
  hours_before: number
  penalty_percent: number
}

export interface VueloCatalogoApi {
  id: number
  flight_number: string
  airline: string
  origin_city: string
  origin_code: string
  destination_city: string
  destination_code: string
  departure_at: string
  arrival_at: string
  duration_minutes: number
  stops: number
  /** Escalas de todo el itinerario (todos los tramos). */
  total_stops?: number
  trip_type?: TipoVuelo
  base_price_ars: string
  currency: Divisa
  currency_display?: string
  min_price_ars: number | string
  cancellation_summary?: string
  is_non_refundable?: boolean
  cancellation_rules?: ReglaCancelacionApi[]
  fares: TarifaPublicaApi[]
  /** Tramos siguientes al primero: la vuelta o los destinos siguientes de un multidestino. */
  legs?: TramoApi[]
}

export interface VueloDetalleApi extends VueloCatalogoApi {
  fares: TarifaDetalleApi[]
  cancellation_policy: string
  notes: string
}

const CODIGOS_LOCALES = new Set(['AEP', 'EZE', 'COR', 'MDZ', 'BRC', 'IGR', 'USH', 'SLA', 'ROS', 'NQN', 'TUC'])
const AEROPUERTOS_POR_CODIGO = new Map(AEROPUERTOS_DEMO.map((aeropuerto) => [aeropuerto.code, aeropuerto]))

function aAeropuerto(codigo: string, ciudad: string): Aeropuerto {
  const conocido = AEROPUERTOS_POR_CODIGO.get(codigo)
  if (conocido) return { ...conocido, city: ciudad }
  return {
    code: codigo,
    name: ciudad,
    city: ciudad,
    country: CODIGOS_LOCALES.has(codigo) ? PAIS_LOCAL : 'Exterior',
  }
}

function codigoAerolinea(numeroVuelo: string, aerolinea: string): string {
  const prefijo = numeroVuelo.match(/^[A-Z0-9]{2}/)?.[0]
  return prefijo ?? aerolinea.slice(0, 2).toUpperCase()
}

/** Con política configurada (UC30), la tarifa se lee de ella: no reembolsable, sin cargo al principio o con cargo. */
function tarifaSegunPolitica(vueloApi: VueloCatalogoApi): TarifaVuelo | undefined {
  if (vueloApi.is_non_refundable) return 'promotional'
  const reglas = vueloApi.cancellation_rules ?? []
  if (reglas.length === 0) return undefined
  return Math.min(...reglas.map((regla) => regla.penalty_percent)) === 0 ? 'flexible' : 'standard'
}

function tipoTarifa(clase: CategoriaVuelo, reembolsable?: boolean): TarifaVuelo {
  if (reembolsable === true) return 'flexible'
  if (clase === 'business' || clase === 'first') return reembolsable === false ? 'standard' : 'flexible'
  if (clase === 'premium_economy') return 'standard'
  return 'promotional'
}

function resumenCancelacion(resumenVuelo?: string, reembolsable?: boolean, politicaConfigurada = false): string {
  const texto = resumenVuelo?.trim()
  if (texto && politicaConfigurada) return texto
  if (texto && reembolsable !== undefined) {
    return `${reembolsable ? 'Reembolsable' : 'No reembolsable'} · ${texto}`
  }
  if (texto) return texto
  return reembolsable
    ? 'Permite cancelación con reembolso según condiciones de la tarifa.'
    : 'Tarifa sin reembolso. Consultá condiciones de cambio antes de confirmar.'
}

function minutosEntre(salida: string, llegada: string): number {
  return Math.max(0, Math.round((Date.parse(llegada) - Date.parse(salida)) / 60_000))
}

/** El itinerario completo: el primer tramo (los campos del vuelo) seguido de los tramos adicionales. */
function tramosDe(vueloApi: VueloCatalogoApi): TramoVuelo[] {
  const primero: TramoVuelo = {
    flight_number: vueloApi.flight_number,
    origin: aAeropuerto(vueloApi.origin_code, vueloApi.origin_city),
    destination: aAeropuerto(vueloApi.destination_code, vueloApi.destination_city),
    departure: vueloApi.departure_at.slice(0, 16),
    arrival: vueloApi.arrival_at.slice(0, 16),
    duration_minutes: vueloApi.legs?.length
      ? minutosEntre(vueloApi.departure_at, vueloApi.arrival_at)
      : vueloApi.duration_minutes,
    stops: [],
    stops_count: vueloApi.stops,
  }
  const siguientes = (vueloApi.legs ?? []).map((tramo): TramoVuelo => ({
    flight_number: tramo.flight_number,
    origin: aAeropuerto(tramo.origin_code, tramo.origin_city),
    destination: aAeropuerto(tramo.destination_code, tramo.destination_city),
    departure: tramo.departure_at.slice(0, 16),
    arrival: tramo.arrival_at.slice(0, 16),
    duration_minutes: tramo.duration_minutes,
    stops: [],
    stops_count: tramo.stops,
  }))
  return [primero, ...siguientes]
}

/** Convierte la respuesta de `GET /api/flights/` al modelo de tarjetas de `/vuelos`. */
export function adaptarVuelosApi(vuelosApi: VueloCatalogoApi[], filtros: FiltrosVuelos): Vuelo[] {
  const pasajerosMinimos = cantidadParaBuscar(filtros)
  const resultado: Vuelo[] = []

  for (const vueloApi of vuelosApi) {
    const tipo: TipoVuelo = vueloApi.trip_type ?? 'one_way'
    if (filtros.flight_type && filtros.flight_type !== tipo) continue

    const legs = tramosDe(vueloApi)
    // En ida y vuelta el destino es el de la ida; en multidestino, el último.
    const tramoDestino = tipo === 'round_trip' ? legs[0] : legs[legs.length - 1]
    const origin = legs[0].origin
    const destination = tramoDestino.destination
    const airline = { code: codigoAerolinea(vueloApi.flight_number, vueloApi.airline), name: vueloApi.airline }
    const departure = legs[0].departure
    const arrival = tramoDestino.arrival
    const politicaConfigurada = Boolean(vueloApi.is_non_refundable || vueloApi.cancellation_rules?.length)
    const numeroVuelo = legs.map((tramo) => tramo.flight_number).join(' · ')

    const crearTarjeta = (
      id: number,
      categoria: CategoriaVuelo,
      precio: number,
      divisa: Divisa,
      asientos: number,
      reembolsable?: boolean,
    ): Vuelo => ({
      id,
      backend_id: vueloApi.id,
      flight_number: numeroVuelo,
      airline,
      flight_type: tipo,
      origin,
      destination,
      departure,
      arrival,
      duration_minutes: vueloApi.duration_minutes,
      stops: [],
      stops_count: vueloApi.total_stops ?? vueloApi.stops,
      legs,
      category: categoria,
      fare: tarifaSegunPolitica(vueloApi) ?? tipoTarifa(categoria, reembolsable),
      price: precio,
      currency: divisa,
      seats_available: asientos,
      cancellation_summary: resumenCancelacion(vueloApi.cancellation_summary, reembolsable, politicaConfigurada),
      cancellation_rules: vueloApi.cancellation_rules,
      non_refundable: vueloApi.is_non_refundable,
    })

    if (vueloApi.fares.length === 0) {
      if (!filtros.category || filtros.category === 'economy') {
        resultado.push(
          crearTarjeta(vueloApi.id * 1000, 'economy', Number(vueloApi.base_price_ars), vueloApi.currency ?? 'ARS', 9),
        )
      }
      continue
    }

    for (const tarifa of vueloApi.fares) {
      if (filtros.category && tarifa.cabin_class !== filtros.category) continue
      if (tarifa.available_seats < pasajerosMinimos) continue
      resultado.push(
        crearTarjeta(
          vueloApi.id * 1000 + tarifa.id,
          tarifa.cabin_class,
          Number(tarifa.price_ars),
          tarifa.currency ?? vueloApi.currency ?? 'ARS',
          tarifa.available_seats,
          tarifa.is_refundable,
        ),
      )
    }
  }

  return resultado
}

/** Combina los aeropuertos disponibles en el backend con la lista base para los selectores de búsqueda. */
export function extraerAeropuertos(vuelosApi: VueloCatalogoApi[]): Aeropuerto[] {
  const mapa = new Map(AEROPUERTOS_DEMO.map((aeropuerto) => [aeropuerto.code, aeropuerto]))
  for (const vuelo of vuelosApi) {
    if (!mapa.has(vuelo.origin_code)) mapa.set(vuelo.origin_code, aAeropuerto(vuelo.origin_code, vuelo.origin_city))
    if (!mapa.has(vuelo.destination_code)) {
      mapa.set(vuelo.destination_code, aAeropuerto(vuelo.destination_code, vuelo.destination_city))
    }
  }
  return [...mapa.values()]
}
