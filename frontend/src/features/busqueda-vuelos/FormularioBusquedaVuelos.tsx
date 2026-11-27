import { ArrowLeftRight, RotateCcw, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { entradasDe } from '@/lib/entradas'
import { leerFormulario } from '@/lib/formularios'

import {
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_TIPO_VUELO,
  MAXIMO_PASAJEROS,
  PAIS_LOCAL,
  type Aeropuerto,
  type FiltrosVuelos,
} from './tipos'
import { fechaDeHoy, filtrosDesdeParametros, hayFiltrosActivos } from './utilidades'

type CampoFiltro = 'tipo' | 'origen' | 'destino' | 'categoria' | 'fecha' | 'mayores' | 'menores'

interface PropsFormularioBusquedaVuelos {
  filtros: FiltrosVuelos
  aeropuertos: Aeropuerto[]
  alBuscar: (filtros: FiltrosVuelos) => void
  alLimpiar: () => void
}

function OpcionesAeropuertos({ aeropuertos }: { aeropuertos: Aeropuerto[] }) {
  const grupos = [
    { etiqueta: 'Argentina', lista: aeropuertos.filter((aeropuerto) => aeropuerto.country === PAIS_LOCAL) },
    { etiqueta: 'Exterior', lista: aeropuertos.filter((aeropuerto) => aeropuerto.country !== PAIS_LOCAL) },
  ]
  return grupos.map(({ etiqueta, lista }) => (
    <optgroup key={etiqueta} label={etiqueta}>
      {lista.map((aeropuerto) => (
        <option key={aeropuerto.code} value={aeropuerto.code}>
          {aeropuerto.city} ({aeropuerto.code})
        </option>
      ))}
    </optgroup>
  ))
}

/** Filtros de la búsqueda. Todos son opcionales: un formulario vacío lista todos los vuelos. */
export function FormularioBusquedaVuelos({ filtros, aeropuertos, alBuscar, alLimpiar }: PropsFormularioBusquedaVuelos) {
  const [origen, setOrigen] = useState(filtros.origin ?? '')
  const [destino, setDestino] = useState(filtros.destination ?? '')
  const mismoAeropuerto = origen !== '' && origen === destino
  const [errorPasajeros, setErrorPasajeros] = useState<string>()
  const conFiltros = hayFiltrosActivos(filtros)

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (mismoAeropuerto) return
    const datos = leerFormulario<CampoFiltro>(evento.currentTarget)
    if (Number(datos.mayores) + Number(datos.menores) > MAXIMO_PASAJEROS) {
      setErrorPasajeros(`Elegí hasta ${MAXIMO_PASAJEROS} pasajeros en total.`)
      return
    }
    setErrorPasajeros(undefined)
    alBuscar(filtrosDesdeParametros(new URLSearchParams(datos)))
  }

  const invertirRuta = () => {
    setOrigen(destino)
    setDestino(origen)
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label="Buscar vuelos"
      className="flex flex-col gap-4 rounded-xl border border-ink-900 bg-sheet p-5 shadow-sheet"
    >
      <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
        <CampoSeleccion
          etiqueta="Origen"
          name="origen"
          value={origen}
          onChange={(evento) => setOrigen(evento.target.value)}
        >
          <option value="">Cualquier origen</option>
          <OpcionesAeropuertos aeropuertos={aeropuertos} />
        </CampoSeleccion>

        <button
          type="button"
          onClick={invertirRuta}
          aria-label="Invertir origen y destino"
          title="Invertir origen y destino"
          className="mt-6.5 grid size-11 cursor-pointer place-items-center rounded-full border border-ink-200 text-ink-700 transition-colors hover:border-ink-300 hover:text-route-500 max-sm:hidden"
        >
          <ArrowLeftRight className="size-4" />
        </button>

        <CampoSeleccion
          etiqueta="Destino"
          name="destino"
          value={destino}
          onChange={(evento) => setDestino(evento.target.value)}
          error={mismoAeropuerto ? 'Elegí un destino distinto del origen.' : undefined}
        >
          <option value="">Cualquier destino</option>
          <OpcionesAeropuertos aeropuertos={aeropuertos} />
        </CampoSeleccion>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CampoTexto
          etiqueta="Fecha de salida"
          name="fecha"
          type="date"
          min={fechaDeHoy()}
          defaultValue={filtros.date}
        />

        <CampoSeleccion
          etiqueta="Mayores"
          name="mayores"
          defaultValue={filtros.adults ?? filtros.passengers ?? ''}
          error={errorPasajeros}
        >
          <option value="">Sin especificar</option>
          {Array.from({ length: MAXIMO_PASAJEROS }, (_, indice) => indice + 1).map((cantidad) => (
            <option key={cantidad} value={cantidad}>
              {cantidad}
            </option>
          ))}
        </CampoSeleccion>

        <CampoSeleccion etiqueta="Menores" name="menores" defaultValue={filtros.children ?? ''}>
          <option value="">Sin especificar</option>
          {Array.from({ length: MAXIMO_PASAJEROS }, (_, indice) => indice + 1).map((cantidad) => (
            <option key={cantidad} value={cantidad}>
              {cantidad}
            </option>
          ))}
        </CampoSeleccion>

        <CampoSeleccion etiqueta="Tipo de vuelo" name="tipo" defaultValue={filtros.flight_type ?? ''}>
          <option value="">Todos los tipos</option>
          {entradasDe(ETIQUETAS_TIPO_VUELO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </CampoSeleccion>

        <CampoSeleccion etiqueta="Categoría" name="categoria" defaultValue={filtros.category ?? ''}>
          <option value="">Todas las categorías</option>
          {entradasDe(ETIQUETAS_CATEGORIA).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </CampoSeleccion>

        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
          {conFiltros && (
            <Boton variante="secondary" onClick={alLimpiar} title="Limpiar filtros">
              <RotateCcw className="size-4" /> Limpiar
            </Boton>
          )}
          <Boton type="submit" className="flex-1">
            <Search className="size-4" /> Buscar vuelos
          </Boton>
        </div>
      </div>
    </form>
  )
}
