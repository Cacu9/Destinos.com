import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAeropuertos, useBusquedaVuelos } from '@/features/busqueda-vuelos/consultas'
import { ETIQUETAS_TIPO_VUELO, type Vuelo } from '@/features/busqueda-vuelos/tipos'
import { formatearPrecio, precioEnArs } from '@/features/busqueda-vuelos/utilidades'
import { estiloTramo } from '@/features/mapa/colores'
import { coordenadasDe, puntosDe, rutasDeVuelo } from '@/features/mapa/geo'
import { MapaRutasDiferido } from '@/features/mapa/MapaRutasDiferido'
import { cn } from '@/lib/cn'
import { textoEquivalente } from '@/lib/divisas'

const CANTIDAD = 6

/** El pasaje más barato hacia cada destino, para mostrar en la portada. */
function masBaratosPorDestino(vuelos: Vuelo[]): Vuelo[] {
  const porDestino = new Map<string, Vuelo>()
  for (const vuelo of vuelos) {
    const actual = porDestino.get(vuelo.destination.code)
    if (!actual || precioEnArs(vuelo) < precioEnArs(actual)) porDestino.set(vuelo.destination.code, vuelo)
  }
  // Mezcla nacionales e internacionales: primero los más lejanos en duración, que lucen mejor en el mapa.
  return [...porDestino.values()].toSorted((a, b) => b.duration_minutes - a.duration_minutes).slice(0, CANTIDAD)
}

/** Portada: rutas reales del catálogo, con su precio en pesos y dólares; al pasar por una, el mapa la dibuja. */
export function RutasDestacadas() {
  const { data: aeropuertos = [] } = useAeropuertos()
  const { data: vuelos = [], isPending } = useBusquedaVuelos({})
  const destacados = useMemo(() => masBaratosPorDestino(vuelos), [vuelos])
  const [idActivo, setIdActivo] = useState<number>()

  const coordenadas = useMemo(() => coordenadasDe(aeropuertos), [aeropuertos])
  const puntos = useMemo(() => puntosDe(aeropuertos, coordenadas), [aeropuertos, coordenadas])
  const activo = destacados.find((vuelo) => vuelo.id === idActivo) ?? destacados[0]
  const rutas = useMemo(() => (activo ? rutasDeVuelo(activo, coordenadas) : []), [activo, coordenadas])

  if (!isPending && destacados.length === 0) return null

  return (
    <section className="border-b border-ink-900 bg-sheet" aria-labelledby="titulo-rutas">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:py-20">
        <div className="flex flex-col">
          <p className="map-label text-route-600">Rutas del catálogo</p>
          <h2 id="titulo-rutas" className="mt-1 text-3xl sm:text-4xl">
            ¿A dónde vamos?
          </h2>
          <p className="mt-2 mb-6 max-w-md text-ink-700">
            El precio más bajo hacia cada destino, en pesos y en dólares. Pasá el mouse por una ruta para verla en el
            mapa.
          </p>

          <ol className="flex flex-col divide-y divide-ink-100 rounded-xl border border-ink-200 bg-paper/50">
            {isPending &&
              [0, 1, 2, 3].map((indice) => (
                <li key={indice} aria-hidden className="h-[4.5rem] animate-pulse px-4 py-3">
                  <div className="h-4 w-40 rounded bg-ink-100" />
                  <div className="mt-2 h-3 w-24 rounded bg-ink-100" />
                </li>
              ))}
            {destacados.map((vuelo) => {
              const seleccionado = vuelo.id === activo?.id
              return (
                <li key={vuelo.id}>
                  <Link
                    to={`/vuelos?destino=${vuelo.destination.code}`}
                    onMouseEnter={() => setIdActivo(vuelo.id)}
                    onFocus={() => setIdActivo(vuelo.id)}
                    className={cn(
                      'group flex items-center gap-4 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl',
                      seleccionado ? 'bg-sheet' : 'hover:bg-sheet',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'h-9 w-1 shrink-0 rounded-full transition-colors',
                        seleccionado ? estiloTramo(0).swatch : 'bg-ink-200',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink-900">{vuelo.destination.city}</span>
                      <span className="block truncate text-[13px] text-ink-500" data-numeric>
                        {[vuelo.legs[0].origin, ...vuelo.legs.map((tramo) => tramo.destination)]
                          .map((aeropuerto) => aeropuerto.code)
                          .join(' → ')}{' '}
                        · {ETIQUETAS_TIPO_VUELO[vuelo.flight_type]} · {vuelo.airline.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-right" data-numeric>
                      <span className="block text-[11px] text-ink-500">desde</span>
                      <span className="block font-extrabold font-expanded">
                        {formatearPrecio(vuelo.price, vuelo.currency)}
                      </span>
                      <span className="block text-[12px] text-ink-500">
                        {textoEquivalente(vuelo.price, vuelo.currency)}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-route-500"
                    />
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>

        <MapaRutasDiferido
          points={puntos}
          routes={rutas}
          label={activo ? `Mapa con la ruta a ${activo.destination.city}` : 'Mapa de los destinos del catálogo'}
          className="h-80 rounded-xl border border-ink-900 shadow-sheet sm:h-[28rem] lg:h-full lg:min-h-[30rem]"
        />
      </div>
    </section>
  )
}
