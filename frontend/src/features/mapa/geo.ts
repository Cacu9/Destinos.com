import type { Aeropuerto, Vuelo } from '@/features/busqueda-vuelos/tipos'

export interface MapPoint {
  code: string
  city: string
  lon: number
  lat: number
}

/** Cómo se lee un tramo en el mapa: la ida, la vuelta o un tramo de un multidestino. */
export type RouteKind = 'outbound' | 'return' | 'leg'

export interface MapRoute {
  id: string
  from: MapPoint
  to: MapPoint
  kind: RouteKind
  /** Orden del tramo en el viaje, desde 1. */
  order: number
  /** Escalas dentro del tramo; el mapa solo sabe cuántas, no dónde. */
  stops: number
}

export type Coordenadas = Map<string, { lat: number; lon: number }>

/** Coordenadas por código IATA a partir de los aeropuertos de la API (`/api/airports/`). */
export function coordenadasDe(aeropuertos: Aeropuerto[]): Coordenadas {
  const mapa: Coordenadas = new Map()
  for (const aeropuerto of aeropuertos) {
    const lat = Number(aeropuerto.latitude)
    const lon = Number(aeropuerto.longitude)
    if (aeropuerto.latitude != null && aeropuerto.longitude != null && Number.isFinite(lat) && Number.isFinite(lon)) {
      mapa.set(aeropuerto.code, { lat, lon })
    }
  }
  return mapa
}

export function puntosDe(aeropuertos: Aeropuerto[], coordenadas: Coordenadas): MapPoint[] {
  return aeropuertos.flatMap((aeropuerto) => {
    const lugar = coordenadas.get(aeropuerto.code)
    return lugar ? [{ code: aeropuerto.code, city: aeropuerto.city, ...lugar }] : []
  })
}

function tipoDeTramo(vuelo: Vuelo, indice: number): RouteKind {
  if (vuelo.flight_type === 'round_trip') return indice === 0 ? 'outbound' : 'return'
  return vuelo.flight_type === 'one_way' ? 'outbound' : 'leg'
}

/** Los tramos de un vuelo como rutas a dibujar; se saltean los aeropuertos sin ubicación conocida. */
export function rutasDeVuelo(vuelo: Vuelo, coordenadas: Coordenadas): MapRoute[] {
  return vuelo.legs.flatMap((tramo, indice) => {
    const desde = coordenadas.get(tramo.origin.code)
    const hasta = coordenadas.get(tramo.destination.code)
    if (!desde || !hasta) return []
    return [
      {
        id: `${vuelo.id}-${indice}`,
        from: { code: tramo.origin.code, city: tramo.origin.city, ...desde },
        to: { code: tramo.destination.code, city: tramo.destination.city, ...hasta },
        kind: tipoDeTramo(vuelo, indice),
        order: indice + 1,
        stops: tramo.stops_count ?? tramo.stops.length,
      },
    ]
  })
}
