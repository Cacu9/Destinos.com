import { ControlesSesion } from '@/features/sesion/ControlesSesion'

import { Logo } from './Logo'

export function EncabezadoSitio() {
  return (
    <header className="relative z-20 border-b border-ink-900 bg-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-5 sm:gap-10">
          <Logo />
        </div>

        <ControlesSesion />
      </div>
    </header>
  )
}
