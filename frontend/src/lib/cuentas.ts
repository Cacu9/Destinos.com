export type Rol = 'client' | 'admin'
export type AreaAdmin = 'general' | 'catalog' | 'reservations'

export interface Usuario {
  id: number
  email: string
  first_name: string
  last_name: string
  role: Rol
  admin_area: AreaAdmin | ''
}

export const ETIQUETAS_AREA_ADMIN: Record<AreaAdmin, string> = {
  general: 'Administración General',
  catalog: 'Catálogo y Precios',
  reservations: 'Operador de Reservas',
}
