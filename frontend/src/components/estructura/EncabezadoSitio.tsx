import { Link } from 'react-router'

import { estilosBoton } from '@/components/ui/estilosBoton'

import { Logo } from './Logo'

export function EncabezadoSitio() {
  return (
    <header className="relative z-20 border-b border-ink-900 bg-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <Link to="/registro" className={estilosBoton('secondary', 'sm')}>
          Crear cuenta
        </Link>
      </div>
    </header>
  )
}
