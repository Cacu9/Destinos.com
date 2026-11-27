import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

import { adaptarVuelosApi, type VueloCatalogoApi, type VueloDetalleApi } from './adaptadorApi'
import type { Aeropuerto, FiltrosVuelos } from './tipos'
import { cantidadParaBuscar } from './utilidades'

export const claveAeropuertos = ['aeropuertos'] as const

export function useAeropuertos() {
  return useQuery({
    queryKey: claveAeropuertos,
    queryFn: () => api<Aeropuerto[]>('/airports/'),
    staleTime: 60_000,
  })
}

export function useBusquedaVuelos(filtros: FiltrosVuelos) {
  const pasajeros =
    filtros.passengers !== undefined || filtros.adults !== undefined || filtros.children !== undefined
      ? cantidadParaBuscar(filtros)
      : undefined

  return useQuery({
    queryKey: ['vuelos', filtros],
    queryFn: async () => {
      const vuelosApi = await api<VueloCatalogoApi[]>('/flights/', {
        parametros: {
          trip_type: filtros.flight_type,
          origin: filtros.origin,
          destination: filtros.destination,
          departure_date: filtros.date,
          cabin_class: filtros.category,
          min_seats: pasajeros,
        },
      })
      return adaptarVuelosApi(vuelosApi, filtros)
    },
    placeholderData: keepPreviousData,
  })
}

export function useDetalleVuelo(backendId: number | undefined, habilitado: boolean) {
  return useQuery({
    queryKey: ['vuelo-detalle', backendId],
    queryFn: () => api<VueloDetalleApi>(`/flights/${backendId}/`),
    enabled: habilitado && backendId !== undefined,
  })
}
