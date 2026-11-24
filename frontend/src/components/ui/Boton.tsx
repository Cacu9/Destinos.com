import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'

import { estilosBoton, type TamanoBoton, type VarianteBoton } from './estilosBoton'

interface PropsBoton extends ComponentProps<'button'> {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  cargando?: boolean
}

export function Boton({
  variante,
  tamano,
  cargando,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: PropsBoton) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={estilosBoton(variante, tamano, className)}
      {...props}
    >
      {cargando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
