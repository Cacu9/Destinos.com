import { CalendarClock, Info, Plus, ShieldCheck, ShieldX, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoBusqueda } from '@/components/ui/CampoBusqueda'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Insignia } from '@/components/ui/Insignia'
import { Modal } from '@/components/ui/Modal'
import { BotonIcono, Tabla, Td, Th } from '@/components/ui/Tabla'
import { EncabezadoPaginaPanel } from '@/features/sesion/EncabezadoPaginaPanel'
import {
  ETIQUETAS_TIPO_VIAJE,
  useGuardarPolitica,
  useVuelosAdmin,
  type ReglaCancelacion,
  type VueloAdmin,
} from '@/features/vuelos-admin/consultas'
import { formatearFechaHoraCorta } from '@/features/vuelos-admin/formato'
import { errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { cn } from '@/lib/cn'

type Unidad = 'horas' | 'dias'

interface TramoForm {
  clave: number
  plazo: string
  unidad: Unidad
  penalizacion: string
}

const PLANTILLAS: { nombre: string; reglas: ReglaCancelacion[] }[] = [
  {
    nombre: 'Flexible',
    reglas: [
      { hours_before: 48, penalty_percent: 0 },
      { hours_before: 0, penalty_percent: 25 },
    ],
  },
  {
    nombre: 'Estándar',
    reglas: [
      { hours_before: 168, penalty_percent: 10 },
      { hours_before: 72, penalty_percent: 30 },
      { hours_before: 24, penalty_percent: 60 },
    ],
  },
]

function plazoTexto(horas: number): string {
  if (horas === 0) return 'hasta la salida'
  if (horas % 24 === 0 && horas >= 48) return `hasta ${horas / 24} días antes`
  return `hasta ${horas} h antes`
}

function aFormulario(reglas: ReglaCancelacion[]): TramoForm[] {
  return reglas.map((regla, indice) => {
    const enDias = regla.hours_before >= 48 && regla.hours_before % 24 === 0
    return {
      clave: indice,
      plazo: String(enDias ? regla.hours_before / 24 : regla.hours_before),
      unidad: enDias ? 'dias' : 'horas',
      penalizacion: String(regla.penalty_percent),
    }
  })
}

function aReglas(tramos: TramoForm[]): ReglaCancelacion[] {
  return tramos.map((tramo) => ({
    hours_before: Number(tramo.plazo) * (tramo.unidad === 'dias' ? 24 : 1),
    penalty_percent: Number(tramo.penalizacion),
  }))
}

/** Valida igual que el servidor, para avisar antes de guardar. */
function validar(noReembolsable: boolean, reglas: ReglaCancelacion[]): string | undefined {
  if (noReembolsable) return undefined
  if (reglas.length === 0) return 'Agregá al menos un tramo o marcá la política como no reembolsable.'
  for (const regla of reglas) {
    if (!Number.isInteger(regla.hours_before) || regla.hours_before < 0)
      return 'Cada plazo debe ser un número entero de 0 o más.'
    if (!Number.isInteger(regla.penalty_percent) || regla.penalty_percent < 0 || regla.penalty_percent > 100)
      return 'La penalización de cada tramo debe estar entre 0 y 100 %.'
  }
  const plazos = reglas.map((regla) => regla.hours_before)
  if (new Set(plazos).size !== plazos.length) return 'Hay dos tramos con el mismo plazo.'
  const ordenadas = reglas.toSorted((a, b) => b.hours_before - a.hours_before)
  for (let i = 1; i < ordenadas.length; i++) {
    if (ordenadas[i].penalty_percent < ordenadas[i - 1].penalty_percent) {
      return `Los plazos no son coherentes: cancelar ${plazoTexto(ordenadas[i].hours_before)} no puede costar menos que cancelar ${plazoTexto(ordenadas[i - 1].hours_before)}.`
    }
  }
  return undefined
}

/** La política como una línea de tiempo: de la compra a la salida, cada tramo con su penalización. */
function LineaPolitica({ noReembolsable, reglas }: { noReembolsable: boolean; reglas: ReglaCancelacion[] }) {
  if (noReembolsable) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-route-50 px-3 py-2.5 text-sm font-semibold text-route-600">
        <ShieldX className="size-4" aria-hidden /> No reembolsable: si cancela, el viajero no recibe reintegro.
      </p>
    )
  }
  const ordenadas = reglas.toSorted((a, b) => b.hours_before - a.hours_before)
  const sinCierre = ordenadas.length > 0 && ordenadas[ordenadas.length - 1].hours_before > 0
  return (
    <ol className="flex flex-col gap-1.5 text-sm" aria-label="Vista previa de la política">
      {ordenadas.map((regla) => (
        <li key={regla.hours_before} className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-fare-flexible-50"
            title={`${regla.penalty_percent} %`}
          >
            <span
              className={cn('block h-full', regla.penalty_percent === 0 ? 'bg-fare-flexible' : 'bg-fare-standard')}
              style={{ width: `${Math.max(regla.penalty_percent, 4)}%` }}
            />
          </span>
          <span>
            <strong>{regla.penalty_percent === 0 ? 'Sin cargo' : `${regla.penalty_percent} % de cargo`}</strong>{' '}
            {plazoTexto(regla.hours_before)}
          </span>
        </li>
      ))}
      {sinCierre && (
        <li className="flex items-center gap-3 text-ink-500">
          <span aria-hidden className="h-2 w-16 shrink-0 rounded-full bg-route-500" />
          Después, sin reintegro
        </li>
      )}
    </ol>
  )
}

