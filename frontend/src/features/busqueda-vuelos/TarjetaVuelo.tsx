import { CalendarX2, Clock, ShieldCheck, TicketX } from 'lucide-react'

import { Insignia } from '@/components/ui/Insignia'
import { cn } from '@/lib/cn'

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
}: {
  hora: string
  codigo: string
  ciudad: string
  alineacion: 'izquierda' | 'derecha'
}) {
  return (
    <div className={cn('min-w-0', alineacion === 'derecha' && 'text-right')}>
      <p className="text-2xl leading-none font-extrabold font-expanded sm:text-3xl" data-numeric>
        {hora}
      </p>
      <p className="mt-1.5 text-sm font-bold">{codigo}</p>
      <p className="truncate text-[13px] text-ink-500">{ciudad}</p>
    </div>
  )
}

/** La ruta entre los dos aeropuertos de un tramo: una línea con un punto por cada escala. */
function Trayecto({ escalas, duracion }: { escalas: string[]; duracion: number }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-1 pt-1">
      <span className="flex items-center gap-1 text-[13px] text-ink-500">
        <Clock className="size-3.5" aria-hidden /> {formatearDuracion(duracion)}
      </span>
      <div className="relative flex w-full items-center" aria-hidden>
        <span className="size-2 rounded-full border-2 border-ink-900 bg-sheet" />
        <span className="flex flex-1 justify-evenly border-t-2 border-ink-900">
          {escalas.map((escala) => (
            <span key={escala} className="-mt-[5px] size-2 rounded-full bg-route-500 ring-2 ring-sheet" />
          ))}
        </span>
        <span className="size-2 rounded-full bg-ink-900" />
      </div>
      <span className={cn('text-[13px] font-semibold', escalas.length === 0 ? 'text-fare-flexible' : 'text-route-600')}>
        {textoEscalas(escalas)}
        {escalas.length > 0 && <span className="font-normal text-ink-500"> · {escalas.join(', ')}</span>}
      </span>
    </div>
  )
}

function etiquetaTramo(tipo: TipoVuelo, indice: number): string {
  if (tipo === 'round_trip') return indice === 0 ? 'Ida' : 'Vuelta'
  return `Tramo ${indice + 1}`
}

function FilaTramo({ tramo, etiqueta }: { tramo: TramoVuelo; etiqueta?: string }) {
  const diasDeMas = diasEntre(tramo.departure, tramo.arrival)
  return (
    <div className="flex flex-col gap-2">
      {etiqueta && (
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span className="map-label text-shield-700">{etiqueta}</span>
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
        <Trayecto escalas={tramo.stops} duracion={tramo.duration_minutes} />
        <div className="relative">
          <Extremo
            hora={formatearHora(tramo.arrival)}
            codigo={tramo.destination.code}
            ciudad={tramo.destination.city}
            alineacion="derecha"
          />
          {diasDeMas > 0 && (
            <span
              className="absolute -top-2 -right-1 text-[11px] font-bold text-route-600"
              title={`Llega ${diasDeMas === 1 ? 'al día siguiente' : `${diasDeMas} días después`}`}
            >
              +{diasDeMas}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface PropsTarjetaVuelo {
  vuelo: Vuelo
  pasajeros: number
}

/** Un vuelo como pase de abordar: los tramos a la izquierda y, en el talón, tarifa, divisa y precio. */
export function TarjetaVuelo({ vuelo, pasajeros }: PropsTarjetaVuelo) {
  const IconoCancelacion = ICONOS_CANCELACION[vuelo.fare]
  const variosTramos = vuelo.legs.length > 1

  return (
    <article
      aria-label={`${vuelo.airline.name} ${vuelo.flight_number}, ${vuelo.origin.city} a ${vuelo.destination.city}`}
      className="flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-sheet shadow-sheet transition-shadow hover:shadow-float sm:flex-row"
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
              <FilaTramo tramo={tramo} etiqueta={variosTramos ? etiquetaTramo(vuelo.flight_type, indice) : undefined} />
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
              Escalas totales: <strong className="text-ink-900">{textoEscalas(vuelo.stops)}</strong>
            </span>
          </div>
        )}

        <p className="flex items-start gap-2 border-t border-ink-100 pt-4 text-[13px] text-ink-700">
          <IconoCancelacion className="mt-px size-4 shrink-0 text-ink-500" aria-hidden />
          <span>
            <span className="font-semibold text-ink-900">Cancelación: </span>
            {vuelo.cancellation_summary}
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
