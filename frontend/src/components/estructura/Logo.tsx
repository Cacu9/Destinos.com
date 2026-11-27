import { Link } from 'react-router'

import { cn } from '@/lib/cn'

/**
 * Marca: un pin de destino con un avión adentro y la ruta punteada que lo trae hasta ahí.
 * Azul de escudo para el pin, rojo de ruta para el trazo y el avión, papel para el fondo.
 */
export function MarcaDestinos({ sobreOscuro = false, className }: { sobreOscuro?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={cn('size-9 shrink-0', className)} aria-hidden>
      {/* Ruta punteada que llega al pin desde abajo a la izquierda. */}
      <path
        d="M2.5 33c3.2-.6 6-2.2 8.4-4.6"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="0.1 3.6"
        className="stroke-route-500"
      />
      {/* Pin */}
      <path
        d="M20 2.5c-6.9 0-12.5 5.4-12.5 12.1 0 8.6 12.5 18.4 12.5 18.4s12.5-9.8 12.5-18.4C32.5 7.9 26.9 2.5 20 2.5Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className={cn('fill-shield-700', sobreOscuro ? 'stroke-sheet' : 'stroke-ink-900')}
      />
      <circle cx="20" cy="14.4" r="7.6" className="fill-sheet" />
      {/* Paralelo del globo, para que el círculo se lea como el mundo. */}
      <path d="M12.6 16.2c4.6 1.6 10.2 1.6 14.8 0" fill="none" strokeWidth="1" className="stroke-water-400" />
      {/* Avión (lucide "plane", escalado) en rojo de ruta. */}
      <path
        transform="translate(14.3 8.7) scale(0.475)"
        d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
        className="fill-route-500"
      />
    </svg>
  )
}

export function Logo({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="Destinos.com, ir al inicio">
      <MarcaDestinos
        sobreOscuro={sobreOscuro}
        className="transition-transform duration-300 group-hover:-translate-y-0.5"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-lg font-extrabold tracking-tight font-expanded',
            sobreOscuro ? 'text-sheet' : 'text-ink-900',
          )}
        >
          destinos
          <span className={sobreOscuro ? 'text-sheet/55' : 'text-route-500'}>.com</span>
        </span>
        <span className={cn('mt-0.5 map-label max-sm:hidden', sobreOscuro ? 'text-sheet/55' : 'text-ink-500')}>
          Agencia de viajes
        </span>
      </span>
    </Link>
  )
}
