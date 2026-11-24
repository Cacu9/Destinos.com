import type { ReactNode } from 'react'

import { Logo } from '@/components/estructura/Logo'

import { PasePasajero } from './PasePasajero'

interface PropsEstructuraAcceso {
  titulo: string
  subtitulo?: ReactNode
  /** Nombre que se muestra en el pase de abordar junto al formulario. */
  pasajero: string
  children: ReactNode
}

export function EstructuraAcceso({ titulo, subtitulo, pasajero, children }: PropsEstructuraAcceso) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      <aside className="relative hidden place-items-center overflow-hidden border-r border-ink-900 bg-water-100 p-12 lg:grid">
        <PasePasajero pasajero={pasajero} />
      </aside>

      <section className="flex flex-col bg-paper px-4 py-8 sm:px-12">
        <Logo />
        <div className="my-auto w-full max-w-sm self-center py-12">
          <h1 className="text-4xl">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-ink-700">{subtitulo}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  )
}
