import type { TipoViaje, TramoAdmin } from './consultas'
import { inputLocalAIso, isoAInputLocal } from './formato'

export interface TramoForm {
  clave: number
  flight_number: string
  origin_code: string
  destination_code: string
  departure_at: string
  arrival_at: string
  stops: string
}

export const MAXIMO_TRAMOS_ADICIONALES = 3

export function tramoVacio(clave: number, origen = ''): TramoForm {
  return {
    clave,
    flight_number: '',
    origin_code: origen,
    destination_code: '',
    departure_at: '',
    arrival_at: '',
    stops: '0',
  }
}

export function tramosDesdeApi(tramos: TramoAdmin[]): TramoForm[] {
  return tramos.map((tramo, indice) => ({
    clave: indice + 1,
    flight_number: tramo.flight_number,
    origin_code: tramo.origin_code,
    destination_code: tramo.destination_code,
    departure_at: isoAInputLocal(tramo.departure_at),
    arrival_at: isoAInputLocal(tramo.arrival_at),
    stops: String(tramo.stops),
  }))
}

/** Arma los tramos para la API. En ida y vuelta la vuelta hace la ruta inversa de la ida. */
export function tramosParaApi(
  tipo: TipoViaje,
  tramos: TramoForm[],
  origen: string,
  destino: string,
  ciudad: (codigo: string) => string,
): TramoAdmin[] {
  if (tipo === 'one_way') return []
  const lista = tipo === 'round_trip' ? tramos.slice(0, 1) : tramos
  // Si un tramo no tiene origen, sale de donde llegó el anterior.
  return lista.map((tramo, indice) => {
    const anterior = indice === 0 ? destino : lista[indice - 1].destination_code
    const desde = tipo === 'round_trip' ? destino : tramo.origin_code || anterior
    const hasta = tipo === 'round_trip' ? origen : tramo.destination_code
    return {
      flight_number: tramo.flight_number.trim().toUpperCase(),
      origin_code: desde,
      origin_city: ciudad(desde),
      destination_code: hasta,
      destination_city: ciudad(hasta),
      departure_at: inputLocalAIso(tramo.departure_at),
      arrival_at: inputLocalAIso(tramo.arrival_at),
      stops: Number(tramo.stops || 0),
    }
  })
}
