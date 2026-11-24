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

  const ingresar = useCallback(async (email: string, password: string) => {
    const { user, ...tokens } = await api<RespuestaIngreso>('/auth/login/', {
      metodo: 'POST',
      cuerpo: { email, password },
    })
    almacenSesion.guardar({ ...tokens, user })
    return user
  }, [])

  const valor = useMemo(
    () => ({
      usuario: sesion?.user ?? null,
      ingresar,
    }),
    [sesion, ingresar],
  )

  return <ContextoAutenticacion value={valor}>{children}</ContextoAutenticacion>
}
