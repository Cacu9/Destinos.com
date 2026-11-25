import { cn } from '@/lib/cn'

import { ETIQUETAS_TARIFA, type TarifaVuelo } from './tipos'

const ESTILOS_TARIFA: Record<TarifaVuelo, string> = {
  flexible: 'bg-fare-flexible-50 text-fare-flexible',
  standard: 'bg-fare-standard-50 text-fare-standard',
  promotional: 'bg-fare-promotional-50 text-fare-promotional',
}

/** Sello de la tarifa con el color que la identifica en todo el sitio. */
export function InsigniaTarifa({ tarifa }: { tarifa: TarifaVuelo }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 map-label', ESTILOS_TARIFA[tarifa])}>
      Tarifa {ETIQUETAS_TARIFA[tarifa]}
    </span>
  )
}
