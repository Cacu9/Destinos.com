import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'

export function CampoBusqueda(props: Omit<ComponentProps<'input'>, 'type' | 'className'>) {
  return (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        className="h-10 w-full rounded-lg border border-ink-200 bg-sheet pr-3.5 pl-10 text-sm transition-colors placeholder:text-ink-500 hover:border-ink-300 focus:border-shield-600 focus:ring-3 focus:ring-shield-600/15 focus:outline-none"
        {...props}
      />
    </div>
  )
}
