import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { DivisaAdmin } from '@/features/vuelos-admin/consultas'
import { api } from '@/lib/api'

export type TipoAlojamiento = 'hotel' | 'apartment' | 'cabin' | 'hostel' | 'resort'

export const ETIQUETAS_TIPO_ALOJAMIENTO: Record<TipoAlojamiento, string> = {
  hotel: 'Hotel',
  apartment: 'Departamento',
  cabin: 'Cabaña',
  hostel: 'Hostel',
  resort: 'Resort',
}

export interface AlojamientoPublico {
  id: number
  name: string
  accommodation_type: TipoAlojamiento
  accommodation_type_display: string
  destination_code: string
  city: string
  address: string
  stars: number
  price_per_night: string
  currency: DivisaAdmin
  currency_display?: string
  max_guests: number
  available_rooms: number
  amenities: string
  cancellation_policy: string
  is_refundable: boolean
}

export interface AlojamientoAdmin extends AlojamientoPublico {
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatosAlojamiento {
  name: string
  accommodation_type: TipoAlojamiento
  destination_code: string
  city: string
  address: string
  stars: number
  price_per_night: string
  currency: DivisaAdmin
  max_guests: number
  available_rooms: number
  amenities: string
  cancellation_policy: string
  is_refundable: boolean
}

export interface FiltrosAlojamientosAdmin {
  search?: string
  is_active?: boolean
  accommodation_type?: TipoAlojamiento
}

const claveAdmin = ['admin', 'accommodations'] as const
const URL_ADMIN = '/admin/accommodations/'

export function useAlojamientosAdmin(filtros: FiltrosAlojamientosAdmin = {}) {
  return useQuery({
    queryKey: [...claveAdmin, filtros],
    queryFn: () =>
      api<AlojamientoAdmin[]>(URL_ADMIN, {
        parametros: {
          search: filtros.search,
          is_active: filtros.is_active,
          accommodation_type: filtros.accommodation_type,
        },
      }),
  })
}

function useMutacionAlojamiento<T>(mutationFn: (variables: T) => Promise<unknown>) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: claveAdmin }),
        cliente.invalidateQueries({ queryKey: ['accommodations'] }),
      ])
    },
  })
}

export function useGuardarAlojamiento() {
  return useMutacionAlojamiento(({ id, ...datos }: DatosAlojamiento & { id?: number }) =>
    id
      ? api<AlojamientoAdmin>(`${URL_ADMIN}${id}/`, { metodo: 'PATCH', cuerpo: datos })
      : api<AlojamientoAdmin>(URL_ADMIN, { metodo: 'POST', cuerpo: datos }),
  )
}

export function useDarDeBajaAlojamiento() {
  return useMutacionAlojamiento((id: number) => api(`${URL_ADMIN}${id}/`, { metodo: 'DELETE' }))
}

export function useReactivarAlojamiento() {
  return useMutacionAlojamiento((id: number) =>
    api<AlojamientoAdmin>(`${URL_ADMIN}${id}/reactivate/`, { metodo: 'POST' }),
  )
}
