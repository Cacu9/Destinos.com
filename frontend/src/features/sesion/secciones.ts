import type { LucideIcon } from 'lucide-react'

import type { AreaAdmin, Usuario } from '@/lib/cuentas'

export interface SeccionPanel {
  ruta: string
  etiqueta: string
  icono: LucideIcon
  area: AreaAdmin
}

/** Secciones del panel; cada administrador ve solo las de su área. */
export const SECCIONES_PANEL: SeccionPanel[] = []

export function seccionesPara(usuario: Usuario): SeccionPanel[] {
  return SECCIONES_PANEL.filter((seccion) => seccion.area === usuario.admin_area)
}
