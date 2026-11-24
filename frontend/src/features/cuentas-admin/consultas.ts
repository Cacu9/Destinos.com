import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { AreaAdmin } from '@/lib/cuentas'

export interface CuentaAdmin {
  id: number
  first_name: string
  last_name: string
  email: string
  admin_area: AreaAdmin
  is_active: boolean
  date_joined: string
}

export interface DatosCuenta {
  first_name: string
  last_name: string
  email: string
  admin_area: AreaAdmin
  password?: string
}

const claveCuentas = ['admin', 'accounts']
const URL = '/admin/accounts/'

export function useCuentasAdmin() {
  return useQuery({ queryKey: claveCuentas, queryFn: () => api<CuentaAdmin[]>(URL) })
}

function useMutacionCuenta<T>(mutationFn: (variables: T) => Promise<unknown>) {
  const clienteConsultas = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: claveCuentas }) })
}

export function useGuardarCuenta() {
  return useMutacionCuenta(({ id, ...datos }: DatosCuenta & { id?: number }) =>
    id ? api(`${URL}${id}/`, { metodo: 'PATCH', cuerpo: datos }) : api(URL, { metodo: 'POST', cuerpo: datos }),
  )
}

export function useDarDeBajaCuenta() {
  return useMutacionCuenta((id: number) => api(`${URL}${id}/`, { metodo: 'DELETE' }))
}

export function useReactivarCuenta() {
  return useMutacionCuenta((id: number) => api(`${URL}${id}/reactivate/`, { metodo: 'POST' }))
}
