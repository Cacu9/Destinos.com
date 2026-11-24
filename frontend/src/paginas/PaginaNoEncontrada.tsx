import { Link } from 'react-router'

import { estilosBoton } from '@/components/ui/estilosBoton'
import { EstadoVacio } from '@/components/ui/EstadoVacio'

export function PaginaNoEncontrada() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EstadoVacio
        titulo="Esta ruta no está en el mapa"
        descripcion="La página que buscás no existe o cambió de lugar."
        accion={
          <Link to="/" className={estilosBoton()}>
            Volver al inicio
          </Link>
        }
      />
    </div>
  )
}
