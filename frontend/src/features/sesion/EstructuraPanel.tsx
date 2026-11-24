import { ArrowUpRight, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'

import { Logo } from '@/components/estructura/Logo'
import { estilosBoton } from '@/components/ui/estilosBoton'
import { cn } from '@/lib/cn'
import { ETIQUETAS_AREA_ADMIN } from '@/lib/cuentas'

import { seccionesPara } from './secciones'
import { useAutenticacion } from './useAutenticacion'
import { useCerrarSesion } from './useCerrarSesion'

export function EstructuraPanel() {
  const { usuario } = useAutenticacion()
  const cerrarSesion = useCerrarSesion()
  if (!usuario?.admin_area) return null

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col gap-6 bg-ink-900 p-4 text-sheet lg:sticky lg:top-0 lg:h-dvh lg:p-5">
        <div className="flex items-center justify-between">
          <Logo sobreOscuro />
          <button
            type="button"
            onClick={cerrarSesion}
            className={estilosBoton('onDark', 'sm', 'px-2.5 lg:hidden')}
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <div className="border-y border-sheet/15 py-3">
          <p className="map-label text-sheet/55">Área</p>
          <p className="mt-0.5 font-bold">{ETIQUETAS_AREA_ADMIN[usuario.admin_area]}</p>
        </div>

        <nav aria-label="Panel" className="flex gap-1 overflow-x-auto lg:flex-1 lg:flex-col">
          {seccionesPara(usuario).map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-sheet text-ink-900' : 'text-sheet/70 hover:bg-sheet/10 hover:text-sheet',
                )
              }
            >
              <Icono className="size-4" /> {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="hidden flex-col gap-0.5 border-t border-sheet/15 pt-4 lg:flex">
          <p className="truncate px-3 text-sm font-semibold">
            {usuario.first_name} {usuario.last_name}
          </p>
          <p className="mb-2 truncate px-3 text-xs text-sheet/55">{usuario.email}</p>
          <Link to="/" className={estilosBoton('onDark', 'sm', 'justify-start')}>
            <ArrowUpRight className="size-4" /> Ver sitio
          </Link>
          <button type="button" onClick={cerrarSesion} className={estilosBoton('onDark', 'sm', 'justify-start')}>
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
