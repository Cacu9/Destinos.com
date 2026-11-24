import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { EstadoVacio } from '@/components/ui/EstadoVacio'
import type { AreaAdmin } from '@/lib/cuentas'

import { seccionesPara } from './secciones'
import { useAutenticacion } from './useAutenticacion'

export function RequiereAdmin({ children }: { children: ReactNode }) {
  const { usuario } = useAutenticacion()
  const ubicacion = useLocation()

  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />
  if (usuario.role !== 'admin') return <Navigate to="/" replace />
  return children
}

/** Mantiene a cada administrador dentro de las funciones de su propia área. */
export function RequiereArea({ area, children }: { area: AreaAdmin; children: ReactNode }) {
  const { usuario } = useAutenticacion()
  return usuario?.admin_area === area ? children : <Navigate to="/admin" replace />
}

export function InicioPanel() {
  const { usuario } = useAutenticacion()
  const [primeraSeccion] = usuario ? seccionesPara(usuario) : []

  if (primeraSeccion) return <Navigate to={primeraSeccion.ruta} replace />
  return (
    <EstadoVacio
      titulo="Tu área todavía no tiene funciones habilitadas"
      descripcion="Las herramientas de tu área se incorporan en los próximos sprints."
    />
  )
}
