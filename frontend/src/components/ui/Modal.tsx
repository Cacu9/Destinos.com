import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface PropsModal {
  abierto: boolean
  titulo: string
  descripcion?: string
  alCerrar: () => void
  children: ReactNode
}

export function Modal({ abierto, titulo, descripcion, alCerrar, children }: PropsModal) {
  const refDialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = refDialogo.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={refDialogo}
      onClose={alCerrar}
      onClick={(evento) => evento.target === refDialogo.current && alCerrar()}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl bg-sheet p-0 text-ink-900 shadow-float backdrop:bg-ink-950/45"
    >
      {abierto && (
        <div className="p-6 sm:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl">{titulo}</h2>
              {descripcion && <p className="mt-1 text-sm text-ink-500">{descripcion}</p>}
            </div>
            <button
              type="button"
              onClick={alCerrar}
              className="-m-1 cursor-pointer rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
