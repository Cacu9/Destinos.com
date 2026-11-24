import { ChevronDown } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

const CLASES_CONTROL =
  'h-11 w-full rounded-lg border bg-sheet px-3.5 text-[15px] text-ink-900 transition-colors placeholder:text-ink-500 ' +
  'hover:border-ink-300 focus:border-shield-600 focus:outline-none focus:ring-3 focus:ring-shield-600/15'

interface PropsControl {
  id: string
  className: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

interface PropsCampo {
  etiqueta: string
  error?: string
  ayuda?: string
  className?: string
  children: (control: PropsControl) => ReactNode
}

/** Etiqueta, control y mensaje de validación conectados entre sí para la accesibilidad. */
export function Campo({ etiqueta, error, ayuda, className, children }: PropsCampo) {
  const id = useId()
  const idMensaje = `${id}-message`
  const mensaje = error ?? ayuda

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-700">
        {etiqueta}
      </label>
      {children({
        id,
        className: cn(CLASES_CONTROL, error ? 'border-route-500' : 'border-ink-200'),
        'aria-invalid': Boolean(error),
        'aria-describedby': mensaje ? idMensaje : undefined,
      })}
      {mensaje && (
        <p id={idMensaje} className={cn('text-[13px]', error ? 'text-route-600' : 'text-ink-500')}>
          {mensaje}
        </p>
      )}
    </div>
  )
}

type PropsCampoTexto = Omit<PropsCampo, 'children'> & Omit<ComponentProps<'input'>, 'className'>

export function CampoTexto({ etiqueta, error, ayuda, className, ...entrada }: PropsCampoTexto) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
      {(control) => <input {...entrada} {...control} />}
    </Campo>
  )
}

type PropsCampoSeleccion = Omit<PropsCampo, 'children'> & Omit<ComponentProps<'select'>, 'className'>

export function CampoSeleccion({ etiqueta, error, ayuda, className, children, ...seleccion }: PropsCampoSeleccion) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
      {(control) => (
        <div className="relative">
          <select {...seleccion} {...control} className={cn(control.className, 'appearance-none pr-10')}>
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-500" />
        </div>
      )}
    </Campo>
  )
}
