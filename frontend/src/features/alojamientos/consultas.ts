import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { AlojamientoPublico, TipoAlojamiento } from '@/features/alojamientos-admin/consultas'
import { api } from '@/lib/api'

export interface FiltrosAlojamientosPublicos {
  destination?: string
  accommodation_type?: TipoAlojamiento
  min_guests?: number
  min_stars?: number
  is_refundable?: boolean
  search?: string
}

export function useAlojamientosPublicos(filtros: FiltrosAlojamientosPublicos) {
  return useQuery({
    queryKey: ['accommodations', filtros],
    queryFn: () =>
      api<AlojamientoPublico[]>('/accommodations/', {
        parametros: {
          destination: filtros.destination,
          accommodation_type: filtros.accommodation_type,
          min_guests: filtros.min_guests,
          min_stars: filtros.min_stars,
          is_refundable: filtros.is_refundable,
          search: filtros.search,
        },
      }),
    placeholderData: keepPreviousData,
  })
}
