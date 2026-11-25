import { ArrowDownUp, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'

import { cn } from '@/lib/cn'
import { entradasDe } from '@/lib/entradas'

import { ETIQUETAS_ORDEN, ETIQUETAS_SENTIDO, type OrdenVuelos, type SentidoOrden } from './tipos'

interface PropsSelectorOrden {
  orden: OrdenVuelos
  sentido: SentidoOrden
  alCambiarOrden: (orden: OrdenVuelos) => void
  alCambiarSentido: (sentido: SentidoOrden) => void
}

/** Control para ordenar resultados por precio, duración o escalas en sentido ascendente o descendente. */
export function SelectorOrden({ orden, sentido, alCambiarOrden, alCambiarSentido }: PropsSelectorOrden) {
  const siguienteSentido: SentidoOrden = sentido === 'asc' ? 'desc' : 'asc'
  const IconoSentido = sentido === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Ordenar resultados</legend>
        <span aria-hidden className="flex items-center gap-1.5 map-label text-ink-500">
          <ArrowDownUp className="size-3.5" /> Ordenar por
        </span>
        <div className="inline-flex rounded-lg bg-ink-100 p-1">
          {entradasDe(ETIQUETAS_ORDEN).map(([valor, etiqueta]) => (
            <label
              key={valor}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-shield-600',
                orden === valor ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              <input
                type="radio"
                name="orden"
                value={valor}
                checked={orden === valor}
                onChange={() => alCambiarOrden(valor)}
                className="sr-only"
              />
              {etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => alCambiarSentido(siguienteSentido)}
        aria-label={`Sentido de orden: ${ETIQUETAS_SENTIDO[sentido]}. Cambiar a ${ETIQUETAS_SENTIDO[siguienteSentido]}`}
        title={`Cambiar a ${ETIQUETAS_SENTIDO[siguienteSentido]}`}
        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 bg-sheet px-3 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:text-ink-900"
      >
        <IconoSentido className="size-4 text-shield-700" aria-hidden />
        <span>{ETIQUETAS_SENTIDO[sentido]}</span>
      </button>
    </div>
  )
}
