import { lazy, Suspense, type ComponentProps } from 'react'

import { cn } from '@/lib/cn'

// El mapa trae el contorno de los países; cargarlo aparte lo deja fuera del paquete principal.
const MapaRutas = lazy(() => import('./MapaRutas').then(({ MapaRutas }) => ({ default: MapaRutas })))

export function MapaRutasDiferido(props: ComponentProps<typeof MapaRutas>) {
  return (
    <Suspense fallback={<div aria-hidden className={cn('animate-pulse bg-water-100', props.className)} />}>
      <MapaRutas {...props} />
    </Suspense>
  )
}
