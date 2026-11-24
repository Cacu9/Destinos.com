import { createContext, use } from 'react'

import type { Usuario } from '@/lib/cuentas'

export interface ValorAutenticacion {
  usuario: Usuario | null
  ingresar: (email: string, password: string) => Promise<Usuario>
}

export const ContextoAutenticacion = createContext<ValorAutenticacion | null>(null)

export function useAutenticacion(): ValorAutenticacion {
  const contexto = use(ContextoAutenticacion)
  if (!contexto) throw new Error('useAutenticacion debe usarse dentro de un ProveedorAutenticacion')
  return contexto
}
