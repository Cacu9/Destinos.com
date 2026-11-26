import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Pencil, Plus, PowerOff, RotateCcw } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/Campo'
import { CampoBusqueda } from '@/components/ui/CampoBusqueda'
import { DialogoConfirmacion } from '@/components/ui/DialogoConfirmacion'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Insignia } from '@/components/ui/Insignia'
import { Modal } from '@/components/ui/Modal'
import { BotonIcono, Tabla, Td, Th } from '@/components/ui/Tabla'
import { claveAeropuertos } from '@/features/busqueda-vuelos/consultas'
import { EncabezadoPaginaPanel } from '@/features/sesion/EncabezadoPaginaPanel'
import { api, errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { cn } from '@/lib/cn'
import { leerFormulario } from '@/lib/formularios'

const URL_DESTINOS = '/admin/destinations/'
const claveDestinos = ['admin', 'destinations'] as const

const CAMPOS = [
  ['city', 'Ciudad', 100],
  ['region', 'Provincia o estado', 100],
  ['country', 'País', 100],
  ['name', 'Aeropuerto', 120],
  ['code', 'Código IATA', 3],
] as const

type Campo = (typeof CAMPOS)[number][0]
type FiltroEstado = 'todos' | 'activos' | 'inactivos'
type Destino = Record<Campo, string> & { id: number; is_active: boolean }
type Cambio = { id?: number; datos: Record<Campo, string> } | { baja: number } | { reactivar: number }

export function PaginaDestinosAdmin() {
  const cliente = useQueryClient()
  const lista = useQuery({ queryKey: claveDestinos, queryFn: () => api<Destino[]>(URL_DESTINOS) })
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [formulario, setFormulario] = useState<Destino | 'nuevo' | null>(null)
  const [baja, setBaja] = useState<Destino | null>(null)
  const [erroresLocales, setErroresLocales] = useState<Partial<Record<Campo, string>>>({})
  const edicion = formulario && formulario !== 'nuevo' ? formulario : null

  const guardar = useMutation<Destino | void, Error, Cambio>({
    mutationFn: (cambio: Cambio) => {
      if ('baja' in cambio) return api<void>(`${URL_DESTINOS}${cambio.baja}/`, { metodo: 'DELETE' })
      if ('reactivar' in cambio)
        return api<Destino>(`${URL_DESTINOS}${cambio.reactivar}/reactivate/`, { metodo: 'POST' })
      return cambio.id
        ? api<Destino>(`${URL_DESTINOS}${cambio.id}/`, { metodo: 'PATCH', cuerpo: cambio.datos })
        : api<Destino>(URL_DESTINOS, { metodo: 'POST', cuerpo: cambio.datos })
    },
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: claveDestinos }),
        cliente.invalidateQueries({ queryKey: claveAeropuertos }),
        cliente.invalidateQueries({ queryKey: ['vuelos'] }),
        cliente.invalidateQueries({ queryKey: ['vuelo-detalle'] }),
        cliente.invalidateQueries({ queryKey: ['admin', 'flights'] }),
      ])
      toast.success('Destino actualizado con éxito')
      setFormulario(null)
      setBaja(null)
      setErroresLocales({})
    },
    onError: (error) => toast.error(error.message),
  })

  const destinosFiltrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase()
    return (lista.data ?? []).filter((destino) => {
      if (estado === 'activos' && !destino.is_active) return false
      if (estado === 'inactivos' && destino.is_active) return false
      if (!consulta) return true
      return [destino.city, destino.region, destino.country, destino.name, destino.code].some((campo) =>
        campo.toLowerCase().includes(consulta),
      )
    })
  }, [lista.data, busqueda, estado])

  const abrirNuevo = () => {
    guardar.reset()
    setErroresLocales({})
    setFormulario('nuevo')
  }

  const abrirEditar = (destino: Destino) => {
    guardar.reset()
    setErroresLocales({})
    setFormulario(destino)
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const datos = leerFormulario<Campo>(evento.currentTarget)
    datos.code = datos.code.toUpperCase()

    const validacion: Partial<Record<Campo, string>> = {}
    for (const [campo] of CAMPOS) {
      if (!datos[campo]) validacion[campo] = 'Este campo es obligatorio.'
    }
    if (!validacion.code && !/^[A-Z]{3}$/.test(datos.code)) {
      validacion.code = 'Ingresá un código IATA de tres letras.'
    }

    if (Object.keys(validacion).length > 0) {
      setErroresLocales(validacion)
      return
    }

    setErroresLocales({})
    guardar.mutate({ id: edicion?.id, datos })
  }

  const erroresApi = erroresDeCampos(guardar.error)
  const errores = { ...erroresApi, ...erroresLocales }

  return (
    <>
      <EncabezadoPaginaPanel
        titulo="Destinos"
        descripcion="Dá de alta, modificá o dá de baja aeropuertos y ciudades. Los cambios se reflejan en el catálogo público."
        accion={
          <Boton onClick={abrirNuevo}>
            <Plus className="size-4" /> Nuevo destino
          </Boton>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <CampoBusqueda
          placeholder="Buscar por ciudad, país, aeropuerto o IATA..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar destinos"
        />

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

      {lista.isError && <AlertaFormulario mensaje={`No pudimos cargar los destinos. ${lista.error.message}`} />}

      {!lista.isPending && !lista.isError && destinosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60">
          <EstadoVacio
            titulo="No hay destinos para mostrar"
            descripcion={
              busqueda || estado !== 'todos'
                ? 'Probá limpiando los filtros o cargá un nuevo destino.'
                : 'Todavía no hay destinos cargados.'
            }
            accion={
              <Boton onClick={abrirNuevo}>
                <MapPin className="size-4" /> Nuevo destino
              </Boton>
            }
          />
        </div>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Ciudad y región</Th>
              <Th>País</Th>
              <Th>Aeropuerto</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {destinosFiltrados.map((destino) => (
              <tr
                key={destino.id}
                className={cn('transition-colors hover:bg-paper', !destino.is_active && 'text-ink-500')}
              >
                <Td>
                  <p className={cn('font-semibold', destino.is_active && 'text-ink-900')}>{destino.city}</p>
                  <p className="text-xs text-ink-500">{destino.region}</p>
                </Td>
                <Td>{destino.country}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Insignia tono={destino.is_active ? 'info' : 'neutral'}>{destino.code}</Insignia>
                    <span>{destino.name}</span>
                  </div>
                </Td>
                <Td>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className={cn('size-2 rounded-full', destino.is_active ? 'bg-fare-flexible' : 'bg-ink-300')}
                    />
                    {destino.is_active ? 'Activo' : 'Dado de baja'}
                  </span>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {destino.is_active ? (
                      <>
                        <BotonIcono
                          aria-label="Editar destino"
                          title="Editar destino"
                          onClick={() => abrirEditar(destino)}
                        >
                          <Pencil className="size-4" />
                        </BotonIcono>
                        <BotonIcono
                          aria-label="Dar de baja destino"
                          title="Dar de baja destino"
                          className="hover:bg-route-50 hover:text-route-600"
                          onClick={() => {
                            guardar.reset()
                            setBaja(destino)
                          }}
                        >
                          <PowerOff className="size-4" />
                        </BotonIcono>
                      </>
                    ) : (
                      <BotonIcono
                        aria-label="Reactivar destino"
                        title="Reactivar destino"
                        className="hover:bg-home/60 hover:text-ink-900"
                        onClick={() => guardar.mutate({ reactivar: destino.id })}
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

      <Modal
        abierto={formulario !== null}
        titulo={edicion ? `Editar destino (${edicion.code})` : 'Nuevo destino'}
        descripcion="Todos los datos son obligatorios para mostrar el destino en las búsquedas de vuelos."
        alCerrar={() => {
          if (!guardar.isPending) setFormulario(null)
        }}
      >
        {formulario && (
          <form key={edicion?.id ?? 'nuevo'} onSubmit={enviar} noValidate className="grid gap-4">
            <AlertaFormulario mensaje={errorDeFormulario(guardar.error)} />
            {CAMPOS.map(([campo, etiqueta, maxLength]) => (
              <CampoTexto
                key={campo}
                name={campo}
                etiqueta={etiqueta}
                maxLength={maxLength}
                defaultValue={edicion?.[campo]}
                readOnly={campo === 'code' && Boolean(edicion)}
                ayuda={
                  campo === 'code' && edicion ? 'El código IATA no puede cambiarse en destinos existentes.' : undefined
                }
                error={errores[campo]}
              />
            ))}
            <div className="mt-2 flex justify-end gap-3">
              <Boton
                variante="secondary"
                onClick={() => {
                  if (!guardar.isPending) setFormulario(null)
                }}
              >
                Cancelar
              </Boton>
              <Boton type="submit" cargando={guardar.isPending}>
                {edicion ? 'Guardar cambios' : 'Guardar destino'}
              </Boton>
            </div>
          </form>
        )}
      </Modal>

      <DialogoConfirmacion
        abierto={baja !== null}
        titulo="Dar de baja destino"
        descripcion={`${baja?.city ?? ''} (${baja?.code ?? ''}) dejará de aparecer en los filtros y resultados de búsqueda de vuelos.`}
        textoConfirmar="Dar de baja"
        cargando={guardar.isPending}
        alCancelar={() => {
          if (!guardar.isPending) setBaja(null)
        }}
        alConfirmar={() => {
          if (baja) guardar.mutate({ baja: baja.id })
        }}
      />
    </>
  )
}
