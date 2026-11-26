import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

import { adaptarVuelosApi, extraerAeropuertos, type VueloCatalogoApi, type VueloDetalleApi } from './adaptadorApi'
import type { FiltrosVuelos } from './tipos'

export function useAeropuertos() {
  return useQuery({
    queryKey: ['aeropuertos'],
    queryFn: async () => {
      const vuelos = await api<VueloCatalogoApi[]>('/flights/')
      return extraerAeropuertos(vuelos)
    },
    staleTime: 60_000,
  })
}

export function useBusquedaVuelos(filtros: FiltrosVuelos) {
  return useQuery({
    queryKey: ['vuelos', filtros],
    queryFn: async () => {
      const vuelosApi = await api<VueloCatalogoApi[]>('/flights/', {
        parametros: {
          origin: filtros.origin,
          destination: filtros.destination,
          departure_date: filtros.date,
          cabin_class: filtros.category,
          min_seats: filtros.passengers,
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
