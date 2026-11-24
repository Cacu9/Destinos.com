import { CircleAlert } from 'lucide-react'

export function AlertaFormulario({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-route-500/40 bg-route-50 px-3.5 py-3 text-sm font-medium text-route-600"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      {mensaje}
    </div>
  )
}
