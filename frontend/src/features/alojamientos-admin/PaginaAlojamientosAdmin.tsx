import { Building2, Pencil, Plus, PowerOff, RotateCcw, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoBusqueda } from '@/components/ui/CampoBusqueda'
import { DialogoConfirmacion } from '@/components/ui/DialogoConfirmacion'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Insignia } from '@/components/ui/Insignia'
import { BotonIcono, Tabla, Td, Th } from '@/components/ui/Tabla'
import { EncabezadoPaginaPanel } from '@/features/sesion/EncabezadoPaginaPanel'
import { formatearPrecioDivisa } from '@/features/vuelos-admin/formato'
import { cn } from '@/lib/cn'
import { entradasDe } from '@/lib/entradas'

import {
  ETIQUETAS_TIPO_ALOJAMIENTO,
  useAlojamientosAdmin,
  useDarDeBajaAlojamiento,
  useReactivarAlojamiento,
  type AlojamientoAdmin,
  type TipoAlojamiento,
} from './consultas'
import { ModalFormularioAlojamiento } from './ModalFormularioAlojamiento'

type FiltroEstado = 'todos' | 'activos' | 'inactivos'
type EstadoFormulario = { abierto: false } | { abierto: true; alojamiento: AlojamientoAdmin | null }

export function PaginaAlojamientosAdmin() {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('activos')
  const [tipo, setTipo] = useState<TipoAlojamiento | ''>('')
  const [formulario, setFormulario] = useState<EstadoFormulario>({ abierto: false })
  const [alojamientoADarDeBaja, setAlojamientoADarDeBaja] = useState<AlojamientoAdmin | null>(null)

  const {
    data: alojamientos = [],
    isPending,
    error,
  } = useAlojamientosAdmin({
    search: busqueda.trim() || undefined,
    is_active: estado === 'todos' ? undefined : estado === 'activos',
    accommodation_type: tipo || undefined,
  })

  const darDeBaja = useDarDeBajaAlojamiento()
  const reactivar = useReactivarAlojamiento()

  const confirmarBaja = () => {
    if (!alojamientoADarDeBaja) return
    darDeBaja.mutate(alojamientoADarDeBaja.id, {
      onSuccess: () => toast.success(`${alojamientoADarDeBaja.name} dado de baja`),
      onError: (err) => toast.error(err.message),
      onSettled: () => setAlojamientoADarDeBaja(null),
    })
  }

  return (
    <>
      <EncabezadoPaginaPanel
        titulo="Catálogo de alojamientos"
        descripcion="Administrá hoteles, departamentos y cabañas con tarifas por noche en ARS o USD y política de cancelación."
        accion={
          <Boton onClick={() => setFormulario({ abierto: true, alojamiento: null })}>
            <Plus className="size-4" /> Nuevo alojamiento
          </Boton>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CampoBusqueda
            placeholder="Buscar por nombre, ciudad o dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar alojamientos"
          />

          <select
            aria-label="Filtrar por tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoAlojamiento | '')}
            className="h-10 rounded-lg border border-ink-200 bg-sheet px-3 text-sm text-ink-900 hover:border-ink-300 focus:border-shield-600 focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            {entradasDe(ETIQUETAS_TIPO_ALOJAMIENTO).map(([valor, etiqueta]) => (
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

      {error && <AlertaFormulario mensaje={`No pudimos cargar los alojamientos. ${error.message}`} />}

      {!isPending && !error && alojamientos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60">
          <EstadoVacio
            titulo="No hay alojamientos para mostrar"
            descripcion={
              busqueda || estado !== 'todos' || tipo
                ? 'Probá limpiando los filtros o cargá un nuevo alojamiento.'
                : 'Todavía no hay alojamientos en el catálogo.'
            }
            accion={
              <Boton onClick={() => setFormulario({ abierto: true, alojamiento: null })}>
                <Building2 className="size-4" /> Cargar alojamiento
              </Boton>
            }
          />
        </div>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Alojamiento</Th>
              <Th>Destino</Th>
              <Th>Tarifa por noche</Th>
              <Th>Capacidad</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {alojamientos.map((alojamiento) => (
              <tr
                key={alojamiento.id}
                className={cn('transition-colors hover:bg-paper', !alojamiento.is_active && 'text-ink-500')}
              >
                <Td>
                  <p className={cn('font-semibold', alojamiento.is_active && 'text-ink-900')}>{alojamiento.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Insignia tono="info">{ETIQUETAS_TIPO_ALOJAMIENTO[alojamiento.accommodation_type]}</Insignia>
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-fare-standard">
                      {alojamiento.stars} <Star className="size-3 fill-current" aria-hidden />
                    </span>
                  </div>
                </Td>

                <Td>
                  <p className={cn('font-medium', alojamiento.is_active && 'text-ink-900')}>
                    {alojamiento.city} ({alojamiento.destination_code})
                  </p>
                  <p className="text-xs text-ink-500">{alojamiento.address}</p>
                </Td>

                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={cn('font-bold', alojamiento.is_active && 'text-ink-900')} data-numeric>
                      {formatearPrecioDivisa(alojamiento.price_per_night, alojamiento.currency)}
                    </p>
                    <span className="rounded bg-ink-100 px-1.5 py-0.5 map-label text-ink-700">
                      {alojamiento.currency}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {alojamiento.is_refundable ? 'Reembolsable' : 'No reembolsable'}
                  </p>
                </Td>

                <Td>
                  <p className="text-sm">
                    Hasta {alojamiento.max_guests} {alojamiento.max_guests === 1 ? 'huésped' : 'huéspedes'}
                  </p>
                  <p className="text-xs text-ink-500">{alojamiento.available_rooms} hab. disponibles</p>
                </Td>

                <Td>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className={cn('size-2 rounded-full', alojamiento.is_active ? 'bg-fare-flexible' : 'bg-ink-300')}
                    />
                    {alojamiento.is_active ? 'Activo' : 'Dado de baja'}
                  </span>
                </Td>

                <Td>
                  <div className="flex justify-end gap-1">
                    <BotonIcono
                      aria-label="Editar alojamiento"
                      title="Editar alojamiento"
                      onClick={() => setFormulario({ abierto: true, alojamiento })}
                    >
                      <Pencil className="size-4" />
                    </BotonIcono>
                    {alojamiento.is_active ? (
                      <BotonIcono
                        aria-label="Dar de baja alojamiento"
                        title="Dar de baja alojamiento"
                        className="hover:bg-route-50 hover:text-route-600"
                        onClick={() => setAlojamientoADarDeBaja(alojamiento)}
                      >
                        <PowerOff className="size-4" />
                      </BotonIcono>
                    ) : (
                      <BotonIcono
                        aria-label="Reactivar alojamiento"
                        title="Reactivar alojamiento"
                        className="hover:bg-home/60 hover:text-ink-900"
                        onClick={() =>
                          reactivar.mutate(alojamiento.id, {
                            onSuccess: () => toast.success(`${alojamiento.name} reactivado`),
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
            ))}
          </tbody>
        </Tabla>
      )}

      <ModalFormularioAlojamiento
        abierto={formulario.abierto}
        alojamiento={formulario.abierto ? formulario.alojamiento : null}
        alCerrar={() => setFormulario({ abierto: false })}
      />

      <DialogoConfirmacion
        abierto={alojamientoADarDeBaja !== null}
        titulo="Dar de baja alojamiento"
        descripcion={
          alojamientoADarDeBaja
            ? `${alojamientoADarDeBaja.name} (${alojamientoADarDeBaja.city}) dejará de mostrarse en el catálogo público.`
            : ''
        }
        textoConfirmar="Dar de baja"
        cargando={darDeBaja.isPending}
        alConfirmar={confirmarBaja}
        alCancelar={() => setAlojamientoADarDeBaja(null)}
      />
    </>
  )
}
