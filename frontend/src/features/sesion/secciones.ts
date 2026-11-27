import type { LucideIcon } from 'lucide-react'
import { Building2, Coins, MapPin, Plane, ShieldCheck, UsersRound } from 'lucide-react'

import type { AreaAdmin, Usuario } from '@/lib/cuentas'

export interface SeccionPanel {
  ruta: string
  etiqueta: string
  icono: LucideIcon
  areas: AreaAdmin[]
}

/** Secciones del panel; cada administrador ve solo las habilitadas para su área. */
export const SECCIONES_PANEL: SeccionPanel[] = [
  { ruta: 'cuentas', etiqueta: 'Cuentas de administrador', icono: UsersRound, areas: ['general'] },
  { ruta: 'destinos', etiqueta: 'Destinos', icono: MapPin, areas: ['general', 'catalog'] },
  { ruta: 'vuelos', etiqueta: 'Catálogo de vuelos', icono: Plane, areas: ['general', 'catalog'] },
  { ruta: 'precios', etiqueta: 'Precios', icono: Coins, areas: ['general', 'catalog'] },
  { ruta: 'politicas', etiqueta: 'Políticas de cancelación', icono: ShieldCheck, areas: ['general', 'catalog'] },
  { ruta: 'alojamientos', etiqueta: 'Alojamientos', icono: Building2, areas: ['general', 'catalog'] },
]

export function seccionesPara(usuario: Usuario): SeccionPanel[] {
  if (!usuario.admin_area) return []
  return SECCIONES_PANEL.filter((seccion) => seccion.areas.includes(usuario.admin_area as AreaAdmin))
}
