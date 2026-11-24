import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useAutenticacion } from './useAutenticacion'

/** UC3 · Cerrar sesión: cierra la sesión, lo avisa y vuelve al inicio. */
export function useCerrarSesion() {
  const { cerrarSesion } = useAutenticacion()
  const navegar = useNavigate()

  return async () => {
    toast('Cerrando Sesión')
    await cerrarSesion()
    navegar('/', { replace: true })
  }
}
