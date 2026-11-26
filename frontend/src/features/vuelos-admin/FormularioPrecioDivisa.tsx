import { Check, Coins } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { entradasDe } from '@/lib/entradas'

import {
  ETIQUETAS_CLASE_CABINA,
  ETIQUETAS_DIVISA_ADMIN,
  useActualizarPrecioDivisa,
  type DivisaAdmin,
  type VueloAdmin,
} from './consultas'
import { formatearPrecioDivisa } from './formato'

interface PropsFormularioPrecioDivisa {
  vuelos: VueloAdmin[]
}

type OpcionServicio =
  | {
      clave: string
      etiqueta: string
      tipo: 'vuelo'
      flightId: number
      precioActual: string
      divisaActual: DivisaAdmin
    }
  | {
      clave: string
      etiqueta: string
      tipo: 'tarifa'
      flightId: number
      tarifaId: number
      precioActual: string
      divisaActual: DivisaAdmin
    }

/** Formulario rápido para elegir un servicio (vuelo o tarifa por clase) y editar su precio y divisa. */
export function FormularioPrecioDivisa({ vuelos }: PropsFormularioPrecioDivisa) {
  const actualizar = useActualizarPrecioDivisa()
  const errores = erroresDeCampos(actualizar.error)

  const opciones = useMemo(() => {
    const mapa = new Map<string, OpcionServicio>()
    for (const vuelo of vuelos) {
      for (const tarifa of vuelo.fares) {
        const claveTarifa = `tarifa:${tarifa.id}`
        mapa.set(claveTarifa, {
          clave: claveTarifa,
          etiqueta: `Tarifa ${ETIQUETAS_CLASE_CABINA[tarifa.cabin_class]} · publicado (${formatearPrecioDivisa(tarifa.price_ars, tarifa.currency)} ${tarifa.currency})${tarifa.is_active ? '' : ' · Baja'}`,
          tipo: 'tarifa',
          flightId: vuelo.id,
          tarifaId: tarifa.id,
          precioActual: tarifa.price_ars,
          divisaActual: tarifa.currency,
        })
      }
      const claveVuelo = `vuelo:${vuelo.id}`
      mapa.set(claveVuelo, {
        clave: claveVuelo,
        etiqueta:
          vuelo.fares.length > 0
            ? `Precio base del vuelo (${formatearPrecioDivisa(vuelo.base_price_ars, vuelo.currency)} ${vuelo.currency})`
            : `Precio base · publicado (${formatearPrecioDivisa(vuelo.base_price_ars, vuelo.currency)} ${vuelo.currency})`,
        tipo: 'vuelo',
        flightId: vuelo.id,
        precioActual: vuelo.base_price_ars,
        divisaActual: vuelo.currency,
      })
    }
    return mapa
  }, [vuelos])

  const primeraClave = opciones.keys().next().value ?? ''
  const [servicioSeleccionado, setServicioSeleccionado] = useState('')
  const claveActiva = opciones.has(servicioSeleccionado) ? servicioSeleccionado : primeraClave
  const opcionActual = opciones.get(claveActiva)

  const [precioEditado, setPrecioEditado] = useState<string | null>(null)
  const [divisaEditada, setDivisaEditada] = useState<DivisaAdmin | null>(null)

  const precio = precioEditado ?? opcionActual?.precioActual ?? ''
  const currency = divisaEditada ?? opcionActual?.divisaActual ?? 'ARS'

  const cambiarServicio = (nuevaClave: string) => {
    actualizar.reset()
    setServicioSeleccionado(nuevaClave)
    setPrecioEditado(null)
    setDivisaEditada(null)
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!opcionActual) return

    const precioLimpio = precio.trim()
    actualizar.mutate(
      opcionActual.tipo === 'vuelo'
        ? { tipo: 'vuelo', flightId: opcionActual.flightId, precio: precioLimpio, currency }
        : {
            tipo: 'tarifa',
            flightId: opcionActual.flightId,
            tarifaId: opcionActual.tarifaId,
            precio: precioLimpio,
            currency,
          },
      {
        onSuccess: () => {
          toast.success(`Precio actualizado a ${formatearPrecioDivisa(precioLimpio, currency)} (${currency})`)
          setPrecioEditado(null)
          setDivisaEditada(null)
        },
      },
    )
  }

  if (vuelos.length === 0) return null

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label="Editar precio y divisa de un servicio"
      className="mb-6 flex flex-col gap-4 rounded-xl border border-ink-900 bg-sheet p-5 shadow-sheet"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-shield-50 text-shield-700">
            <Coins className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base leading-tight">Editar precio y divisa de un servicio</h2>
            <p className="text-xs text-ink-500">
              Seleccioná un vuelo o una de sus tarifas por clase y definí el precio en Pesos (ARS) o Dólares (USD).
            </p>
          </div>
        </div>
      </div>

      <AlertaFormulario mensaje={errorDeFormulario(actualizar.error)} />

      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_11rem_12rem_auto]">
        <CampoSeleccion
          etiqueta="Servicio"
          value={claveActiva}
          onChange={(evento) => cambiarServicio(evento.target.value)}
        >
          {vuelos.map((vuelo) => (
            <optgroup
              key={vuelo.id}
              label={`${vuelo.flight_number} · ${vuelo.origin_code} → ${vuelo.destination_code} · ${vuelo.airline}`}
            >
              {vuelo.fares.map((tarifa) => (
                <option key={tarifa.id} value={`tarifa:${tarifa.id}`}>
                  {opciones.get(`tarifa:${tarifa.id}`)?.etiqueta}
                </option>
              ))}
              <option value={`vuelo:${vuelo.id}`}>{opciones.get(`vuelo:${vuelo.id}`)?.etiqueta}</option>
            </optgroup>
          ))}
        </CampoSeleccion>

        <CampoTexto
          etiqueta="Precio"
          type="number"
          min={0.01}
          step="0.01"
          value={precio}
          error={errores.base_price_ars ?? errores.price_ars}
          onChange={(evento) => setPrecioEditado(evento.target.value)}
        />

        <CampoSeleccion
          etiqueta="Divisa"
          value={currency}
          error={errores.currency}
          onChange={(evento) => setDivisaEditada(evento.target.value as DivisaAdmin)}
        >
          {entradasDe(ETIQUETAS_DIVISA_ADMIN).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </CampoSeleccion>

        <Boton type="submit" cargando={actualizar.isPending} disabled={!opcionActual}>
          <Check className="size-4" /> Guardar precio
        </Boton>
      </div>
    </form>
  )
}
