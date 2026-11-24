/** Un pase de abordar con el nombre del visitante: la cuenta es su pase para reservar. */
export function PasePasajero({ pasajero }: { pasajero: string }) {
  return (
    <figure
      aria-hidden
      className="relative flex w-full max-w-md -rotate-2 overflow-hidden rounded-xl bg-sheet shadow-float"
    >
      <div className="flex-1 p-6">
        <p className="map-label text-route-500">Pase de abordar</p>
        <p className="mt-4 map-label text-ink-500">Pasajero</p>
        <p className="min-h-8 truncate text-2xl font-extrabold font-expanded">{pasajero || 'Tu nombre'}</p>
        <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-end gap-4">
          <div>
            <p className="map-label text-ink-500">Desde</p>
            <p className="text-3xl leading-none font-extrabold font-expanded">HOY</p>
          </div>
          <span className="mb-2 border-t-2 border-dashed border-ink-300" />
          <div className="text-right">
            <p className="map-label text-ink-500">Hacia</p>
            <p className="text-3xl leading-none font-extrabold font-expanded">???</p>
          </div>
        </div>
      </div>
      <div className="relative w-28 border-l-2 border-dashed border-ink-200 bg-route-50 p-4">
        <span className="absolute -top-3 -left-3 size-6 rounded-full bg-water-100" />
        <span className="absolute -bottom-3 -left-3 size-6 rounded-full bg-water-100" />
        <p className="map-label text-route-600">Asiento</p>
        <p className="text-2xl font-extrabold font-expanded">1A</p>
        <svg viewBox="0 0 60 80" className="mt-6 w-full" preserveAspectRatio="none">
          {[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1].map((ancho, indice, barras) => {
            const x = barras.slice(0, indice).reduce((suma, barra) => suma + barra + 1.5, 0)
            return <rect key={indice} x={x} width={ancho} height={80} className="fill-ink-900" />
          })}
        </svg>
      </div>
    </figure>
  )
}
