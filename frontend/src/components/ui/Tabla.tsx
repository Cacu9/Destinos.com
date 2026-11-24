import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export function Tabla({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-sheet">
      <table className={cn('w-full min-w-[40rem] text-left text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn('border-b border-ink-200 bg-paper/60 px-4 py-3 map-label text-ink-500 first:pl-5', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('border-b border-ink-100 px-4 py-3 align-middle first:pl-5', className)} {...props} />
}

export function BotonIcono({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'grid size-9 cursor-pointer place-items-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900',
        className,
      )}
      {...props}
    />
  )
}
