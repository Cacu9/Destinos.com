import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

import type { Aeropuerto, FiltrosVuelos, Vuelo } from './tipos'
import { AEROPUERTOS_DEMO, buscarVuelosDemo } from './vuelosDemo'

/** Mientras el backend no publique `/api/flights/` y `/api/airports/`, la búsqueda usa los datos de demostración. */
const USAR_DATOS_DEMO = true

export function useAeropuertos() {
  return useQuery({
    queryKey: ['aeropuertos'],
    queryFn: () => (USAR_DATOS_DEMO ? Promise.resolve(AEROPUERTOS_DEMO) : api<Aeropuerto[]>('/airports/')),
    staleTime: Infinity,
  })
}

export function useBusquedaVuelos(filtros: FiltrosVuelos) {
  return useQuery({
    queryKey: ['vuelos', filtros],
    queryFn: () =>
      USAR_DATOS_DEMO ? Promise.resolve(buscarVuelosDemo(filtros)) : api<Vuelo[]>('/flights/', { parametros: filtros }),
    placeholderData: keepPreviousData,
  })
}
