import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'

export type ClaseCabina = 'economy' | 'premium_economy' | 'business' | 'first'
export type DivisaAdmin = 'ARS' | 'USD'

export const ETIQUETAS_CLASE_CABINA: Record<ClaseCabina, string> = {
  economy: 'Económica',
  premium_economy: 'Económica Premium',
  business: 'Ejecutiva',
  first: 'Primera Clase',
}

export const ETIQUETAS_DIVISA_ADMIN: Record<DivisaAdmin, string> = {
  ARS: 'Pesos (ARS)',
  USD: 'Dólares (USD)',
}

export interface TarifaAdmin {
  id: number
  flight: number
  cabin_class: ClaseCabina
  cabin_class_display: string
  price_ars: string
  currency: DivisaAdmin
  currency_display?: string
  available_seats: number
  baggage_included: string
  is_refundable: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VueloAdmin {
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
  currency: DivisaAdmin
  currency_display?: string
  min_price_ars: string
  cancellation_policy: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
  fares: TarifaAdmin[]
}

export interface DatosTarifaAdmin {
  cabin_class: ClaseCabina
  price_ars: string
  currency: DivisaAdmin
  available_seats: number
  baggage_included: string
  is_refundable: boolean
}

export interface DatosVueloAdmin {
  flight_number: string
  airline: string
  origin_city: string
  origin_code: string
  destination_city: string
  destination_code: string
  departure_at: string
  arrival_at: string
  stops: number
  base_price_ars: string
  currency: DivisaAdmin
  cancellation_policy: string
  notes: string
  fares?: DatosTarifaAdmin[]
}

export interface FiltrosVuelosAdmin {
  search?: string
  is_active?: boolean
  cabin_class?: ClaseCabina
  direct_only?: boolean
  ordering?: string
}

export type DatosPrecioDivisa =
  | { tipo: 'vuelo'; flightId: number; precio: string; currency: DivisaAdmin }
  | { tipo: 'tarifa'; flightId: number; tarifaId: number; precio: string; currency: DivisaAdmin }

const claveVuelos = ['admin', 'flights'] as const
const claveTarifas = (flightId: number) => ['admin', 'flights', flightId, 'fares'] as const
const URL_VUELOS = '/admin/flights/'
const URL_TARIFAS = '/admin/fares/'

export function useVuelosAdmin(filtros: FiltrosVuelosAdmin = {}) {
  return useQuery({
    queryKey: [...claveVuelos, filtros],
    queryFn: () =>
      api<VueloAdmin[]>(URL_VUELOS, {
        parametros: {
          search: filtros.search,
          is_active: filtros.is_active,
          cabin_class: filtros.cabin_class,
          direct_only: filtros.direct_only,
          ordering: filtros.ordering,
        },
      }),
  })
}

export function useTarifasVueloAdmin(flightId: number | null) {
  return useQuery({
    queryKey: claveTarifas(flightId ?? 0),
    queryFn: () => api<TarifaAdmin[]>(`${URL_VUELOS}${flightId}/fares/`),
    enabled: flightId !== null,
  })
}

function useMutacionVuelos<T>(mutationFn: (variables: T) => Promise<unknown>) {
  const clienteConsultas = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      clienteConsultas.invalidateQueries({ queryKey: claveVuelos })
      clienteConsultas.invalidateQueries({ queryKey: ['vuelos'] })
      clienteConsultas.invalidateQueries({ queryKey: ['aeropuertos'] })
      clienteConsultas.invalidateQueries({ queryKey: ['vuelo-detalle'] })
    },
  })
}

export function useGuardarVuelo() {
  return useMutacionVuelos(({ id, ...datos }: DatosVueloAdmin & { id?: number }) => {
    if (id) {
      const camposVuelo = { ...datos }
      delete camposVuelo.fares
      return api<VueloAdmin>(`${URL_VUELOS}${id}/`, { metodo: 'PATCH', cuerpo: camposVuelo })
    }
    return api<VueloAdmin>(URL_VUELOS, { metodo: 'POST', cuerpo: datos })
  })
}

export function useActualizarPrecioDivisa() {
  const clienteConsultas = useQueryClient()
  return useMutation<VueloAdmin | TarifaAdmin, Error, DatosPrecioDivisa>({
    mutationFn: (datos: DatosPrecioDivisa) =>
      datos.tipo === 'vuelo'
        ? api<VueloAdmin>(`${URL_VUELOS}${datos.flightId}/`, {
            metodo: 'PATCH',
            cuerpo: { base_price_ars: datos.precio, currency: datos.currency },
          })
        : api<TarifaAdmin>(`${URL_TARIFAS}${datos.tarifaId}/`, {
            metodo: 'PATCH',
            cuerpo: { price_ars: datos.precio, currency: datos.currency },
          }),
    onSuccess: (_data, variables) => {
      clienteConsultas.invalidateQueries({ queryKey: claveVuelos })
      clienteConsultas.invalidateQueries({ queryKey: claveTarifas(variables.flightId) })
      clienteConsultas.invalidateQueries({ queryKey: ['vuelos'] })
      clienteConsultas.invalidateQueries({ queryKey: ['vuelo-detalle'] })
    },
  })
}

export function useDarDeBajaVuelo() {
  return useMutacionVuelos((id: number) => api(`${URL_VUELOS}${id}/`, { metodo: 'DELETE' }))
}

export function useReactivarVuelo() {
  return useMutacionVuelos((id: number) => api<VueloAdmin>(`${URL_VUELOS}${id}/reactivate/`, { metodo: 'POST' }))
}

function useMutacionTarifa<T extends { flightId: number }>(mutationFn: (variables: T) => Promise<unknown>) {
  const clienteConsultas = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      clienteConsultas.invalidateQueries({ queryKey: claveVuelos })
      clienteConsultas.invalidateQueries({ queryKey: claveTarifas(variables.flightId) })
      clienteConsultas.invalidateQueries({ queryKey: ['vuelos'] })
      clienteConsultas.invalidateQueries({ queryKey: ['vuelo-detalle'] })
    },
  })
}

export function useGuardarTarifa() {
  return useMutacionTarifa(({ id, flightId, ...datos }: DatosTarifaAdmin & { id?: number; flightId: number }) =>
    id
      ? api<TarifaAdmin>(`${URL_TARIFAS}${id}/`, { metodo: 'PATCH', cuerpo: datos })
      : api<TarifaAdmin>(`${URL_VUELOS}${flightId}/fares/`, { metodo: 'POST', cuerpo: datos }),
  )
}

export function useDarDeBajaTarifa() {
  return useMutacionTarifa(({ id }: { id: number; flightId: number }) =>
    api(`${URL_TARIFAS}${id}/`, { metodo: 'DELETE' }),
  )
}

export function useReactivarTarifa() {
  return useMutacionTarifa(({ id }: { id: number; flightId: number }) =>
    api<TarifaAdmin>(`${URL_TARIFAS}${id}/reactivate/`, { metodo: 'POST' }),
  )
}
