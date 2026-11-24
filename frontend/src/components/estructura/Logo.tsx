import { useId } from 'react'
import { Link } from 'react-router'

import { cn } from '@/lib/cn'

/** Escudo de ruta: franja superior azul, fondo blanco y una ruta roja que lo atraviesa. */
function MarcaEscudo({ sobreOscuro }: { sobreOscuro: boolean }) {
  const idRecorte = useId()
  return (
    <svg viewBox="0 0 28 32" className="h-8 w-7 shrink-0" aria-hidden>
      <defs>
        <clipPath id={idRecorte}>
          <path d="M2 2h24v15.5C26 24 20.5 28.4 14 30.5 7.5 28.4 2 24 2 17.5Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${idRecorte})`}>
        <rect width="28" height="32" className="fill-sheet" />
        <rect width="28" height="9" className="fill-shield-700" />
        <path
          d="M5 27c3-6 4-9 9-11s7-4 9-8"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-route-500"
        />
      </g>
      <path
        d="M2 2h24v15.5C26 24 20.5 28.4 14 30.5 7.5 28.4 2 24 2 17.5Z"
        fill="none"
        strokeWidth="2"
        className={sobreOscuro ? 'stroke-sheet' : 'stroke-ink-900'}
      />
    </svg>
  )
}

export function Logo({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Destinos.com, ir al inicio">
      <MarcaEscudo sobreOscuro={sobreOscuro} />
      <span
        className={cn('text-lg font-extrabold tracking-tight font-expanded', sobreOscuro ? 'text-sheet' : 'text-ink-900')}
      >
        destinos
        <span className={sobreOscuro ? 'text-sheet/55' : 'text-ink-500'}>.com</span>
      </span>
    </Link>
  )
}
