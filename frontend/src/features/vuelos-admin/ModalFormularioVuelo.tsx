import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { BotonIcono } from '@/components/ui/Tabla'
import { errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { entradasDe } from '@/lib/entradas'
import { leerFormulario } from '@/lib/formularios'

import {
  ETIQUETAS_CLASE_CABINA,
  useGuardarVuelo,
  type ClaseCabina,
  type DatosTarifaAdmin,
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
  available_seats: string
  baggage_included: string
  is_refundable: boolean
}

type CampoVueloForm =
  | 'flight_number'
  | 'airline'
  | 'origin_city'
  | 'origin_code'
  | 'destination_city'
  | 'destination_code'
  | 'departure_at'
  | 'arrival_at'
  | 'stops'
  | 'base_price_ars'
  | 'cancellation_policy'
  | 'notes'

const CLASES_ORDEN: ClaseCabina[] = ['economy', 'premium_economy', 'business', 'first']

export function ModalFormularioVuelo({ abierto, vuelo, alCerrar }: PropsModalFormularioVuelo) {
  const guardar = useGuardarVuelo()
  const errores = erroresDeCampos(guardar.error)
  const esEdicion = vuelo !== null
  const [tarifasIniciales, setTarifasIniciales] = useState<TarifaInicialForm[]>([])
  const [contadorTarifas, setContadorTarifas] = useState(1)

  const cerrar = () => {
    guardar.reset()
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
    const valores = leerFormulario<CampoVueloForm>(formulario)
    const fares: DatosTarifaAdmin[] | undefined =
      !esEdicion && tarifasIniciales.length > 0
        ? tarifasIniciales.map((tarifa) => ({
            cabin_class: tarifa.cabin_class,
            price_ars: tarifa.price_ars.trim(),
            available_seats: Number(tarifa.available_seats || 0),
            baggage_included: tarifa.baggage_included.trim(),
            is_refundable: tarifa.is_refundable,
          }))
        : undefined

    guardar.mutate(
      {
        id: vuelo?.id,
        flight_number: valores.flight_number.toUpperCase(),
        airline: valores.airline,
        origin_city: valores.origin_city,
        origin_code: valores.origin_code.toUpperCase(),
        destination_city: valores.destination_city,
        destination_code: valores.destination_code.toUpperCase(),
        departure_at: inputLocalAIso(valores.departure_at),
        arrival_at: inputLocalAIso(valores.arrival_at),
        stops: Number(valores.stops || 0),
        base_price_ars: valores.base_price_ars,
        cancellation_policy: valores.cancellation_policy,
        notes: valores.notes,
        ...(fares ? { fares } : {}),
      },
      {
        onSuccess: () => {
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
          ? 'Modificá los datos operativos, horarios o precio base. Las tarifas por clase se administran aparte.'
          : 'Cargá los datos del vuelo y opcionalmente sus tarifas iniciales por clase en ARS.'
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
        <AlertaFormulario mensaje={errorDeFormulario(guardar.error) ?? errores.fares} />

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

        <div className="grid gap-4 sm:grid-cols-[1fr_7.5rem_1fr_7.5rem]">
          <CampoTexto
            etiqueta="Ciudad origen"
            name="origin_city"
            placeholder="Buenos Aires"
            defaultValue={vuelo?.origin_city}
            error={errores.origin_city}
          />
          <CampoTexto
            etiqueta="Código"
            name="origin_code"
            placeholder="AEP"
            maxLength={10}
            defaultValue={vuelo?.origin_code}
            error={errores.origin_code}
          />
          <CampoTexto
            etiqueta="Ciudad destino"
            name="destination_city"
            placeholder="Bariloche"
            defaultValue={vuelo?.destination_city}
            error={errores.destination_city}
          />
          <CampoTexto
            etiqueta="Código"
            name="destination_code"
            placeholder="BRC"
            maxLength={10}
            defaultValue={vuelo?.destination_code}
            error={errores.destination_code}
          />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Escalas"
            name="stops"
            type="number"
            min={0}
            defaultValue={vuelo?.stops ?? 0}
            error={errores.stops}
          />
          <CampoTexto
            etiqueta="Precio base (ARS)"
            name="base_price_ars"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="185000.00"
            defaultValue={vuelo?.base_price_ars}
            error={errores.base_price_ars}
          />
        </div>

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
                    className="grid items-end gap-3 rounded-lg border border-ink-200 bg-sheet p-3 sm:grid-cols-[1fr_8rem_6.5rem_1fr_auto]"
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
                      etiqueta="Precio ARS"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={tarifa.price_ars}
                      onChange={(e) => actualizarTarifa(tarifa.clave, { price_ars: e.target.value })}
                    />

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
          <Boton type="submit" cargando={guardar.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Crear vuelo'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
