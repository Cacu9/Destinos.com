import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type TonoInsignia = 'neutral' | 'info' | 'positive' | 'warning'

const TONOS: Record<TonoInsignia, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  info: 'bg-shield-50 text-shield-700',
  positive: 'bg-home/70 text-ink-900',
  warning: 'bg-land text-ink-900',
}

export function Insignia({ tono = 'neutral', children }: { tono?: TonoInsignia; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', TONOS[tono])}>
      {children}
    </span>
  )
}
