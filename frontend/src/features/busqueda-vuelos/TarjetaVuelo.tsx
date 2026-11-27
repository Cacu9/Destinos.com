import { CalendarX2, ChevronDown, ChevronUp, Clock, ShieldCheck, TicketX } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Insignia } from '@/components/ui/Insignia'
import { estiloTramo } from '@/features/mapa/colores'
import { useAutenticacion } from '@/features/sesion/useAutenticacion'
import { cn } from '@/lib/cn'
import { textoEquivalente } from '@/lib/divisas'

import { useDetalleVuelo } from './consultas'
import { InsigniaTarifa } from './InsigniaTarifa'
import {
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_TIPO_VUELO,
  type TarifaVuelo,
  type TipoVuelo,
  type TramoVuelo,
  type Vuelo,
} from './tipos'
import {
  diasEntre,
  formatearDuracion,
  formatearFecha,
  formatearHora,
  formatearPrecio,
  textoEscalas,
} from './utilidades'

const ICONOS_CANCELACION: Record<TarifaVuelo, typeof ShieldCheck> = {
  flexible: ShieldCheck,
  standard: CalendarX2,
  promotional: TicketX,
}

function Extremo({
  hora,
  codigo,
  ciudad,
  alineacion,
  diasDeMas = 0,
}: {
  hora: string
  codigo: string
  ciudad: string
  alineacion: 'izquierda' | 'derecha'
  /** Días después de la salida en que llega (vuelos nocturnos o largos). */
  diasDeMas?: number
}) {
  return (
    <div className={cn('min-w-0', alineacion === 'derecha' && 'text-right')}>
      <p className="text-2xl leading-none font-extrabold font-expanded sm:text-3xl" data-numeric>
        {hora}
      </p>
      <p className="mt-1.5 text-sm font-bold">
        {diasDeMas > 0 && (
          <span className="mr-1.5 rounded bg-route-50 px-1 py-px text-[11px] font-semibold text-route-600">
            {diasDeMas === 1 ? 'llega al día siguiente' : `llega ${diasDeMas} días después`}
          </span>
        )}
        {codigo}
      </p>
      <p className="truncate text-[13px] text-ink-500">{ciudad}</p>
    </div>
  )
}

/** La ruta entre los dos aeropuertos de un tramo: una línea con un punto por cada escala. */
function Trayecto({
  escalas,
  cantidadEscalas,
  duracion,
}: {
  escalas: string[]
  cantidadEscalas?: number
  duracion: number
}) {
  const totalEscalas = cantidadEscalas ?? escalas.length
  const puntos = escalas.length > 0 ? escalas : Array.from({ length: totalEscalas }, (_, idx) => `E${idx + 1}`)

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-1 pt-1">
      <span className="flex items-center gap-1 text-[13px] text-ink-500">
        <Clock className="size-3.5" aria-hidden /> {formatearDuracion(duracion)}
      </span>
      <div className="relative flex w-full items-center" aria-hidden>
        <span className="size-2 rounded-full border-2 border-ink-900 bg-sheet" />
        <span className="flex flex-1 justify-evenly border-t-2 border-ink-900">
          {puntos.map((escala) => (
            <span key={escala} className="-mt-[5px] size-2 rounded-full bg-route-500 ring-2 ring-sheet" />
          ))}
        </span>
        <span className="size-2 rounded-full bg-ink-900" />
      </div>
      <span className={cn('text-[13px] font-semibold', totalEscalas === 0 ? 'text-fare-flexible' : 'text-route-600')}>
        {textoEscalas(escalas, cantidadEscalas)}
        {escalas.length > 0 && <span className="font-normal text-ink-500"> · {escalas.join(', ')}</span>}
      </span>
    </div>
  )
}

function etiquetaTramo(tipo: TipoVuelo, indice: number): string {
  if (tipo === 'round_trip') return indice === 0 ? 'Ida' : 'Vuelta'
  return `Tramo ${indice + 1}`
}

function FilaTramo({ tramo, etiqueta, indice }: { tramo: TramoVuelo; etiqueta?: string; indice: number }) {
  return (
    <div className="flex flex-col gap-2">
      {etiqueta && (
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span className={cn('flex items-center gap-1.5 map-label', estiloTramo(indice).texto)}>
            <span aria-hidden className={cn('h-[3px] w-4 rounded-full', estiloTramo(indice).swatch)} />
            {etiqueta}
          </span>
          <span>
            {tramo.flight_number} · {formatearFecha(tramo.departure)}
          </span>
        </div>
      )}
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 sm:gap-5">
        <Extremo
          hora={formatearHora(tramo.departure)}
          codigo={tramo.origin.code}
          ciudad={tramo.origin.city}
          alineacion="izquierda"
        />
        <Trayecto escalas={tramo.stops} cantidadEscalas={tramo.stops_count} duracion={tramo.duration_minutes} />
        <Extremo
          hora={formatearHora(tramo.arrival)}
          codigo={tramo.destination.code}
          ciudad={tramo.destination.city}
          alineacion="derecha"
          diasDeMas={diasEntre(tramo.departure, tramo.arrival)}
        />
      </div>
    </div>
  )
}

interface PropsTarjetaVuelo {
  vuelo: Vuelo
  pasajeros: number
  /** La tarjeta cuya ruta muestra el mapa. */
  activa?: boolean
  /** Se llama al pasar el mouse o enfocar la tarjeta, para dibujar su ruta en el mapa. */
  alActivar?: () => void
}

