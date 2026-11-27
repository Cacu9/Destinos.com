import { Building2, Plane } from 'lucide-react'
import { NavLink } from 'react-router'

import { estilosBoton } from '@/components/ui/estilosBoton'
import { ControlesSesion } from '@/features/sesion/ControlesSesion'
import { cn } from '@/lib/cn'

import { Logo } from './Logo'

export function EncabezadoSitio() {
  return (
    <header className="relative z-20 border-b border-ink-900 bg-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-5 sm:gap-10">
          <Logo />
          <nav aria-label="Principal" className="flex items-center gap-1">
            <NavLink
              to="/vuelos"
              className={({ isActive }) => cn(estilosBoton('ghost', 'sm'), isActive && 'bg-ink-100 text-ink-900')}
            >
              <Plane className="size-4" /> Vuelos
            </NavLink>
            <NavLink
              to="/alojamientos"
              className={({ isActive }) => cn(estilosBoton('ghost', 'sm'), isActive && 'bg-ink-100 text-ink-900')}
            >
              <Building2 className="size-4" /> Alojamientos
            </NavLink>
          </nav>
        </div>

        <ControlesSesion />
      </div>
    </header>
  )
}
