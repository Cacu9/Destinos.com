import { Pencil, Plus, RotateCcw, Tag, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { Insignia } from '@/components/ui/Insignia'
import { Modal } from '@/components/ui/Modal'
import { BotonIcono } from '@/components/ui/Tabla'
import { errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { cn } from '@/lib/cn'
import { entradasDe } from '@/lib/entradas'

import {
  ETIQUETAS_CLASE_CABINA,
  ETIQUETAS_DIVISA_ADMIN,
  useDarDeBajaTarifa,
  useGuardarTarifa,
  useReactivarTarifa,
  useTarifasVueloAdmin,
  type ClaseCabina,
  type DivisaAdmin,
  type TarifaAdmin,
  type VueloAdmin,
} from './consultas'
import { formatearPrecioDivisa } from './formato'

interface PropsModalTarifasVuelo {
  abierto: boolean
  vuelo: VueloAdmin | null
  alCerrar: () => void
}

type ModoFormulario = { tipo: 'cerrado' } | { tipo: 'crear' } | { tipo: 'editar'; tarifa: TarifaAdmin }

export function ModalTarifasVuelo({ abierto, vuelo, alCerrar }: PropsModalTarifasVuelo) {
  const flightId = vuelo?.id ?? null
  const { data: tarifas = [], isPending } = useTarifasVueloAdmin(abierto ? flightId : null)
  const guardar = useGuardarTarifa()
  const darDeBaja = useDarDeBajaTarifa()
  const reactivar = useReactivarTarifa()

  const [modo, setModo] = useState<ModoFormulario>({ tipo: 'cerrado' })
  const [clase, setClase] = useState<ClaseCabina>('economy')
  const [precio, setPrecio] = useState('')
  const [currency, setCurrency] = useState<DivisaAdmin>('ARS')
  const [asientos, setAsientos] = useState('20')
  const [equipaje, setEquipaje] = useState('Equipaje de mano')
  const [reembolsable, setReembolsable] = useState(false)

  const errores = erroresDeCampos(guardar.error)

  const clasesUsadas = new Set(tarifas.map((t) => t.cabin_class))
  const clasesDisponibles = entradasDe(ETIQUETAS_CLASE_CABINA).filter(([clave]) => !clasesUsadas.has(clave))

  const abrirCrear = () => {
    guardar.reset()
    setClase(clasesDisponibles[0]?.[0] ?? 'economy')
    setPrecio(vuelo?.base_price_ars ?? '')
    setCurrency(vuelo?.currency ?? 'ARS')
    setAsientos('20')
    setEquipaje('Equipaje de mano')
    setReembolsable(false)
    setModo({ tipo: 'crear' })
  }

  const abrirEditar = (tarifa: TarifaAdmin) => {
    guardar.reset()
    setClase(tarifa.cabin_class)
    setPrecio(tarifa.price_ars)
    setCurrency(tarifa.currency)
    setAsientos(String(tarifa.available_seats))
    setEquipaje(tarifa.baggage_included)
    setReembolsable(tarifa.is_refundable)
    setModo({ tipo: 'editar', tarifa })
  }

  const cerrarModal = () => {
    guardar.reset()
    setModo({ tipo: 'cerrado' })
    alCerrar()
  }

  const enviarTarifa = (evento: FormEvent) => {
    evento.preventDefault()
    if (!vuelo) return
    const idEdicion = modo.tipo === 'editar' ? modo.tarifa.id : undefined

    guardar.mutate(
      {
        id: idEdicion,
        flightId: vuelo.id,
        cabin_class: clase,
        price_ars: precio.trim(),
        currency,
        available_seats: Number(asientos || 0),
        baggage_included: equipaje.trim(),
        is_refundable: reembolsable,
      },
      {
        onSuccess: () => {
          toast.success(idEdicion ? 'Tarifa actualizada con éxito' : 'Tarifa creada con éxito')
          setModo({ tipo: 'cerrado' })
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      ancho="amplio"
      titulo={vuelo ? `Tarifas de ${vuelo.flight_number}` : 'Tarifas'}
      descripcion={
        vuelo
          ? `${vuelo.origin_city} (${vuelo.origin_code}) → ${vuelo.destination_city} (${vuelo.destination_code}) · Precio base ${formatearPrecioDivisa(vuelo.base_price_ars, vuelo.currency)} ${vuelo.currency}`
          : undefined
      }
      alCerrar={cerrarModal}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500">
            Cada clase de cabina admite una única tarifa por vuelo. Podés editar precios, divisa (ARS o USD), cupos,
            equipaje o darla de baja lógica.
          </p>
          {modo.tipo === 'cerrado' && clasesDisponibles.length > 0 && (
            <Boton tamano="sm" onClick={abrirCrear}>
              <Plus className="size-4" /> Nueva tarifa
            </Boton>
          )}
        </div>

        {modo.tipo !== 'cerrado' && (
          <form
            onSubmit={enviarTarifa}
            noValidate
            className="flex flex-col gap-4 rounded-xl border border-ink-900 bg-paper/70 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base">
                {modo.tipo === 'editar'
                  ? `Editar tarifa ${ETIQUETAS_CLASE_CABINA[modo.tarifa.cabin_class]}`
                  : 'Agregar nueva tarifa'}
              </h3>
            </div>
            <AlertaFormulario mensaje={errorDeFormulario(guardar.error)} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <CampoSeleccion
                etiqueta="Clase"
                value={clase}
                disabled={modo.tipo === 'editar'}
                error={errores.cabin_class}
                onChange={(e) => setClase(e.target.value as ClaseCabina)}
              >
                {(modo.tipo === 'editar' ? entradasDe(ETIQUETAS_CLASE_CABINA) : clasesDisponibles).map(
                  ([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ),
                )}
              </CampoSeleccion>

              <CampoTexto
                etiqueta="Precio"
                type="number"
                min={0.01}
                step="0.01"
                value={precio}
                error={errores.price_ars}
                onChange={(e) => setPrecio(e.target.value)}
              />

              <CampoSeleccion
                etiqueta="Divisa"
                value={currency}
                error={errores.currency}
                onChange={(e) => setCurrency(e.target.value as DivisaAdmin)}
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
                value={asientos}
                error={errores.available_seats}
                onChange={(e) => setAsientos(e.target.value)}
              />

              <CampoTexto
                etiqueta="Equipaje incluido"
                value={equipaje}
                error={errores.baggage_included}
                onChange={(e) => setEquipaje(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={reembolsable}
                  onChange={(e) => setReembolsable(e.target.checked)}
                  className="size-4 rounded border-ink-300"
                />
                Tarifa reembolsable
              </label>

              <div className="flex gap-2">
                <Boton variante="secondary" tamano="sm" onClick={() => setModo({ tipo: 'cerrado' })}>
                  Cancelar
                </Boton>
                <Boton type="submit" tamano="sm" cargando={guardar.isPending}>
                  {modo.tipo === 'editar' ? 'Guardar cambios' : 'Agregar tarifa'}
                </Boton>
              </div>
            </div>
          </form>
        )}

        {isPending ? (
          <p className="py-6 text-center text-sm text-ink-500">Cargando tarifas...</p>
        ) : tarifas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-paper/40 px-4 py-8 text-center">
            <Tag className="mx-auto mb-2 size-5 text-ink-500" />
            <p className="text-sm font-semibold text-ink-900">Este vuelo todavía no tiene tarifas por clase</p>
            <p className="mt-1 text-xs text-ink-500">
              Mientras tanto se usa su precio base ({vuelo?.currency ?? 'ARS'}).
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tarifas.map((tarifa) => (
              <div
                key={tarifa.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-sheet p-4',
                  !tarifa.is_active && 'bg-paper/60 text-ink-500',
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Insignia tono={tarifa.is_active ? 'info' : 'neutral'}>
                      {ETIQUETAS_CLASE_CABINA[tarifa.cabin_class]}
                    </Insignia>
                    <span className="rounded bg-ink-100 px-1.5 py-0.5 map-label text-ink-700">{tarifa.currency}</span>
                    <Insignia tono={tarifa.is_refundable ? 'positive' : 'warning'}>
                      {tarifa.is_refundable ? 'Reembolsable' : 'No reembolsable'}
                    </Insignia>
                    {!tarifa.is_active && <span className="text-xs font-semibold text-route-600">Dada de baja</span>}
                  </div>
                  <p className="text-sm text-ink-700">
                    <strong className="font-bold text-ink-900" data-numeric>
                      {formatearPrecioDivisa(tarifa.price_ars, tarifa.currency)} {tarifa.currency}
                    </strong>{' '}
                    · {tarifa.available_seats} {tarifa.available_seats === 1 ? 'asiento' : 'asientos'} ·{' '}
                    {tarifa.baggage_included || 'Sin equipaje especificado'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <BotonIcono aria-label="Editar tarifa" title="Editar tarifa" onClick={() => abrirEditar(tarifa)}>
                    <Pencil className="size-4" />
                  </BotonIcono>
                  {tarifa.is_active ? (
                    <BotonIcono
                      aria-label="Dar de baja tarifa"
                      title="Dar de baja tarifa"
                      className="hover:bg-route-50 hover:text-route-600"
                      onClick={() =>
                        vuelo &&
                        darDeBaja.mutate(
                          { id: tarifa.id, flightId: vuelo.id },
                          {
                            onSuccess: () => toast.success('Tarifa dada de baja'),
                            onError: (err) => toast.error(err.message),
                          },
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </BotonIcono>
                  ) : (
                    <BotonIcono
                      aria-label="Reactivar tarifa"
                      title="Reactivar tarifa"
                      className="hover:bg-home/60 hover:text-ink-900"
                      onClick={() =>
                        vuelo &&
                        reactivar.mutate(
                          { id: tarifa.id, flightId: vuelo.id },
                          {
                            onSuccess: () => toast.success('Tarifa reactivada'),
                            onError: (err) => toast.error(err.message),
                          },
                        )
                      }
                    >
                      <RotateCcw className="size-4" />
                    </BotonIcono>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
