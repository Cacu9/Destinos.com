import {
  PAIS_LOCAL,
  type Aeropuerto,
  type CategoriaVuelo,
  type Divisa,
  type FiltrosVuelos,
  type TarifaVuelo,
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
  base_price_ars: string
  currency: Divisa
  currency_display?: string
  min_price_ars: number | string
  cancellation_summary?: string
  fares: TarifaPublicaApi[]
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

function tipoTarifa(clase: CategoriaVuelo, reembolsable?: boolean): TarifaVuelo {
  if (reembolsable === true) return 'flexible'
  if (clase === 'business' || clase === 'first') return reembolsable === false ? 'standard' : 'flexible'
  if (clase === 'premium_economy') return 'standard'
  return 'promotional'
}

function resumenCancelacion(resumenVuelo?: string, reembolsable?: boolean): string {
  const texto = resumenVuelo?.trim()
  if (texto && reembolsable !== undefined) {
    return `${reembolsable ? 'Reembolsable' : 'No reembolsable'} · ${texto}`
  }
  if (texto) return texto
  return reembolsable
    ? 'Permite cancelación con reembolso según condiciones de la tarifa.'
    : 'Tarifa sin reembolso. Consultá condiciones de cambio antes de confirmar.'
}

/** Convierte la respuesta de `GET /api/flights/` al modelo de tarjetas de `/vuelos`. */
export function adaptarVuelosApi(vuelosApi: VueloCatalogoApi[], filtros: FiltrosVuelos): Vuelo[] {
  if (filtros.flight_type && filtros.flight_type !== 'one_way') return []

  const pasajerosMinimos = cantidadParaBuscar(filtros)
  const resultado: Vuelo[] = []

  for (const vueloApi of vuelosApi) {
    const origin = aAeropuerto(vueloApi.origin_code, vueloApi.origin_city)
    const destination = aAeropuerto(vueloApi.destination_code, vueloApi.destination_city)
    const airline = { code: codigoAerolinea(vueloApi.flight_number, vueloApi.airline), name: vueloApi.airline }
    const departure = vueloApi.departure_at.slice(0, 16)
    const arrival = vueloApi.arrival_at.slice(0, 16)

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
      flight_number: vueloApi.flight_number,
      airline,
      flight_type: 'one_way',
      origin,
      destination,
      departure,
      arrival,
      duration_minutes: vueloApi.duration_minutes,
      stops: [],
      stops_count: vueloApi.stops,
      legs: [
        {
          flight_number: vueloApi.flight_number,
          origin,
          destination,
          departure,
          arrival,
          duration_minutes: vueloApi.duration_minutes,
          stops: [],
          stops_count: vueloApi.stops,
        },
      ],
      category: categoria,
      fare: tipoTarifa(categoria, reembolsable),
      price: precio,
      currency: divisa,
      seats_available: asientos,
      cancellation_summary: resumenCancelacion(vueloApi.cancellation_summary, reembolsable),
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
