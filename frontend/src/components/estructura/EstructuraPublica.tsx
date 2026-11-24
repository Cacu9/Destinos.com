import { Outlet } from 'react-router'

import { Logo } from './Logo'
import { EncabezadoSitio } from './EncabezadoSitio'

export function EstructuraPublica() {
  return (
    <div className="flex min-h-dvh flex-col">
      <EncabezadoSitio />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-900 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <Logo />
          <dl className="grid gap-x-8 gap-y-1 text-[13px] text-ink-500 sm:grid-cols-[auto_auto] sm:text-right">
            <dt className="map-label text-ink-700">Proyecto</dt>
            <dd>Trabajo académico. Vuelos, precios y pagos de demostración.</dd>
          </dl>
        </div>
      </footer>
    </div>
  )
}
