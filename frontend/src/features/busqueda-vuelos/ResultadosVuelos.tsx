import { useMemo } from 'react'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { cn } from '@/lib/cn'

import { SelectorOrden } from './SelectorOrden'
import { TarjetaVuelo } from './TarjetaVuelo'
import type { OrdenVuelos, SentidoOrden, Vuelo } from './tipos'
import { ordenarVuelos } from './utilidades'

interface PropsResultadosVuelos {
  vuelos: Vuelo[] | undefined
  cargando: boolean
  actualizando: boolean
  error: Error | null
  orden: OrdenVuelos
  sentido: SentidoOrden
  pasajeros: number
  hayFiltros: boolean
  alCambiarOrden: (orden: OrdenVuelos) => void
  alCambiarSentido: (sentido: SentidoOrden) => void
  alLimpiarFiltros: () => void
}

function EsqueletoTarjeta() {
  return (
    <div aria-hidden className="flex h-52 animate-pulse overflow-hidden rounded-xl border border-ink-200 bg-sheet">
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="h-9 w-48 rounded-md bg-ink-100" />
        <div className="h-14 rounded-md bg-ink-100" />
        <div className="h-4 w-3/4 rounded-md bg-ink-100" />
      </div>
      <div className="w-60 border-l-2 border-dashed border-ink-200 bg-paper/70 max-sm:hidden" />
    </div>
  )
}

/** Cantidad de vuelos, orden y listado; si no hay vuelos, lo informa y ofrece limpiar los filtros. */
export function ResultadosVuelos({
  vuelos,
  cargando,
  actualizando,
  error,
  orden,
  sentido,
  pasajeros,
  hayFiltros,
  alCambiarOrden,
  alCambiarSentido,
  alLimpiarFiltros,
}: PropsResultadosVuelos) {
  const ordenados = useMemo(() => ordenarVuelos(vuelos ?? [], orden, sentido), [vuelos, orden, sentido])

  if (error) return <AlertaFormulario mensaje={`No pudimos buscar vuelos. ${error.message}`} />

  if (cargando) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Buscando vuelos">
        {[0, 1, 2].map((indice) => (
          <EsqueletoTarjeta key={indice} />
        ))}
      </div>
    )
  }

  if (ordenados.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60" role="status">
        <EstadoVacio
          titulo="No encontramos vuelos para tu búsqueda"
          descripcion={
            hayFiltros
              ? 'Probá con otra fecha, otra categoría o quitá algunos filtros.'
              : 'Por ahora no hay vuelos disponibles. Volvé a intentar más tarde.'
          }
          accion={
            hayFiltros && (
              <Boton variante="secondary" onClick={alLimpiarFiltros}>
                Limpiar filtros
              </Boton>
            )
          }
        />
      </div>
    )
  }

  return (
    <section aria-labelledby="titulo-resultados" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-resultados" className="text-lg" role="status">
          {ordenados.length === 1 ? '1 vuelo encontrado' : `${ordenados.length} vuelos encontrados`}
        </h2>
        <SelectorOrden
          orden={orden}
          sentido={sentido}
          alCambiarOrden={alCambiarOrden}
          alCambiarSentido={alCambiarSentido}
        />
      </div>
      <ol className={cn('flex flex-col gap-4 transition-opacity', actualizando && 'opacity-60')}>
        {ordenados.map((vuelo) => (
          <li key={vuelo.id}>
            <TarjetaVuelo vuelo={vuelo} pasajeros={pasajeros} />
          </li>
        ))}
      </ol>
    </section>
  )
}
