import { cn } from '@/lib/cn'

export type VarianteBoton = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onDark'
export type TamanoBoton = 'sm' | 'md' | 'lg'

const VARIANTES: Record<VarianteBoton, string> = {
  primary: 'bg-route-500 text-sheet hover:bg-route-600 active:translate-y-px',
  secondary: 'bg-sheet text-ink-900 ring-1 ring-ink-200 ring-inset hover:bg-paper hover:ring-ink-300',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-ink-900 text-sheet hover:bg-route-600',
  onDark: 'text-sheet/80 hover:bg-sheet/10 hover:text-sheet',
}

const TAMANOS: Record<TamanoBoton, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
}

export function estilosBoton(variante: VarianteBoton = 'primary', tamano: TamanoBoton = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-semibold transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTES[variante],
    TAMANOS[tamano],
    className,
  )
}
