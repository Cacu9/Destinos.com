import { ArrowRight, Building2, Plane } from 'lucide-react'
import { Link } from 'react-router'

import { estilosBoton } from '@/components/ui/estilosBoton'
import { PasePasajero } from '@/features/registro/PasePasajero'

import { RutasDestacadas } from './RutasDestacadas'

export function PaginaInicio() {
  return (
    <>
      <section className="border-b border-ink-900">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl">Tu próximo viaje, con todo a la vista.</h1>
            <p className="mt-4 max-w-md text-lg text-ink-700">
              Vuelos, alojamientos y paquetes con sus condiciones de cancelación claras antes de pagar. Creá tu cuenta
              para reservar, pagar y publicar reseñas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/vuelos" className={estilosBoton('primary', 'lg')}>
                <Plane className="size-4" /> Buscar vuelos
              </Link>
              <Link to="/alojamientos" className={estilosBoton('secondary', 'lg')}>
                <Building2 className="size-4" /> Ver alojamientos
              </Link>
              <Link to="/registro" className={estilosBoton('ghost', 'lg')}>
                Crear cuenta <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="hidden place-items-center rounded-xl bg-water-100 p-12 lg:grid">
            <PasePasajero pasajero="" />
          </div>
        </div>
      </section>
      <RutasDestacadas />
    </>
  )
}
