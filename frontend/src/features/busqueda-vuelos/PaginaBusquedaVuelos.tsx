import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { coordenadasDe, puntosDe, rutasDeVuelo } from '@/features/mapa/geo'
import { MapaRutasDiferido } from '@/features/mapa/MapaRutasDiferido'
import { COTIZACION_USD_ARS, formatearMonto } from '@/lib/divisas'

import { useAeropuertos, useBusquedaVuelos } from './consultas'
import { FormularioBusquedaVuelos } from './FormularioBusquedaVuelos'
import { ResultadosVuelos } from './ResultadosVuelos'
import { ETIQUETAS_TIPO_VUELO, type FiltrosVuelos, type OrdenVuelos, type SentidoOrden } from './tipos'
import {
  cantidadParaBuscar,
  filtrosDesdeParametros,
  hayFiltrosActivos,
  ordenarVuelos,
  ordenDesdeParametros,
  parametrosDesdeFiltros,
  sentidoDesdeParametros,
} from './utilidades'

/** Búsqueda de vuelos, abierta a clientes con y sin sesión. Los filtros y el orden viven en la URL. */
export function PaginaBusquedaVuelos() {
  const [parametros, setParametros] = useSearchParams()
  const filtros = filtrosDesdeParametros(parametros)
  const orden = ordenDesdeParametros(parametros)
  const sentido = sentidoDesdeParametros(parametros)
  const { data: aeropuertos = [] } = useAeropuertos()
  const busqueda = useBusquedaVuelos(filtros)
  const [idActivo, setIdActivo] = useState<number>()

  const coordenadas = useMemo(() => coordenadasDe(aeropuertos), [aeropuertos])
  const puntos = useMemo(() => puntosDe(aeropuertos, coordenadas), [aeropuertos, coordenadas])
  const ordenados = useMemo(() => ordenarVuelos(busqueda.data ?? [], orden, sentido), [busqueda.data, orden, sentido])
  // El mapa siempre muestra una ruta: la del pasaje bajo el mouse o el foco, o si no la del primer resultado.
  const vueloActivo = ordenados.find((vuelo) => vuelo.id === idActivo) ?? ordenados[0]
  const rutas = useMemo(() => (vueloActivo ? rutasDeVuelo(vueloActivo, coordenadas) : []), [vueloActivo, coordenadas])

  const buscar = (nuevosFiltros: FiltrosVuelos) => setParametros(parametrosDesdeFiltros(nuevosFiltros, orden, sentido))
  const ordenar = (nuevoOrden: OrdenVuelos) =>
    setParametros(parametrosDesdeFiltros(filtros, nuevoOrden, sentido), { replace: true, preventScrollReset: true })
  const cambiarSentido = (nuevoSentido: SentidoOrden) =>
    setParametros(parametrosDesdeFiltros(filtros, orden, nuevoSentido), { replace: true, preventScrollReset: true })
  const limpiarFiltros = () => setParametros(parametrosDesdeFiltros({}, orden, sentido))

  return (
    <>
      <section className="border-b border-ink-900 bg-water-100">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6">
          <p className="map-label text-route-600">Vuelos</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">Buscá tu vuelo</h1>
          <p className="mt-2 mb-6 max-w-xl text-ink-700">
            Filtrá por lo que necesites y compará aerolínea, escalas, duración, tarifa, precio y condiciones de
            cancelación antes de elegir. Pasá el mouse por un pasaje para ver su ruta en el mapa.
          </p>
          {/* La key reinicia el formulario cuando los filtros cambian desde afuera (por ejemplo, al limpiarlos). */}
          <FormularioBusquedaVuelos
            key={parametrosDesdeFiltros(filtros, 'precio', 'asc').toString()}
            filtros={filtros}
            aeropuertos={aeropuertos}
            alBuscar={buscar}
            alLimpiar={limpiarFiltros}
          />
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="min-w-0">
          <ResultadosVuelos
            vuelos={busqueda.data}
            cargando={busqueda.isPending}
            actualizando={busqueda.isPlaceholderData}
            error={busqueda.error}
            orden={orden}
            sentido={sentido}
            pasajeros={cantidadParaBuscar(filtros)}
            hayFiltros={hayFiltrosActivos(filtros)}
            alCambiarOrden={ordenar}
            alCambiarSentido={cambiarSentido}
            alLimpiarFiltros={limpiarFiltros}
            idActivo={vueloActivo?.id}
            alActivar={(vuelo) => setIdActivo(vuelo.id)}
          />
        </div>

        <aside aria-label="Mapa de la ruta" className="order-first lg:sticky lg:top-6 lg:order-none">
          <MapaRutasDiferido
            points={puntos}
            routes={rutas}
            label={
              vueloActivo
                ? `Mapa con la ruta del vuelo ${vueloActivo.flight_number}`
                : 'Mapa de los destinos del catálogo'
            }
            className="h-64 rounded-xl border border-ink-900 shadow-sheet sm:h-80 lg:h-[calc(100dvh-7rem)] lg:max-h-[44rem]"
          />
          {vueloActivo && (
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-ink-700">
              <p data-numeric>
                <span className="font-bold text-ink-900">{ETIQUETAS_TIPO_VUELO[vueloActivo.flight_type]}</span> ·{' '}
                {[vueloActivo.legs[0].origin, ...vueloActivo.legs.map((tramo) => tramo.destination)]
                  .map((aeropuerto) => aeropuerto.code)
                  .join(' → ')}
              </p>
              <p className="text-ink-500" data-numeric>
                Cotización de referencia: US$ 1 = {formatearMonto(COTIZACION_USD_ARS, 'ARS')}
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
