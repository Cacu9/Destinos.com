import { ArrowRight, Plus, Trash2 } from 'lucide-react'

import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { BotonIcono } from '@/components/ui/Tabla'
import type { Aeropuerto } from '@/features/busqueda-vuelos/tipos'
import { estiloTramo } from '@/features/mapa/colores'
import { cn } from '@/lib/cn'

import { ETIQUETAS_TIPO_VIAJE, type TipoViaje } from './consultas'
import { MAXIMO_TRAMOS_ADICIONALES, tramoVacio, type TramoForm } from './tramosFormulario'

export function SelectorTipoViaje({ tipo, alCambiar }: { tipo: TipoViaje; alCambiar: (tipo: TipoViaje) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-700">Tipo de viaje</span>
      <div className="inline-flex w-fit rounded-lg bg-ink-100 p-1" role="radiogroup" aria-label="Tipo de viaje">
        {(Object.keys(ETIQUETAS_TIPO_VIAJE) as TipoViaje[]).map((valor) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={tipo === valor}
            onClick={() => alCambiar(valor)}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
              tipo === valor ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {ETIQUETAS_TIPO_VIAJE[valor]}
          </button>
        ))}
      </div>
    </div>
  )
}

function OpcionesAeropuerto({ aeropuertos }: { aeropuertos: Aeropuerto[] }) {
  return aeropuertos.map((aeropuerto) => (
    <option key={aeropuerto.code} value={aeropuerto.code}>
      {aeropuerto.city} ({aeropuerto.code})
    </option>
  ))
}

interface PropsEditorTramos {
  tipo: TipoViaje
  tramos: TramoForm[]
  origen: string
  destino: string
  aeropuertos: Aeropuerto[]
  error?: string
  alCambiar: (tramos: TramoForm[]) => void
}

/** Tramos siguientes al primero: la vuelta de un ida y vuelta, o los destinos siguientes de un multidestino. */
export function EditorTramos({ tipo, tramos, origen, destino, aeropuertos, error, alCambiar }: PropsEditorTramos) {
  if (tipo === 'one_way') return null
  const visibles = tipo === 'round_trip' ? tramos.slice(0, 1) : tramos
  const nombre = (codigo: string) => (codigo ? codigo : '—')

  const cambiar = (clave: number, cambios: Partial<TramoForm>) =>
    alCambiar(tramos.map((tramo) => (tramo.clave === clave ? { ...tramo, ...cambios } : tramo)))

  const agregar = () => {
    const ultimo = visibles[visibles.length - 1]
    const clave = Math.max(0, ...tramos.map((tramo) => tramo.clave)) + 1
    alCambiar([...tramos, tramoVacio(clave, ultimo?.destination_code || destino)])
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-paper/60 p-4',
        error ? 'border-route-500' : 'border-ink-200',
      )}
      aria-label="Tramos adicionales"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink-900">{tipo === 'round_trip' ? 'Vuelta' : 'Tramos siguientes'}</p>
          <p className="text-xs text-ink-500">
            {tipo === 'round_trip'
              ? 'La vuelta hace la ruta inversa de la ida.'
              : 'Cada tramo sale después de que llega el anterior. El mapa los pinta de distinto color.'}
          </p>
        </div>
        {tipo === 'multi_city' && visibles.length < MAXIMO_TRAMOS_ADICIONALES && (
          <Boton variante="secondary" tamano="sm" onClick={agregar}>
            <Plus className="size-4" /> Agregar tramo
          </Boton>
        )}
      </div>
      {error && <p className="text-[13px] text-route-600">{error}</p>}

      {visibles.map((tramo, indice) => {
        const estilo = estiloTramo(indice + 1)
        return (
          <div key={tramo.clave} className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-sheet p-3">
            <div className="flex items-center justify-between gap-2">
              <p className={cn('flex items-center gap-2 map-label', estilo.texto)}>
                <span aria-hidden className={cn('h-[3px] w-5 rounded-full', estilo.swatch)} />
                {tipo === 'round_trip' ? 'Vuelta' : `Tramo ${indice + 2}`}
              </p>
              {tipo === 'multi_city' && visibles.length > 1 && (
                <BotonIcono
                  aria-label="Quitar tramo"
                  title="Quitar tramo"
                  className="size-8 hover:bg-route-50 hover:text-route-600"
                  onClick={() => alCambiar(tramos.filter((item) => item.clave !== tramo.clave))}
                >
                  <Trash2 className="size-4" />
                </BotonIcono>
              )}
            </div>

            {tipo === 'round_trip' ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                {nombre(destino)} <ArrowRight className="size-4 text-ink-500" aria-hidden /> {nombre(origen)}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoSeleccion
                  etiqueta="Origen"
                  value={tramo.origin_code}
                  onChange={(evento) => cambiar(tramo.clave, { origin_code: evento.target.value })}
                >
                  <option value="" disabled>
                    Seleccioná origen
                  </option>
                  <OpcionesAeropuerto aeropuertos={aeropuertos} />
                </CampoSeleccion>
                <CampoSeleccion
                  etiqueta="Destino"
                  value={tramo.destination_code}
                  onChange={(evento) => cambiar(tramo.clave, { destination_code: evento.target.value })}
                >
                  <option value="" disabled>
                    Seleccioná destino
                  </option>
                  <OpcionesAeropuerto aeropuertos={aeropuertos} />
                </CampoSeleccion>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_5rem]">
              <CampoTexto
                etiqueta="N.º de vuelo"
                placeholder="AR1405"
                value={tramo.flight_number}
                onChange={(evento) => cambiar(tramo.clave, { flight_number: evento.target.value })}
              />
              <CampoTexto
                etiqueta="Salida"
                type="datetime-local"
                value={tramo.departure_at}
                onChange={(evento) => cambiar(tramo.clave, { departure_at: evento.target.value })}
              />
              <CampoTexto
                etiqueta="Llegada"
                type="datetime-local"
                value={tramo.arrival_at}
                onChange={(evento) => cambiar(tramo.clave, { arrival_at: evento.target.value })}
              />
              <CampoTexto
                etiqueta="Escalas"
                type="number"
                min={0}
                value={tramo.stops}
                onChange={(evento) => cambiar(tramo.clave, { stops: evento.target.value })}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}
