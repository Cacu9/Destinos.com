import { Pencil, PlaneTakeoff, Plus, PowerOff, RotateCcw, Tag } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoBusqueda } from '@/components/ui/CampoBusqueda'
import { DialogoConfirmacion } from '@/components/ui/DialogoConfirmacion'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Insignia } from '@/components/ui/Insignia'
import { BotonIcono, Tabla, Td, Th } from '@/components/ui/Tabla'
import { useAeropuertos } from '@/features/busqueda-vuelos/consultas'
import { PAIS_LOCAL } from '@/features/busqueda-vuelos/tipos'
import { EncabezadoPaginaPanel } from '@/features/sesion/EncabezadoPaginaPanel'
import { cn } from '@/lib/cn'
import { textoEquivalente } from '@/lib/divisas'
import { entradasDe } from '@/lib/entradas'

import {
  ETIQUETAS_CLASE_CABINA,
  ETIQUETAS_TIPO_VIAJE,
  useDarDeBajaVuelo,
  useReactivarVuelo,
  useVuelosAdmin,
  type ClaseCabina,
  type VueloAdmin,
} from './consultas'
import { formatearDuracion, formatearFechaHoraCorta, formatearPrecioDivisa } from './formato'
import { ModalFormularioVuelo } from './ModalFormularioVuelo'
import { ModalTarifasVuelo } from './ModalTarifasVuelo'

type FiltroEstado = 'todos' | 'activos' | 'inactivos'
type EstadoFormulario = { abierto: false } | { abierto: true; vuelo: VueloAdmin | null }

