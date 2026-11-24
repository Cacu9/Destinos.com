import type { Usuario } from '@/lib/cuentas'

const CLAVE_ALMACENAMIENTO = 'destinos.session'

export interface Sesion {
  access: string
  refresh: string
  user: Usuario
}

type Oyente = (sesion: Sesion | null) => void
const oyentes = new Set<Oyente>()

function leer(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO)
    return crudo ? (JSON.parse(crudo) as Sesion) : null
  } catch {
    return null
  }
}

let actual = leer()

/** Única fuente de verdad de la sesión guardada, compartida por el cliente de la API y React. */
export const almacenSesion = {
  obtener: () => actual,

  guardar(sesion: Sesion | null) {
    actual = sesion
    try {
      if (sesion) localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(sesion))
      else localStorage.removeItem(CLAVE_ALMACENAMIENTO)
    } catch {
      // El almacenamiento puede no estar disponible (modo privado); la sesión en memoria sigue funcionando.
    }
    oyentes.forEach((oyente) => oyente(sesion))
  },

  suscribir(oyente: Oyente) {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  },
}
