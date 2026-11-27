import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, Coins, Plane } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { useAlojamientosAdmin } from '@/features/alojamientos-admin/consultas'
import { EncabezadoPaginaPanel } from '@/features/sesion/EncabezadoPaginaPanel'
import {
  ETIQUETAS_CLASE_CABINA,
  ETIQUETAS_DIVISA_ADMIN,
  useVuelosAdmin,
  type DivisaAdmin,
} from '@/features/vuelos-admin/consultas'
import { formatearPrecioDivisa } from '@/features/vuelos-admin/formato'
import { api, errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { cn } from '@/lib/cn'
import { textoEquivalente } from '@/lib/divisas'
import { entradasDe } from '@/lib/entradas'

type Catalogo = 'vuelos' | 'alojamientos'

interface Servicio {
  clave: string
  grupo: string
  etiqueta: string
  precio: string
  divisa: DivisaAdmin
  /** Ruta de la API y nombre del campo de precio que se actualizan. */
  url: string
  campoPrecio: 'price_ars' | 'base_price_ars' | 'price_per_night'
}

const CATALOGOS: { valor: Catalogo; etiqueta: string; icono: typeof Plane }[] = [
  { valor: 'vuelos', etiqueta: 'Vuelos', icono: Plane },
  { valor: 'alojamientos', etiqueta: 'Alojamientos', icono: Building2 },
]

/** UC27: el administrador de Catálogo y Precios elige catálogo y servicio, y actualiza su precio con su divisa. */
export function PaginaPreciosAdmin() {
  const cliente = useQueryClient()
  const [catalogo, setCatalogo] = useState<Catalogo>('vuelos')
  const [claveElegida, setClaveElegida] = useState('')
  const [precioEditado, setPrecioEditado] = useState<string | null>(null)
  const [divisaEditada, setDivisaEditada] = useState<DivisaAdmin | null>(null)
  const [errorLocal, setErrorLocal] = useState<string>()

  const vuelos = useVuelosAdmin({ is_active: true })
  const alojamientos = useAlojamientosAdmin({ is_active: true })

  const servicios = useMemo<Servicio[]>(() => {
    if (catalogo === 'vuelos') {
      return (vuelos.data ?? []).flatMap((vuelo) => {
        const grupo = `${vuelo.flight_number} · ${vuelo.origin_code} → ${vuelo.destination_code} · ${vuelo.airline}`
        const tarifas = vuelo.fares
          .filter((tarifa) => tarifa.is_active)
          .map<Servicio>((tarifa) => ({
            clave: `tarifa:${tarifa.id}`,
            grupo,
            etiqueta: `Tarifa ${ETIQUETAS_CLASE_CABINA[tarifa.cabin_class]}`,
            precio: tarifa.price_ars,
            divisa: tarifa.currency,
            url: `/admin/fares/${tarifa.id}/`,
            campoPrecio: 'price_ars',
          }))
        return [
          ...tarifas,
          {
            clave: `vuelo:${vuelo.id}`,
            grupo,
            etiqueta: 'Precio base del vuelo',
            precio: vuelo.base_price_ars,
            divisa: vuelo.currency,
            url: `/admin/flights/${vuelo.id}/`,
            campoPrecio: 'base_price_ars',
          },
        ]
      })
    }
    return (alojamientos.data ?? []).map((alojamiento) => ({
      clave: `alojamiento:${alojamiento.id}`,
      grupo: `${alojamiento.city} (${alojamiento.destination_code})`,
      etiqueta: `${alojamiento.name} · por noche`,
      precio: alojamiento.price_per_night,
      divisa: alojamiento.currency,
      url: `/admin/accommodations/${alojamiento.id}/`,
      campoPrecio: 'price_per_night',
    }))
  }, [catalogo, vuelos.data, alojamientos.data])

  const grupos = useMemo(() => {
    const mapa = new Map<string, Servicio[]>()
    for (const servicio of servicios) mapa.set(servicio.grupo, [...(mapa.get(servicio.grupo) ?? []), servicio])
    return [...mapa]
  }, [servicios])

  const servicio = servicios.find((item) => item.clave === claveElegida) ?? servicios[0]
  const precio = precioEditado ?? servicio?.precio ?? ''
  const divisa = divisaEditada ?? servicio?.divisa ?? 'ARS'
  const cargando = catalogo === 'vuelos' ? vuelos.isPending : alojamientos.isPending

  const actualizar = useMutation({
    mutationFn: (datos: { servicio: Servicio; precio: string; divisa: DivisaAdmin }) =>
      api(datos.servicio.url, {
        metodo: 'PATCH',
        cuerpo: { [datos.servicio.campoPrecio]: datos.precio, currency: datos.divisa },
      }),
    onSuccess: async () => {
      await cliente.invalidateQueries()
      toast.success('Precio actualizado con éxito')
      setPrecioEditado(null)
      setDivisaEditada(null)
    },
  })
  const erroresApi = erroresDeCampos(actualizar.error)

  const reiniciarEdicion = () => {
    actualizar.reset()
    setErrorLocal(undefined)
    setPrecioEditado(null)
    setDivisaEditada(null)
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!servicio) return
    const limpio = precio.trim().replace(',', '.')
    if (!/^\d+(\.\d{1,2})?$/.test(limpio) || Number(limpio) <= 0) {
      setErrorLocal('El precio debe ser numérico y mayor a cero (hasta dos decimales).')
      return
    }
    setErrorLocal(undefined)
    actualizar.mutate({ servicio, precio: limpio, divisa })
  }

  const equivalente = Number(precio) > 0 ? textoEquivalente(Number(precio), divisa) : null

  return (
    <>
      <EncabezadoPaginaPanel
        titulo="Actualizar precios"
        descripcion="Elegí el catálogo y el servicio, y cargá su precio en pesos (ARS) o dólares (USD). El cambio se ve al instante en el sitio."
      />

      <div className="mb-6 inline-flex rounded-lg bg-ink-100 p-1" role="radiogroup" aria-label="Catálogo">
        {CATALOGOS.map(({ valor, etiqueta, icono: Icono }) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={catalogo === valor}
            onClick={() => {
              setCatalogo(valor)
              setClaveElegida('')
              reiniciarEdicion()
            }}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              catalogo === valor ? 'bg-sheet text-ink-900 shadow-sheet' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            <Icono className="size-4" /> {etiqueta}
          </button>
        ))}
      </div>

      {!cargando && servicios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-sheet/60">
          <EstadoVacio
            titulo={`No hay ${catalogo} activos para actualizar`}
            descripcion={`Cargá ${catalogo === 'vuelos' ? 'un vuelo' : 'un alojamiento'} desde su sección y volvé acá para ajustar el precio.`}
          />
        </div>
      ) : (
        <form
          onSubmit={enviar}
          noValidate
          aria-label="Actualizar precio de un servicio"
          className="flex flex-col gap-5 rounded-xl border border-ink-900 bg-sheet p-5 shadow-sheet sm:p-6"
        >
          <AlertaFormulario mensaje={errorLocal ?? errorDeFormulario(actualizar.error)} />

          <CampoSeleccion
            etiqueta="Servicio"
            value={servicio?.clave ?? ''}
            disabled={cargando}
            onChange={(evento) => {
              setClaveElegida(evento.target.value)
              reiniciarEdicion()
            }}
          >
            {cargando && <option value="">Cargando servicios…</option>}
            {grupos.map(([grupo, lista]) => (
              <optgroup key={grupo} label={grupo}>
                {lista.map((item) => (
                  <option key={item.clave} value={item.clave}>
                    {item.etiqueta} — {formatearPrecioDivisa(item.precio, item.divisa)} {item.divisa}
                  </option>
                ))}
              </optgroup>
            ))}
          </CampoSeleccion>

          <div className="grid items-start gap-4 sm:grid-cols-[1fr_14rem]">
            <CampoTexto
              etiqueta="Nuevo precio"
              inputMode="decimal"
              value={precio}
              onChange={(evento) => setPrecioEditado(evento.target.value)}
              error={erroresApi[servicio?.campoPrecio ?? 'price_ars']}
              ayuda={equivalente ? `${equivalente} a la cotización de referencia` : undefined}
            />
            <CampoSeleccion
              etiqueta="Divisa"
              value={divisa}
              error={erroresApi.currency}
              onChange={(evento) => setDivisaEditada(evento.target.value as DivisaAdmin)}
            >
              {entradasDe(ETIQUETAS_DIVISA_ADMIN).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </CampoSeleccion>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
            {servicio && (
              <p className="flex items-center gap-2 text-sm text-ink-700" data-numeric>
                <Coins className="size-4 text-shield-700" aria-hidden />
                Precio actual:{' '}
                <strong className="text-ink-900">
                  {formatearPrecioDivisa(servicio.precio, servicio.divisa)} {servicio.divisa}
                </strong>
              </p>
            )}
            <Boton type="submit" cargando={actualizar.isPending} disabled={!servicio}>
              <Check className="size-4" /> Guardar precio
            </Boton>
          </div>
        </form>
      )}
    </>
  )
}