/** Un vuelo como pase de abordar: los tramos a la izquierda y, en el talón, tarifa, divisa y precio. */
export function TarjetaVuelo({ vuelo, pasajeros, activa = false, alActivar }: PropsTarjetaVuelo) {
  const { usuario } = useAutenticacion()
  const [mostrarDetalle, setMostrarDetalle] = useState(false)
  const detalle = useDetalleVuelo(vuelo.backend_id, Boolean(usuario) && mostrarDetalle)
  const IconoCancelacion = ICONOS_CANCELACION[vuelo.fare]
  const variosTramos = vuelo.legs.length > 1
  const tarifaDetalle = detalle.data?.fares.find((f) => f.cabin_class === vuelo.category)
  const resumenCancelacion = detalle.data?.cancellation_policy || vuelo.cancellation_summary

  return (
    <article
      aria-label={`${vuelo.airline.name} ${vuelo.flight_number}, ${vuelo.origin.city} a ${vuelo.destination.city}`}
      onMouseEnter={alActivar}
      onFocus={alActivar}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-sheet shadow-sheet transition-[box-shadow,border-color] duration-200 hover:shadow-float sm:flex-row',
        activa ? 'border-ink-900 shadow-float' : 'border-ink-200',
      )}
    >
      <div className="flex flex-1 flex-col gap-5 p-5">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="grid size-9 place-items-center rounded-md bg-shield-700 text-xs font-extrabold text-sheet font-expanded">
            {vuelo.airline.code}
          </span>
          <div className="mr-auto">
            <h3 className="text-base leading-tight">{vuelo.airline.name}</h3>
            <p className="text-[13px] text-ink-500">
              Vuelo {vuelo.flight_number} · {formatearFecha(vuelo.departure)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Insignia tono="neutral">{ETIQUETAS_TIPO_VUELO[vuelo.flight_type]}</Insignia>
            <Insignia tono="info">{ETIQUETAS_CATEGORIA[vuelo.category]}</Insignia>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {vuelo.legs.map((tramo, indice) => (
            <div
              key={`${tramo.flight_number}-${tramo.departure}`}
              className={cn(indice > 0 && 'border-t border-ink-100 pt-3')}
            >
              <FilaTramo
                tramo={tramo}
                indice={indice}
                etiqueta={variosTramos ? etiquetaTramo(vuelo.flight_type, indice) : undefined}
              />
            </div>
          ))}
        </div>

        {variosTramos && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink-700">
            <span>
              Duración total en vuelo:{' '}
              <strong className="text-ink-900">{formatearDuracion(vuelo.duration_minutes)}</strong>
            </span>
            <span>
              {(vuelo.stops_count ?? vuelo.stops.length) === 0 ? (
                <strong className="text-ink-900">Todos los tramos son directos</strong>
              ) : (
                <>
                  Escalas totales:{' '}
                  <strong className="text-ink-900">{textoEscalas(vuelo.stops, vuelo.stops_count)}</strong>
                </>
              )}
            </span>
          </div>
        )}

        <div className="border-t border-ink-100 pt-4 text-[13px] text-ink-700">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex items-start gap-2">
              <IconoCancelacion className="mt-px size-4 shrink-0 text-ink-500" aria-hidden />
              <span>
                <span className="font-semibold text-ink-900">Cancelación: </span>
                {resumenCancelacion}
              </span>
            </p>
            {vuelo.backend_id !== undefined &&
              (usuario ? (
                <button
                  type="button"
                  onClick={() => setMostrarDetalle((abierto) => !abierto)}
                  className="inline-flex cursor-pointer items-center gap-1 font-semibold text-shield-700 hover:underline"
                >
                  {mostrarDetalle ? 'Ocultar detalle' : 'Ver detalle'}
                  {mostrarDetalle ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
              ) : (
                <Link to="/ingresar" className="font-semibold text-shield-700 hover:underline">
                  Ingresar
                </Link>
              ))}
          </div>

          {mostrarDetalle && detalle.isPending && <p className="mt-2 text-xs text-ink-500">Cargando detalle...</p>}
          {mostrarDetalle && detalle.data && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-paper px-3 py-2 text-xs text-ink-700">
              {tarifaDetalle && (
                <>
                  <span>
                    Equipaje: <strong className="text-ink-900">{tarifaDetalle.baggage_included}</strong>
                  </span>
                  <span>
                    Reembolso: <strong className="text-ink-900">{tarifaDetalle.is_refundable ? 'Sí' : 'No'}</strong>
                  </span>
                </>
              )}
              {detalle.data.notes && (
                <span>
                  Notas: <strong className="text-ink-900">{detalle.data.notes}</strong>
                </span>
              )}
            </div>
          )}
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <InsigniaTarifa tarifa={vuelo.fare} />
          <span className="rounded bg-ink-100 px-1.5 py-0.5 map-label text-ink-700">{vuelo.currency}</span>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-extrabold font-expanded" data-numeric>
            {formatearPrecio(vuelo.price * pasajeros, vuelo.currency)}
          </p>
          <p className="text-[13px] text-ink-500">
            {pasajeros === 1
              ? `en ${vuelo.currency} · por pasajero`
              : `total ${pasajeros} pasajeros · ${formatearPrecio(vuelo.price, vuelo.currency)} ${vuelo.currency} c/u`}
          </p>
          {textoEquivalente(vuelo.price * pasajeros, vuelo.currency) && (
            <p
              className="mt-1 text-[13px] font-semibold text-ink-700"
              data-numeric
              title="Convertido a la cotización de referencia"
            >
              {textoEquivalente(vuelo.price * pasajeros, vuelo.currency)}
            </p>
          )}
          {vuelo.seats_available <= 3 && (
            <p className="mt-1 text-[13px] font-semibold text-route-600">
              {vuelo.seats_available === 1 ? 'Queda 1 asiento' : `Quedan ${vuelo.seats_available} asientos`}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
