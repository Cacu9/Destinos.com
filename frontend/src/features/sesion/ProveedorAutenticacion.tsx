import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'

import { api } from '@/lib/api'
import type { Usuario } from '@/lib/cuentas'
import { almacenSesion } from '@/lib/sesion'

import { ContextoAutenticacion } from './useAutenticacion'

interface RespuestaIngreso {
  access: string
  refresh: string
  user: Usuario
}

export function ProveedorAutenticacion({ children }: { children: ReactNode }) {
  const sesion = useSyncExternalStore(almacenSesion.suscribir, almacenSesion.obtener)
  const clienteConsultas = useQueryClient()

  const ingresar = useCallback(async (email: string, password: string) => {
    const { user, ...tokens } = await api<RespuestaIngreso>('/auth/login/', {
      metodo: 'POST',
      cuerpo: { email, password },
    })
    almacenSesion.guardar({ ...tokens, user })
    return user
  }, [])

  const cerrarSesion = useCallback(async () => {
    const refresh = almacenSesion.obtener()?.refresh
    if (refresh) {
      // Invalidar el token en el servidor es un intento: la sesión local se cierra de todas formas.
      await api('/auth/logout/', { metodo: 'POST', cuerpo: { refresh } }).catch(() => undefined)
    }
    almacenSesion.guardar(null)
    clienteConsultas.clear()
  }, [clienteConsultas])

  const valor = useMemo(
    () => ({
      usuario: sesion?.user ?? null,
      ingresar,
      cerrarSesion,
    }),
    [sesion, ingresar, cerrarSesion],
  )

  return <ContextoAutenticacion value={valor}>{children}</ContextoAutenticacion>
}
