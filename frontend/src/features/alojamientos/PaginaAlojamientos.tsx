import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BedDouble,
  CalendarX2,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Insignia } from '@/components/ui/Insignia'
import {
  ETIQUETAS_TIPO_ALOJAMIENTO,
  type AlojamientoPublico,
  type TipoAlojamiento,
} from '@/features/alojamientos-admin/consultas'
import { useAeropuertos } from '@/features/busqueda-vuelos/consultas'
import { PAIS_LOCAL } from '@/features/busqueda-vuelos/tipos'
import { formatearPrecioDivisa } from '@/features/vuelos-admin/formato'
import { cn } from '@/lib/cn'
import { entradasDe } from '@/lib/entradas'

import { useAlojamientosPublicos, type FiltrosAlojamientosPublicos } from './consultas'

type OrdenAlojamiento = 'precio' | 'estrellas'
type Sentido = 'asc' | 'desc'

const TASAS_ARS = { ARS: 1, USD: 1200 } as const

function precioEquivalenteArs(a: AlojamientoPublico): number {
  return Number(a.price_per_night) * TASAS_ARS[a.currency]
}

function TarjetaAlojamiento({ item, noches }: { item: AlojamientoPublico; noches: number }) {
  const precioNoche = Number(item.price_per_night)
  const total = precioNoche * noches

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-sheet shadow-sheet transition-shadow hover:shadow-float sm:flex-row">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Insignia tono="info">{ETIQUETAS_TIPO_ALOJAMIENTO[item.accommodation_type]}</Insignia>
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-fare-standard">
                {Array.from({ length: item.stars }, (_, i) => (
                  <Star key={i} className="size-3.5 fill-current" aria-hidden />
                ))}
                <span className="sr-only">{item.stars} estrellas</span>
              </span>
            </div>
            <h3 className="mt-2 text-lg leading-tight">{item.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
              <MapPin className="size-3.5 shrink-0 text-route-500" aria-hidden />
              {item.city} ({item.destination_code}) · {item.address}
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-700">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-ink-500" aria-hidden />
            Hasta {item.max_guests} {item.max_guests === 1 ? 'huésped' : 'huéspedes'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="size-3.5 text-ink-500" aria-hidden />
            {item.available_rooms} {item.available_rooms === 1 ? 'habitación disponible' : 'habitaciones disponibles'}
          </span>
          {item.amenities && <span className="text-ink-500">· {item.amenities}</span>}
        </div>

        <p className="flex items-start gap-2 border-t border-ink-100 pt-3.5 text-[13px] text-ink-700">
          {item.is_refundable ? (
            <ShieldCheck className="mt-px size-4 shrink-0 text-fare-flexible" aria-hidden />
          ) : (
            <CalendarX2 className="mt-px size-4 shrink-0 text-route-600" aria-hidden />
          )}
          <span>
            <span className="font-semibold text-ink-900">
              {item.is_refundable ? 'Reembolsable' : 'No reembolsable'} ·{' '}
            </span>
            {item.cancellation_policy || 'Consultá condiciones al reservar.'}
          </span>
        </p>
      </div>

      <div className="relative flex flex-col justify-between gap-3 border-ink-200 bg-paper/70 p-5 max-sm:border-t-2 max-sm:border-dashed sm:w-60 sm:border-l-2 sm:border-dashed">
        <span
          className="absolute -top-3 -left-3 size-6 rounded-full border border-ink-200 bg-paper max-sm:hidden"
          aria-hidden
        />
        <span
          className="absolute -bottom-3 -left-3 size-6 rounded-full border border-ink-200 bg-paper max-sm:hidden"
          aria-hidden
        />
        <div className="flex items-center justify-between gap-2">
          <Insignia tono={item.is_refundable ? 'positive' : 'warning'}>
            {item.is_refundable ? 'Cancelación flexible' : 'Tarifa fija'}
          </Insignia>
          <span className="rounded bg-ink-100 px-1.5 py-0.5 map-label text-ink-700">{item.currency}</span>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-extrabold font-expanded" data-numeric>
            {formatearPrecioDivisa(total, item.currency)}
          </p>
          <p className="text-[13px] text-ink-500">
            {noches === 1
              ? `por noche en ${item.currency}`
              : `total ${noches} noches · ${formatearPrecioDivisa(precioNoche, item.currency)}/noche`}
          </p>
        </div>
      </div>
    </article>
  )
}

export function PaginaAlojamientos() {
  const { data: aeropuertos = [] } = useAeropuertos()
  const [destino, setDestino] = useState('')
  const [tipo, setTipo] = useState<TipoAlojamiento | ''>('')
  const [huespedes, setHuespedes] = useState('')
  const [estrellas, setEstrellas] = useState('')
  const [noches, setNoches] = useState('1')
  const [busqueda, setBusqueda] = useState('')
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosAlojamientosPublicos>({})
  const [orden, setOrden] = useState<OrdenAlojamiento>('precio')
  const [sentido, setSentido] = useState<Sentido>('asc')

  const { data: lista = [], isPending, isPlaceholderData, error } = useAlojamientosPublicos(filtrosAplicados)

  const hayFiltros = Object.values(filtrosAplicados).some((v) => v !== undefined && v !== '')

  const aplicarFiltros = (e: FormEvent) => {
    e.preventDefault()
    setFiltrosAplicados({
      destination: destino || undefined,
      accommodation_type: tipo || undefined,
      min_guests: huespedes ? Number(huespedes) : undefined,
      min_stars: estrellas ? Number(estrellas) : undefined,
      search: busqueda.trim() || undefined,
    })
  }

  const limpiar = () => {
    setDestino('')
    setTipo('')
    setHuespedes('')
    setEstrellas('')
    setBusqueda('')
    setNoches('1')
    setFiltrosAplicados({})
  }

  const ordenados = useMemo(() => {
    const factor = sentido === 'asc' ? 1 : -1
    return lista.toSorted((a, b) => {
      if (orden === 'estrellas') {
        return (a.stars - b.stars) * factor || (precioEquivalenteArs(a) - precioEquivalenteArs(b)) * factor
      }
      return (precioEquivalenteArs(a) - precioEquivalenteArs(b)) * factor || a.id - b.id
    })
  }, [lista, orden, sentido])

  const cantidadNoches = Math.max(1, Number(noches) || 1)
  const IconoSentido = sentido === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow

  return (
    <>
      <section className="border-b border-ink-900 bg-water-100">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6">
          <p className="map-label text-route-600">Alojamientos</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">Buscá tu alojamiento</h1>
          <p className="mt-2 mb-6 max-w-xl text-ink-700">
            Hoteles, departamentos y cabañas en los destinos habilitados, con tarifa por noche, divisa y política de
            cancelación a la vista.
          </p>

          <form
            onSubmit={aplicarFiltros}
            noValidate
            className="grid items-end gap-4 rounded-xl border border-ink-900 bg-sheet p-5 shadow-sheet sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.8fr_auto]"
          >
            <CampoSeleccion etiqueta="Destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">Todos los destinos</option>
              {[
                { etiqueta: 'Argentina', lista: aeropuertos.filter((a) => a.country === PAIS_LOCAL) },
                { etiqueta: 'Exterior', lista: aeropuertos.filter((a) => a.country !== PAIS_LOCAL) },
              ].map(({ etiqueta, lista: grupo }) => (
                <optgroup key={etiqueta} label={etiqueta}>
                  {grupo.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.city} ({a.code})
                    </option>
                  ))}
                </optgroup>
              ))}
            </CampoSeleccion>

            <CampoSeleccion
              etiqueta="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAlojamiento | '')}
            >
              <option value="">Todos los tipos</option>
              {entradasDe(ETIQUETAS_TIPO_ALOJAMIENTO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </CampoSeleccion>

            <CampoSeleccion etiqueta="Huéspedes" value={huespedes} onChange={(e) => setHuespedes(e.target.value)}>
              <option value="">Cualquiera</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}+ {n === 1 ? 'huésped' : 'huéspedes'}
                </option>
              ))}
            </CampoSeleccion>

            <CampoSeleccion etiqueta="Estrellas" value={estrellas} onChange={(e) => setEstrellas(e.target.value)}>
              <option value="">Todas</option>
              {[3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+ estrellas
                </option>
              ))}
            </CampoSeleccion>

            <CampoTexto
              etiqueta="Noches"
              type="number"
              min={1}
              max={30}
              value={noches}
              onChange={(e) => setNoches(e.target.value)}
            />

            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
              {hayFiltros && (
                <Boton variante="secondary" onClick={limpiar}>
                  <RotateCcw className="size-4" /> Limpiar
                </Boton>
              )}
              <Boton type="submit" className="flex-1">
                <Search className="size-4" /> Buscar
              </Boton>
            </div>

            <div className="sm:col-span-2 lg:col-span-6">
              <CampoTexto
                etiqueta="Buscar por nombre o servicio (opcional)"
                placeholder="Ej: Llao Llao, pileta, spa, desayuno..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error ? (
          <p role="alert" className="text-sm font-medium text-route-600">
            No pudimos cargar los alojamientos: {error.message}
          </p>
        ) : isPending ? (
          <p className="text-sm text-ink-500">Buscando alojamientos...</p>
        ) : ordenados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60" role="status">
            <EstadoVacio
              titulo="No encontramos alojamientos para tu búsqueda"
              descripcion="Probá cambiando el destino, el tipo de alojamiento o la cantidad de huéspedes."
              accion={
                hayFiltros && (
                  <Boton variante="secondary" onClick={limpiar}>
                    Limpiar filtros
                  </Boton>
                )
              }
            />
          </div>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg" role="status">
                {ordenados.length === 1 ? '1 alojamiento encontrado' : `${ordenados.length} alojamientos encontrados`}
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden className="flex items-center gap-1.5 map-label text-ink-500">
                  <ArrowDownUp className="size-3.5" /> Ordenar por
                </span>
                <div className="inline-flex rounded-lg bg-ink-100 p-1">
                  {(
                    [
                      ['precio', 'Precio'],
                      ['estrellas', 'Estrellas'],
                    ] as const
                  ).map(([valor, etiqueta]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setOrden(valor)}
                      className={cn(
                        'cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                        orden === valor ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
                      )}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSentido((s) => (s === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 bg-sheet px-3 text-sm font-semibold text-ink-700 hover:border-ink-300 hover:text-ink-900"
                >
                  <IconoSentido className="size-4 text-shield-700" aria-hidden />
                  {sentido === 'asc' ? 'Menor a mayor' : 'Mayor a menor'}
                </button>
              </div>
            </div>

            <ol className={cn('flex flex-col gap-4 transition-opacity', isPlaceholderData && 'opacity-60')}>
              {ordenados.map((item) => (
                <li key={item.id}>
                  <TarjetaAlojamiento item={item} noches={cantidadNoches} />
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  )
}
