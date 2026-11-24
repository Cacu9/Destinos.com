import { LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router'

import { estilosBoton } from '@/components/ui/estilosBoton'

import { useAutenticacion } from './useAutenticacion'

/** Acciones del encabezado: ingresar y crear cuenta para visitantes; nombre y panel con sesión. */
export function ControlesSesion() {
  const { usuario } = useAutenticacion()

  if (!usuario) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/ingresar" className={estilosBoton('ghost', 'sm')}>
          Ingresar
        </Link>
        <Link to="/registro" className={estilosBoton('secondary', 'sm', 'max-sm:hidden')}>
          Crear cuenta
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {usuario.role === 'admin' && (
        <Link to="/admin" className={estilosBoton('ghost', 'sm')}>
          <LayoutDashboard className="size-4" /> <span className="max-sm:hidden">Panel</span>
        </Link>
      )}
      <span className="mx-2 text-sm font-semibold max-md:hidden">
        {usuario.first_name} {usuario.last_name}
      </span>
    </div>
  )
}
