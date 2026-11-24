import type { LucideIcon } from 'lucide-react'
import { UsersRound } from 'lucide-react'

import type { AreaAdmin, Usuario } from '@/lib/cuentas'

export interface SeccionPanel {
  ruta: string
  etiqueta: string
  icono: LucideIcon
  area: AreaAdmin
}

/** Secciones del panel; cada administrador ve solo las de su área. */
export const SECCIONES_PANEL: SeccionPanel[] = [
  { ruta: 'cuentas', etiqueta: 'Cuentas de administrador', icono: UsersRound, area: 'general' },
]

export function seccionesPara(usuario: Usuario): SeccionPanel[] {
  return SECCIONES_PANEL.filter((seccion) => seccion.area === usuario.admin_area)
}
