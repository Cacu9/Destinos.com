import { useSearchParams } from 'react-router'

import { useAeropuertos, useBusquedaVuelos } from './consultas'
import { FormularioBusquedaVuelos } from './FormularioBusquedaVuelos'
import { ResultadosVuelos } from './ResultadosVuelos'
import type { FiltrosVuelos, OrdenVuelos, SentidoOrden } from './tipos'
import {
  cantidadParaBuscar,
  filtrosDesdeParametros,
  hayFiltrosActivos,
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
            Filtrá por lo que necesites y compará aerolínea, escalas, duración, tarifa, divisa y condiciones de
            cancelación antes de elegir.
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

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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
        />
      </div>
    </>
  )
}