function ModalPolitica({ vuelo, alCerrar }: { vuelo: VueloAdmin; alCerrar: () => void }) {
  const guardar = useGuardarPolitica()
  const [noReembolsable, setNoReembolsable] = useState(vuelo.is_non_refundable)
  const [tramos, setTramos] = useState<TramoForm[]>(() => aFormulario(vuelo.cancellation_rules))
  const [contador, setContador] = useState(vuelo.cancellation_rules.length + 1)
  const [errorLocal, setErrorLocal] = useState<string>()
  const reglas = aReglas(tramos)

  const cambiar = (clave: number, cambios: Partial<TramoForm>) =>
    setTramos((actuales) => actuales.map((tramo) => (tramo.clave === clave ? { ...tramo, ...cambios } : tramo)))

  const agregar = () => {
    setTramos((actuales) => [...actuales, { clave: contador, plazo: '24', unidad: 'horas', penalizacion: '50' }])
    setContador((n) => n + 1)
  }

  const usarPlantilla = (plantilla: ReglaCancelacion[]) => {
    setNoReembolsable(false)
    setTramos(aFormulario(plantilla).map((tramo, indice) => ({ ...tramo, clave: contador + indice })))
    setContador((n) => n + plantilla.length)
  }

  const enviar = () => {
    const error = validar(noReembolsable, reglas)
    setErrorLocal(error)
    if (error) return
    guardar.mutate(
      { flightId: vuelo.id, is_non_refundable: noReembolsable, cancellation_rules: noReembolsable ? [] : reglas },
      {
        onSuccess: () => {
          toast.success('Política actualizada con éxito')
          alCerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto
      ancho="amplio"
      titulo={`Política de cancelación · ${vuelo.flight_number}`}
      descripcion={`${vuelo.origin_city} → ${vuelo.destination_city} · ${vuelo.airline}`}
      alCerrar={alCerrar}
    >
      <div className="flex flex-col gap-5">
        <AlertaFormulario
          mensaje={errorLocal ?? errorDeFormulario(guardar.error) ?? erroresDeCampos(guardar.error).cancellation_rules}
        />

        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de política">
          {[
            {
              valor: false,
              titulo: 'Con tramos de penalización',
              detalle: 'Reintegro según la anticipación',
              icono: ShieldCheck,
            },
            { valor: true, titulo: 'No reembolsable', detalle: 'Sin reintegro al cancelar', icono: ShieldX },
          ].map(({ valor, titulo, detalle, icono: Icono }) => (
            <button
              key={titulo}
              type="button"
              role="radio"
              aria-checked={noReembolsable === valor}
              onClick={() => setNoReembolsable(valor)}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                noReembolsable === valor
                  ? 'border-ink-900 bg-sheet shadow-sheet'
                  : 'border-ink-200 hover:border-ink-300',
              )}
            >
              <Icono className={cn('mt-0.5 size-5', valor ? 'text-route-600' : 'text-fare-flexible')} aria-hidden />
              <span>
                <span className="block text-sm font-bold">{titulo}</span>
                <span className="block text-xs text-ink-500">{detalle}</span>
              </span>
            </button>
          ))}
        </div>

        {!noReembolsable && (
          <section className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-paper/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">Tramos</p>
              <div className="flex flex-wrap gap-1.5">
                {PLANTILLAS.map((plantilla) => (
                  <Boton
                    key={plantilla.nombre}
                    variante="ghost"
                    tamano="sm"
                    onClick={() => usarPlantilla(plantilla.reglas)}
                  >
                    Usar «{plantilla.nombre}»
                  </Boton>
                ))}
                <Boton variante="secondary" tamano="sm" onClick={agregar}>
                  <Plus className="size-4" /> Agregar tramo
                </Boton>
              </div>
            </div>

            {tramos.length === 0 && (
              <p className="text-sm text-ink-500">Agregá un tramo o usá una plantilla para empezar.</p>
            )}

            {tramos.map((tramo) => (
              <div
                key={tramo.clave}
                className="grid items-end gap-3 rounded-lg border border-ink-200 bg-sheet p-3 sm:grid-cols-[1fr_8rem_9rem_auto]"
              >
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-700">
                  Cancelando con al menos
                  <input
                    type="number"
                    min={0}
                    value={tramo.plazo}
                    onChange={(evento) => cambiar(tramo.clave, { plazo: evento.target.value })}
                    className="h-11 rounded-lg border border-ink-200 bg-sheet px-3.5 text-[15px] font-normal text-ink-900 focus:border-shield-600 focus:ring-3 focus:ring-shield-600/15 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-700">
                  Unidad
                  <select
                    value={tramo.unidad}
                    onChange={(evento) => cambiar(tramo.clave, { unidad: evento.target.value as Unidad })}
                    className="h-11 rounded-lg border border-ink-200 bg-sheet px-3 text-[15px] font-normal text-ink-900 focus:border-shield-600 focus:outline-none"
                  >
                    <option value="horas">horas antes</option>
                    <option value="dias">días antes</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-700">
                  Penalización (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tramo.penalizacion}
                    onChange={(evento) => cambiar(tramo.clave, { penalizacion: evento.target.value })}
                    className="h-11 rounded-lg border border-ink-200 bg-sheet px-3.5 text-[15px] font-normal text-ink-900 focus:border-shield-600 focus:ring-3 focus:ring-shield-600/15 focus:outline-none"
                  />
                </label>
                <BotonIcono
                  aria-label="Quitar tramo"
                  title="Quitar tramo"
                  className="mb-1 hover:bg-route-50 hover:text-route-600"
                  onClick={() => setTramos((actuales) => actuales.filter((item) => item.clave !== tramo.clave))}
                >
                  <Trash2 className="size-4" />
                </BotonIcono>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-xl border border-ink-900 p-4 legend-frame">
          <p className="mb-2 map-label text-ink-500">Así la ve el viajero</p>
          <LineaPolitica
            noReembolsable={noReembolsable}
            reglas={reglas.filter((regla) => Number.isFinite(regla.hours_before))}
          />
        </section>

        <p className="flex items-start gap-2 text-xs text-ink-500">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          Los cambios aplican a compras nuevas: cada reserva conserva la política vigente al momento de comprar.
        </p>

        <div className="flex justify-end gap-3">
          <Boton variante="secondary" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={guardar.isPending}>
            Guardar política
          </Boton>
        </div>
      </div>
    </Modal>
  )
}

/** UC30: configurar la política de cancelación de cada vuelo del catálogo. */
export function PaginaPoliticasAdmin() {
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<VueloAdmin | null>(null)
  const {
    data: vuelos = [],
    isPending,
    error,
  } = useVuelosAdmin({ search: busqueda.trim() || undefined, is_active: true })

  return (
    <>
      <EncabezadoPaginaPanel
        titulo="Políticas de cancelación"
        descripcion="Definí para cada vuelo si es no reembolsable o sus tramos con penalización (0 a 100 %). El viajero la ve antes de comprar."
      />

      <div className="mb-6">
        <CampoBusqueda
          placeholder="Buscar por vuelo, aerolínea o ciudad..."
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          aria-label="Buscar vuelos"
        />
      </div>

      {error && <AlertaFormulario mensaje={`No pudimos cargar los vuelos. ${error.message}`} />}

      {!isPending && !error && vuelos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60">
          <EstadoVacio
            titulo="No hay vuelos activos"
            descripcion="Cargá un vuelo en el catálogo para configurar su política."
          />
        </div>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Vuelo</Th>
              <Th>Política vigente</Th>
              <Th>Actualizada</Th>
              <Th className="text-right">Acción</Th>
            </tr>
          </thead>
          <tbody>
            {vuelos.map((vuelo) => {
              const configurada = vuelo.is_non_refundable || vuelo.cancellation_rules.length > 0
              return (
                <tr key={vuelo.id} className="transition-colors hover:bg-paper">
                  <Td>
                    <p className="font-bold text-ink-900 font-expanded">{vuelo.flight_number}</p>
                    <p className="text-xs text-ink-500">
                      {vuelo.origin_code} → {vuelo.destination_code} · {ETIQUETAS_TIPO_VIAJE[vuelo.trip_type]}
                    </p>
                  </Td>
                  <Td className="max-w-md">
                    {vuelo.is_non_refundable ? (
                      <Insignia tono="warning">
                        <ShieldX className="size-3.5" /> No reembolsable
                      </Insignia>
                    ) : configurada ? (
                      <p className="text-sm text-ink-900">{vuelo.cancellation_summary}</p>
                    ) : (
                      <Insignia tono="neutral">Sin configurar</Insignia>
                    )}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5 text-xs text-ink-500">
                      <CalendarClock className="size-3.5" aria-hidden />
                      {vuelo.policy_updated_at ? formatearFechaHoraCorta(vuelo.policy_updated_at) : '—'}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Boton variante="secondary" tamano="sm" onClick={() => setEditando(vuelo)}>
                        <SlidersHorizontal className="size-4" /> Configurar
                      </Boton>
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
      )}

      {editando && <ModalPolitica key={editando.id} vuelo={editando} alCerrar={() => setEditando(null)} />}
    </>
  )
}
