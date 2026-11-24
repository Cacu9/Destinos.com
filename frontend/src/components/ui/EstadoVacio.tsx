import type { ReactNode } from 'react'

interface PropsEstadoVacio {
  titulo: string
  descripcion?: string
  accion?: ReactNode
}

/** Una hoja vacía: una ruta punteada que no lleva a ningún lado, el título y el camino a seguir. */
export function EstadoVacio({ titulo, descripcion, accion }: PropsEstadoVacio) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <svg viewBox="0 0 120 24" className="mb-5 h-6 w-30" aria-hidden>
        <circle cx={6} cy={12} r={4} className="fill-sheet stroke-ink-900" strokeWidth={1.5} />
        <line x1={14} x2={100} y1={12} y2={12} strokeWidth={2} strokeDasharray="5 5" className="stroke-ink-300" />
        <path d="m106 6 8 12m0-12-8 12" strokeWidth={2} strokeLinecap="round" className="stroke-route-500" />
      </svg>
      <h3 className="max-w-md text-xl">{titulo}</h3>
      {descripcion && <p className="mt-2 max-w-sm text-sm text-ink-500">{descripcion}</p>}
      {accion && <div className="mt-6">{accion}</div>}
    </div>
  )
}
