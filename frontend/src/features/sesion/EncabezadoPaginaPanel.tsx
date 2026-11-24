import type { ReactNode } from 'react'

interface PropsEncabezadoPaginaPanel {
  titulo: string
  descripcion: string
  accion?: ReactNode
}

export function EncabezadoPaginaPanel({ titulo, descripcion, accion }: PropsEncabezadoPaginaPanel) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-ink-200 pb-6">
      <div>
        <h1 className="text-3xl">{titulo}</h1>
        <p className="mt-1.5 max-w-xl text-ink-500">{descripcion}</p>
      </div>
      {accion}
    </header>
  )
}