export function PaginaVuelosAdmin() {
  const [busqueda, setBusqueda] = useState('')
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('activos')
  const [clase, setClase] = useState<ClaseCabina | ''>('')
  const [formulario, setFormulario] = useState<EstadoFormulario>({ abierto: false })
  const [vueloTarifas, setVueloTarifas] = useState<VueloAdmin | null>(null)
  const [vueloADarDeBaja, setVueloADarDeBaja] = useState<VueloAdmin | null>(null)

  const { data: aeropuertos = [] } = useAeropuertos()
  const locales = aeropuertos.filter((a) => a.country.trim().toLowerCase() === PAIS_LOCAL.toLowerCase())
  const exteriores = aeropuertos.filter((a) => a.country.trim().toLowerCase() !== PAIS_LOCAL.toLowerCase())

  const {
    data: vuelos = [],
    isPending,
    error,
  } = useVuelosAdmin({
    search: busqueda.trim() || undefined,
    origin: origen || undefined,
    destination: destino || undefined,
    is_active: estado === 'todos' ? undefined : estado === 'activos',
    cabin_class: clase || undefined,
  })

  const darDeBaja = useDarDeBajaVuelo()
  const reactivar = useReactivarVuelo()

  const confirmarBaja = () => {
    if (!vueloADarDeBaja) return
    darDeBaja.mutate(vueloADarDeBaja.id, {
      onSuccess: () => toast.success(`Vuelo ${vueloADarDeBaja.flight_number} dado de baja`),
      onError: (err) => toast.error(err.message),
      onSettled: () => setVueloADarDeBaja(null),
    })
  }

  return (
    <>
      <EncabezadoPaginaPanel
        titulo="Catálogo de vuelos"
        descripcion="Administrá vuelos, precios, divisa (ARS o USD) y tarifas por clase. Las bajas son lógicas para preservar el historial."
        accion={
          <Boton onClick={() => setFormulario({ abierto: true, vuelo: null })}>
            <Plus className="size-4" /> Nuevo vuelo
          </Boton>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CampoBusqueda
            placeholder="Buscar por vuelo, aerolínea o ciudad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar vuelos"
          />

          <select
            aria-label="Filtrar por origen"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 bg-sheet px-3 text-sm text-ink-900 hover:border-ink-300 focus:border-shield-600 focus:outline-none"
          >
            <option value="">Todos los orígenes</option>
            {locales.length > 0 && (
              <optgroup label="Local (Argentina)">
                {locales.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.city} ({a.code})
                  </option>
                ))}
              </optgroup>
            )}
            {exteriores.length > 0 && (
              <optgroup label="Exterior">
                {exteriores.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.city} ({a.code})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <select
            aria-label="Filtrar por destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 bg-sheet px-3 text-sm text-ink-900 hover:border-ink-300 focus:border-shield-600 focus:outline-none"
          >
            <option value="">Todos los destinos</option>
            {locales.length > 0 && (
              <optgroup label="Local (Argentina)">
                {locales.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.city} ({a.code})
                  </option>
                ))}
              </optgroup>
            )}
            {exteriores.length > 0 && (
              <optgroup label="Exterior">
                {exteriores.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.city} ({a.code})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <select
            aria-label="Filtrar por clase"
            value={clase}
            onChange={(e) => setClase(e.target.value as ClaseCabina | '')}
            className="h-10 rounded-lg border border-ink-200 bg-sheet px-3 text-sm text-ink-900 hover:border-ink-300 focus:border-shield-600 focus:outline-none"
          >
            <option value="">Todas las clases</option>
            {entradasDe(ETIQUETAS_CLASE_CABINA).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex rounded-lg bg-ink-100 p-1">
          {(
            [
              ['todos', 'Todos'],
              ['activos', 'Activos'],
              ['inactivos', 'Dados de baja'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setEstado(valor)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                estado === valor ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && <AlertaFormulario mensaje={`No pudimos cargar los vuelos. ${error.message}`} />}

      {!isPending && !error && vuelos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60">
          <EstadoVacio
            titulo="No hay vuelos para mostrar"
            descripcion={
              busqueda || origen || destino || estado !== 'todos' || clase
                ? 'Probá limpiando los filtros o creá un nuevo vuelo.'
                : 'Todavía no se cargaron vuelos en el catálogo.'
            }
            accion={
              <Boton onClick={() => setFormulario({ abierto: true, vuelo: null })}>
                <PlaneTakeoff className="size-4" /> Cargar vuelo
              </Boton>
            }
          />
        </div>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Vuelo</Th>
              <Th>Ruta y horario</Th>
              <Th>Precios y tarifas</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {vuelos.map((vuelo) => {
              const tarifasActivas = vuelo.fares.filter((tarifa) => tarifa.is_active)
              return (
                <tr
                  key={vuelo.id}
                  className={cn('transition-colors hover:bg-paper', !vuelo.is_active && 'text-ink-500')}
                >
                  <Td>
                    <p className={cn('font-bold font-expanded', vuelo.is_active && 'text-ink-900')}>
                      {vuelo.flight_number}
                    </p>
                    <p className="text-ink-500">{vuelo.airline}</p>
                  </Td>

                  <Td>
                    <p
                      className={cn(
                        'flex flex-wrap items-center gap-2 font-semibold',
                        vuelo.is_active && 'text-ink-900',
                      )}
                    >
                      {vuelo.legs.length === 0
                        ? `${vuelo.origin_city} (${vuelo.origin_code}) → ${vuelo.destination_city} (${vuelo.destination_code})`
                        : [
                            vuelo.origin_code,
                            vuelo.destination_code,
                            ...vuelo.legs.map((tramo) => tramo.destination_code),
                          ].join(' → ')}
                      {vuelo.trip_type !== 'one_way' && (
                        <Insignia tono="neutral">{ETIQUETAS_TIPO_VIAJE[vuelo.trip_type]}</Insignia>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      Sale {formatearFechaHoraCorta(vuelo.departure_at)} · {formatearDuracion(vuelo.duration_minutes)} ·{' '}
                      {vuelo.total_stops === 0
                        ? 'Directo'
                        : vuelo.total_stops === 1
                          ? '1 escala'
                          : `${vuelo.total_stops} escalas`}
                    </p>
                  </Td>

                  <Td>
                    {tarifasActivas.length > 0 ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1">
                          {tarifasActivas.map((tarifa) => (
                            <Insignia key={tarifa.id} tono="info">
                              {ETIQUETAS_CLASE_CABINA[tarifa.cabin_class]} ·{' '}
                              {formatearPrecioDivisa(tarifa.price_ars, tarifa.currency)} {tarifa.currency}
                            </Insignia>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-ink-500" data-numeric>
                          Desde {formatearPrecioDivisa(vuelo.min_price_ars, tarifasActivas[0].currency)}{' '}
                          {tarifasActivas[0].currency} ·{' '}
                          {textoEquivalente(Number(vuelo.min_price_ars), tarifasActivas[0].currency)}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={cn('font-bold', vuelo.is_active && 'text-ink-900')} data-numeric>
                          {formatearPrecioDivisa(vuelo.base_price_ars, vuelo.currency)}
                        </p>
                        <span className="rounded bg-ink-100 px-1.5 py-0.5 map-label text-ink-700">
                          {vuelo.currency}
                        </span>
                      </div>
                    )}
                  </Td>

                  <Td>
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        aria-hidden
                        className={cn('size-2 rounded-full', vuelo.is_active ? 'bg-fare-flexible' : 'bg-ink-300')}
                      />
                      {vuelo.is_active ? 'Activo' : 'Dado de baja'}
                    </span>
                  </Td>

                  <Td>
                    <div className="flex justify-end gap-1">
                      <BotonIcono
                        aria-label="Gestionar tarifas"
                        title="Gestionar tarifas"
                        onClick={() => setVueloTarifas(vuelo)}
                      >
                        <Tag className="size-4" />
                      </BotonIcono>
                      <BotonIcono
                        aria-label="Editar vuelo"
                        title="Editar vuelo"
                        onClick={() => setFormulario({ abierto: true, vuelo })}
                      >
                        <Pencil className="size-4" />
                      </BotonIcono>
                      {vuelo.is_active ? (
                        <BotonIcono
                          aria-label="Dar de baja vuelo"
                          title="Dar de baja vuelo"
                          className="hover:bg-route-50 hover:text-route-600"
                          onClick={() => setVueloADarDeBaja(vuelo)}
                        >
                          <PowerOff className="size-4" />
                        </BotonIcono>
                      ) : (
                        <BotonIcono
                          aria-label="Reactivar vuelo"
                          title="Reactivar vuelo"
                          className="hover:bg-home/60 hover:text-ink-900"
                          onClick={() =>
                            reactivar.mutate(vuelo.id, {
                              onSuccess: () => toast.success(`Vuelo ${vuelo.flight_number} reactivado`),
                              onError: (err) => toast.error(err.message),
                            })
                          }
                        >
                          <RotateCcw className="size-4" />
                        </BotonIcono>
                      )}
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
      )}

      <ModalFormularioVuelo
        key={formulario.abierto ? (formulario.vuelo?.id ?? 'nuevo') : 'cerrado'}
        abierto={formulario.abierto}
        vuelo={formulario.abierto ? formulario.vuelo : null}
        alCerrar={() => setFormulario({ abierto: false })}
      />

      <ModalTarifasVuelo abierto={vueloTarifas !== null} vuelo={vueloTarifas} alCerrar={() => setVueloTarifas(null)} />

      <DialogoConfirmacion
        abierto={vueloADarDeBaja !== null}
        titulo="Dar de baja vuelo"
        descripcion={
          vueloADarDeBaja
            ? `El vuelo ${vueloADarDeBaja.flight_number} (${vueloADarDeBaja.origin_code} → ${vueloADarDeBaja.destination_code}) dejará de aparecer en el catálogo público, pero vas a poder reactivarlo cuando lo necesites.`
            : ''
        }
        textoConfirmar="Dar de baja"
        cargando={darDeBaja.isPending}
        alConfirmar={confirmarBaja}
        alCancelar={() => setVueloADarDeBaja(null)}
      />
    </>
  )
}
