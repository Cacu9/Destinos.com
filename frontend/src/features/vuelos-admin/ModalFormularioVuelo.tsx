import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { BotonIcono } from '@/components/ui/Tabla'
import { useAeropuertos } from '@/features/busqueda-vuelos/consultas'
import { PAIS_LOCAL, type Aeropuerto } from '@/features/busqueda-vuelos/tipos'
import { errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { cn } from '@/lib/cn'
import { entradasDe } from '@/lib/entradas'
import { leerFormulario } from '@/lib/formularios'

import {
  ETIQUETAS_CLASE_CABINA,
  ETIQUETAS_DIVISA_ADMIN,
  useGuardarTarifa,
  useGuardarVuelo,
  type ClaseCabina,
  type DatosTarifaAdmin,
  type DivisaAdmin,
  type VueloAdmin,
} from './consultas'
import { inputLocalAIso, isoAInputLocal } from './formato'

interface PropsModalFormularioVuelo {
  abierto: boolean
  vuelo: VueloAdmin | null
  alCerrar: () => void
}

interface TarifaInicialForm {
  clave: number
  cabin_class: ClaseCabina
  price_ars: string
  currency: DivisaAdmin
  available_seats: string
  baggage_included: string
  is_refundable: boolean
}

type CampoVueloForm =
  | 'flight_number'
  | 'airline'
  | 'origin_code'
  | 'destination_code'
  | 'departure_at'
  | 'arrival_at'
  | 'stops'
  | 'base_price_ars'
  | 'currency'
  | 'cancellation_policy'
  | 'notes'

type FiltroAlcance = 'todos' | 'local' | 'exterior'

const CLASES_ORDEN: ClaseCabina[] = ['economy', 'premium_economy', 'business', 'first']

function esDestinoLocal(aeropuerto: Aeropuerto): boolean {
  return aeropuerto.country.trim().toLowerCase() === PAIS_LOCAL.toLowerCase()
}

function OpcionesDestinos({
  destinos,
  alcance,
  codigoActual,
  ciudadActual,
}: {
  destinos: Aeropuerto[]
  alcance: FiltroAlcance
  codigoActual?: string
  ciudadActual?: string
}) {
  const locales = destinos.filter(esDestinoLocal)
  const exteriores = destinos.filter((d) => !esDestinoLocal(d))
  const existeActual = Boolean(codigoActual && destinos.some((d) => d.code === codigoActual))

  return (
    <>
      {codigoActual && !existeActual && (
        <option value={codigoActual}>
          {ciudadActual || codigoActual} ({codigoActual}) · Dado de baja
        </option>
      )}
      {alcance !== 'exterior' && locales.length > 0 && (
        <optgroup label="Local (Argentina)">
          {locales.map((d) => (
            <option key={d.code} value={d.code}>
              {d.city} ({d.code}) · Local
            </option>
          ))}
        </optgroup>
      )}
      {alcance !== 'local' && exteriores.length > 0 && (
        <optgroup label="Exterior">
          {exteriores.map((d) => (
            <option key={d.code} value={d.code}>
              {d.city} ({d.code}) · Exterior ({d.country})
            </option>
          ))}
        </optgroup>
      )}
    </>
  )
}

export function ModalFormularioVuelo({ abierto, vuelo, alCerrar }: PropsModalFormularioVuelo) {
  const guardar = useGuardarVuelo()
  const guardarTarifa = useGuardarTarifa()
  const { data: destinos = [] } = useAeropuertos()
  const [errorTarifas, setErrorTarifas] = useState<string>()
  const [alcanceOrigen, setAlcanceOrigen] = useState<FiltroAlcance>('todos')
  const [alcanceDestino, setAlcanceDestino] = useState<FiltroAlcance>('todos')
  const errores = erroresDeCampos(guardar.error)
  const esEdicion = vuelo !== null
  const tarifasActivas = vuelo?.fares.filter((tarifa) => tarifa.is_active) ?? []
  const [tarifasIniciales, setTarifasIniciales] = useState<TarifaInicialForm[]>([])
  const [contadorTarifas, setContadorTarifas] = useState(1)

  const cerrar = () => {
    guardar.reset()
    guardarTarifa.reset()
    setErrorTarifas(undefined)
    setAlcanceOrigen('todos')
    setAlcanceDestino('todos')
    setTarifasIniciales([])
    alCerrar()
  }

  const agregarTarifaInicial = () => {
    const usadas = new Set(tarifasIniciales.map((tarifa) => tarifa.cabin_class))
    const siguienteClase = CLASES_ORDEN.find((clase) => !usadas.has(clase))
    if (!siguienteClase) return
    setTarifasIniciales((actuales) => [
      ...actuales,
      {
        clave: contadorTarifas,
        cabin_class: siguienteClase,
        price_ars: '',
        currency: 'ARS',
        available_seats: '20',
        baggage_included: 'Equipaje de mano',
        is_refundable: false,
      },
    ])
    setContadorTarifas((n) => n + 1)
  }

  const actualizarTarifa = (clave: number, cambios: Partial<TarifaInicialForm>) => {
    setTarifasIniciales((actuales) =>
      actuales.map((tarifa) => (tarifa.clave === clave ? { ...tarifa, ...cambios } : tarifa)),
    )
  }

  const quitarTarifa = (clave: number) => {
    setTarifasIniciales((actuales) => actuales.filter((tarifa) => tarifa.clave !== clave))
  }

  const enviar = (formulario: HTMLFormElement) => {
    setErrorTarifas(undefined)
    const formData = new FormData(formulario)
    const valores = leerFormulario<CampoVueloForm>(formulario)
    const divisaElegida = (valores.currency as DivisaAdmin) || 'ARS'
    const fares: DatosTarifaAdmin[] | undefined =
      !esEdicion && tarifasIniciales.length > 0
        ? tarifasIniciales.map((tarifa) => ({
            cabin_class: tarifa.cabin_class,
            price_ars: tarifa.price_ars.trim(),
            currency: tarifa.currency,
            available_seats: Number(tarifa.available_seats || 0),
            baggage_included: tarifa.baggage_included.trim(),
            is_refundable: tarifa.is_refundable,
          }))
        : undefined

    const originCode = valores.origin_code.toUpperCase()
    const destinationCode = valores.destination_code.toUpperCase()
    const origenEncontrado = destinos.find((d) => d.code === originCode)
    const destinoEncontrado = destinos.find((d) => d.code === destinationCode)

    guardar.mutate(
      {
        id: vuelo?.id,
        flight_number: valores.flight_number.toUpperCase(),
        airline: valores.airline,
        origin_city: origenEncontrado?.city ?? (vuelo?.origin_code === originCode ? vuelo.origin_city : originCode),
        origin_code: originCode,
        destination_city:
          destinoEncontrado?.city ??
          (vuelo?.destination_code === destinationCode ? vuelo.destination_city : destinationCode),
        destination_code: destinationCode,
        departure_at: inputLocalAIso(valores.departure_at),
        arrival_at: inputLocalAIso(valores.arrival_at),
        stops: Number(valores.stops || 0),
        base_price_ars: valores.base_price_ars,
        currency: divisaElegida,
        cancellation_policy: valores.cancellation_policy,
        notes: valores.notes,
        ...(fares ? { fares } : {}),
      },
      {
        onSuccess: async () => {
          if (esEdicion && tarifasActivas.length > 0) {
            const actualizaciones = tarifasActivas
              .map((tarifa) => {
                const nuevoPrecio = String(formData.get(`tarifa_precio_${tarifa.id}`) ?? tarifa.price_ars).trim()
                const nuevaDivisa = (String(formData.get(`tarifa_divisa_${tarifa.id}`) ?? tarifa.currency) ||
                  tarifa.currency) as DivisaAdmin
                const nuevosAsientos = Number(formData.get(`tarifa_asientos_${tarifa.id}`) ?? tarifa.available_seats)
                const cambio =
                  nuevoPrecio !== tarifa.price_ars ||
                  nuevaDivisa !== tarifa.currency ||
                  nuevosAsientos !== tarifa.available_seats
                if (!cambio) return null
                return guardarTarifa.mutateAsync({
                  id: tarifa.id,
                  flightId: vuelo.id,
                  cabin_class: tarifa.cabin_class,
                  price_ars: nuevoPrecio,
                  currency: nuevaDivisa,
                  available_seats: nuevosAsientos,
                  baggage_included: tarifa.baggage_included,
                  is_refundable: tarifa.is_refundable,
                })
              })
              .filter(Boolean)

            if (actualizaciones.length > 0) {
              try {
                await Promise.all(actualizaciones)
              } catch (err) {
                setErrorTarifas(err instanceof Error ? err.message : 'No pudimos actualizar las tarifas.')
                return
              }
            }
          }
          toast.success(esEdicion ? 'Vuelo actualizado con éxito' : 'Vuelo creado con éxito')
          cerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      ancho="amplio"
      titulo={esEdicion ? `Editar vuelo ${vuelo.flight_number}` : 'Nuevo vuelo'}
      descripcion={
        esEdicion
          ? 'Modificá los datos operativos, horarios, precio base o divisa (pesos o dólares). Las tarifas por clase se administran aparte.'
          : 'Cargá los datos del vuelo, su divisa (ARS o USD) y opcionalmente sus tarifas iniciales por clase.'
      }
      alCerrar={cerrar}
    >
      <form
        key={vuelo?.id ?? 'new'}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          enviar(evento.currentTarget)
        }}
      >
        <AlertaFormulario mensaje={errorTarifas ?? errorDeFormulario(guardar.error) ?? errores.fares} />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Número de vuelo"
            name="flight_number"
            placeholder="AR1680"
            defaultValue={vuelo?.flight_number}
            error={errores.flight_number}
          />
          <CampoTexto
            etiqueta="Aerolínea"
            name="airline"
            placeholder="Aerolíneas Argentinas"
            defaultValue={vuelo?.airline}
            error={errores.airline}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="map-label text-ink-500">Filtro origen</span>
              <div className="inline-flex rounded-md bg-ink-100 p-0.5 text-xs">
                {(['todos', 'local', 'exterior'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setAlcanceOrigen(op)}
                    className={cn(
                      'cursor-pointer rounded px-2 py-0.5 font-semibold capitalize transition-colors',
                      alcanceOrigen === op ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <CampoSeleccion
              etiqueta="Origen"
              name="origin_code"
              defaultValue={vuelo?.origin_code ?? ''}
              error={errores.origin_code ?? errores.origin_city}
            >
              <option value="" disabled>
                Seleccioná origen
              </option>
              <OpcionesDestinos
                destinos={destinos}
                alcance={alcanceOrigen}
                codigoActual={vuelo?.origin_code}
                ciudadActual={vuelo?.origin_city}
              />
            </CampoSeleccion>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="map-label text-ink-500">Filtro destino</span>
              <div className="inline-flex rounded-md bg-ink-100 p-0.5 text-xs">
                {(['todos', 'local', 'exterior'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setAlcanceDestino(op)}
                    className={cn(
                      'cursor-pointer rounded px-2 py-0.5 font-semibold capitalize transition-colors',
                      alcanceDestino === op ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <CampoSeleccion
              etiqueta="Destino"
              name="destination_code"
              defaultValue={vuelo?.destination_code ?? ''}
              error={errores.destination_code ?? errores.destination_city}
            >
              <option value="" disabled>
                Seleccioná destino
              </option>
              <OpcionesDestinos
                destinos={destinos}
                alcance={alcanceDestino}
                codigoActual={vuelo?.destination_code}
                ciudadActual={vuelo?.destination_city}
              />
            </CampoSeleccion>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CampoTexto
            etiqueta="Salida"
            name="departure_at"
            type="datetime-local"
            defaultValue={isoAInputLocal(vuelo?.departure_at)}
            error={errores.departure_at}
            className="lg:col-span-2"
          />
          <CampoTexto
            etiqueta="Llegada"
            name="arrival_at"
            type="datetime-local"
            defaultValue={isoAInputLocal(vuelo?.arrival_at)}
            error={errores.arrival_at}
            className="lg:col-span-2"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto
            etiqueta="Escalas"
            name="stops"
            type="number"
            min={0}
            defaultValue={vuelo?.stops ?? 0}
            error={errores.stops}
          />
          <CampoTexto
            etiqueta="Precio base"
            name="base_price_ars"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="185000.00"
            defaultValue={vuelo?.base_price_ars}
            error={errores.base_price_ars}
          />
          <CampoSeleccion
            etiqueta="Divisa"
            name="currency"
            defaultValue={vuelo?.currency ?? 'ARS'}
            error={errores.currency}
          >
            {entradasDe(ETIQUETAS_DIVISA_ADMIN).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </CampoSeleccion>
        </div>

        {esEdicion && tarifasActivas.length > 0 && (
          <div className="rounded-xl border border-ink-200 bg-paper/70 p-4">
            <p className="text-sm font-bold text-ink-900">Tarifas publicadas en la web (por clase)</p>
            <p className="mt-0.5 text-xs text-ink-500">
              El buscador público muestra el precio y la divisa de estas tarifas. Podés modificarlas acá mismo:
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {tarifasActivas.map((tarifa) => (
                <div
                  key={tarifa.id}
                  className="grid items-end gap-3 rounded-lg border border-ink-200 bg-sheet p-3 sm:grid-cols-[1fr_9rem_9.5rem_6.5rem]"
                >
                  <div>
                    <p className="map-label text-ink-500">Clase</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">{ETIQUETAS_CLASE_CABINA[tarifa.cabin_class]}</p>
                  </div>
                  <CampoTexto
                    etiqueta="Precio"
                    name={`tarifa_precio_${tarifa.id}`}
                    type="number"
                    min={0.01}
                    step="0.01"
                    defaultValue={tarifa.price_ars}
                  />
                  <CampoSeleccion etiqueta="Divisa" name={`tarifa_divisa_${tarifa.id}`} defaultValue={tarifa.currency}>
                    {entradasDe(ETIQUETAS_DIVISA_ADMIN).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </CampoSeleccion>
                  <CampoTexto
                    etiqueta="Asientos"
                    name={`tarifa_asientos_${tarifa.id}`}
                    type="number"
                    min={0}
                    defaultValue={tarifa.available_seats}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="campo-cancelacion" className="text-[13px] font-semibold text-ink-700">
              Política de cancelación
            </label>
            <textarea
              id="campo-cancelacion"
              name="cancellation_policy"
              rows={2}
              defaultValue={vuelo?.cancellation_policy ?? ''}
              placeholder="Ej: Cancelación sin cargo hasta 48 horas antes de la salida."
              className="w-full rounded-lg border border-ink-200 bg-sheet px-3.5 py-2.5 text-[15px] text-ink-900 transition-colors placeholder:text-ink-500 hover:border-ink-300 focus:border-shield-600 focus:ring-3 focus:ring-shield-600/15 focus:outline-none"
            />
            {errores.cancellation_policy && <p className="text-[13px] text-route-600">{errores.cancellation_policy}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="campo-notas" className="text-[13px] font-semibold text-ink-700">
              Observaciones internas
            </label>
            <textarea
              id="campo-notas"
              name="notes"
              rows={2}
              defaultValue={vuelo?.notes ?? ''}
              placeholder="Notas operativas opcionales..."
              className="w-full rounded-lg border border-ink-200 bg-sheet px-3.5 py-2.5 text-[15px] text-ink-900 transition-colors placeholder:text-ink-500 hover:border-ink-300 focus:border-shield-600 focus:ring-3 focus:ring-shield-600/15 focus:outline-none"
            />
            {errores.notes && <p className="text-[13px] text-route-600">{errores.notes}</p>}
          </div>
        </div>

        {!esEdicion && (
          <div className="rounded-xl border border-ink-200 bg-paper/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink-900">Tarifas iniciales por clase (opcional)</p>
                <p className="text-xs text-ink-500">Podés cargarlas ahora o agregarlas luego desde “Tarifas”.</p>
              </div>
              {tarifasIniciales.length < CLASES_ORDEN.length && (
                <Boton variante="secondary" tamano="sm" onClick={agregarTarifaInicial}>
                  <Plus className="size-4" /> Agregar tarifa
                </Boton>
              )}
            </div>

            {tarifasIniciales.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {tarifasIniciales.map((tarifa) => (
                  <div
                    key={tarifa.clave}
                    className="grid items-end gap-3 rounded-lg border border-ink-200 bg-sheet p-3 sm:grid-cols-[1fr_7.5rem_7.5rem_5.5rem_1fr_auto]"
                  >
                    <CampoSeleccion
                      etiqueta="Clase"
                      value={tarifa.cabin_class}
                      onChange={(e) => actualizarTarifa(tarifa.clave, { cabin_class: e.target.value as ClaseCabina })}
                    >
                      {entradasDe(ETIQUETAS_CLASE_CABINA).map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </CampoSeleccion>

                    <CampoTexto
                      etiqueta="Precio"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={tarifa.price_ars}
                      onChange={(e) => actualizarTarifa(tarifa.clave, { price_ars: e.target.value })}
                    />

                    <CampoSeleccion
                      etiqueta="Divisa"
                      value={tarifa.currency}
                      onChange={(e) => actualizarTarifa(tarifa.clave, { currency: e.target.value as DivisaAdmin })}
                    >
                      {entradasDe(ETIQUETAS_DIVISA_ADMIN).map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </CampoSeleccion>

                    <CampoTexto
                      etiqueta="Asientos"
                      type="number"
                      min={0}
                      value={tarifa.available_seats}
                      onChange={(e) => actualizarTarifa(tarifa.clave, { available_seats: e.target.value })}
                    />

                    <CampoTexto
                      etiqueta="Equipaje"
                      value={tarifa.baggage_included}
                      onChange={(e) => actualizarTarifa(tarifa.clave, { baggage_included: e.target.value })}
                    />

                    <div className="flex items-center justify-between gap-2 pb-1">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-700">
                        <input
                          type="checkbox"
                          checked={tarifa.is_refundable}
                          onChange={(e) => actualizarTarifa(tarifa.clave, { is_refundable: e.target.checked })}
                          className="size-4 rounded border-ink-300"
                        />
                        Reembolsable
                      </label>
                      <BotonIcono
                        aria-label="Quitar tarifa"
                        title="Quitar tarifa"
                        className="hover:bg-route-50 hover:text-route-600"
                        onClick={() => quitarTarifa(tarifa.clave)}
                      >
                        <Trash2 className="size-4" />
                      </BotonIcono>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Boton variante="secondary" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={guardar.isPending || guardarTarifa.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Crear vuelo'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
