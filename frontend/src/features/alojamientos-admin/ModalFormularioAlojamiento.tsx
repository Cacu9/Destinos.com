import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoSeleccion, CampoTexto } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { useAeropuertos } from '@/features/busqueda-vuelos/consultas'
import { ETIQUETAS_DIVISA_ADMIN, type DivisaAdmin } from '@/features/vuelos-admin/consultas'
import { errorDeFormulario, erroresDeCampos } from '@/lib/api'
import { entradasDe } from '@/lib/entradas'
import { leerFormulario } from '@/lib/formularios'

import {
  ETIQUETAS_TIPO_ALOJAMIENTO,
  useGuardarAlojamiento,
  type AlojamientoAdmin,
  type TipoAlojamiento,
} from './consultas'

interface PropsModalFormularioAlojamiento {
  abierto: boolean
  alojamiento: AlojamientoAdmin | null
  alCerrar: () => void
}

type CampoForm =
  | 'name'
  | 'accommodation_type'
  | 'destination_code'
  | 'city'
  | 'address'
  | 'stars'
  | 'price_per_night'
  | 'currency'
  | 'max_guests'
  | 'available_rooms'
  | 'amenities'
  | 'cancellation_policy'

export function ModalFormularioAlojamiento({ abierto, alojamiento, alCerrar }: PropsModalFormularioAlojamiento) {
  const guardar = useGuardarAlojamiento()
  const { data: destinos = [] } = useAeropuertos()
  const errores = erroresDeCampos(guardar.error)
  const esEdicion = alojamiento !== null

  const [codigoDestino, setCodigoDestino] = useState('')
  const [ciudadEditada, setCiudadEditada] = useState<string | null>(null)
  const codigoActual = codigoDestino || alojamiento?.destination_code || destinos[0]?.code || ''
  const ciudadSugerida = destinos.find((d) => d.code === codigoActual)?.city ?? ''
  const ciudad = ciudadEditada ?? alojamiento?.city ?? ciudadSugerida

  const cerrar = () => {
    guardar.reset()
    setCodigoDestino('')
    setCiudadEditada(null)
    alCerrar()
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const valores = leerFormulario<CampoForm>(evento.currentTarget)
    const reembolsable = new FormData(evento.currentTarget).has('is_refundable')

    guardar.mutate(
      {
        id: alojamiento?.id,
        name: valores.name,
        accommodation_type: valores.accommodation_type as TipoAlojamiento,
        destination_code: codigoActual.toUpperCase(),
        city: valores.city,
        address: valores.address,
        stars: Number(valores.stars || 3),
        price_per_night: valores.price_per_night,
        currency: (valores.currency as DivisaAdmin) || 'ARS',
        max_guests: Number(valores.max_guests || 2),
        available_rooms: Number(valores.available_rooms || 1),
        amenities: valores.amenities,
        cancellation_policy: valores.cancellation_policy,
        is_refundable: reembolsable,
      },
      {
        onSuccess: () => {
          toast.success(esEdicion ? 'Alojamiento actualizado con éxito' : 'Alojamiento creado con éxito')
          cerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      ancho="amplio"
      titulo={esEdicion ? `Editar ${alojamiento.name}` : 'Nuevo alojamiento'}
      descripcion="Definí el destino, tarifa por noche en pesos o dólares, capacidad y condiciones de cancelación."
      alCerrar={cerrar}
    >
      <form key={alojamiento?.id ?? 'new'} noValidate className="flex flex-col gap-4" onSubmit={enviar}>
        <AlertaFormulario mensaje={errorDeFormulario(guardar.error)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Nombre del alojamiento"
            name="name"
            placeholder="Hotel Patagonia"
            defaultValue={alojamiento?.name}
            error={errores.name}
          />
          <CampoSeleccion
            etiqueta="Tipo"
            name="accommodation_type"
            defaultValue={alojamiento?.accommodation_type ?? 'hotel'}
            error={errores.accommodation_type}
          >
            {entradasDe(ETIQUETAS_TIPO_ALOJAMIENTO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </CampoSeleccion>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <CampoSeleccion
            etiqueta="Destino (IATA)"
            name="destination_code"
            value={codigoActual}
            error={errores.destination_code}
            onChange={(e) => {
              const nuevo = e.target.value
              setCodigoDestino(nuevo)
              const encontrado = destinos.find((d) => d.code === nuevo)
              if (encontrado) setCiudadEditada(encontrado.city)
            }}
          >
            {destinos.map((destino) => (
              <option key={destino.code} value={destino.code}>
                {destino.city} ({destino.code})
              </option>
            ))}
          </CampoSeleccion>

          <CampoTexto
            etiqueta="Ciudad"
            name="city"
            value={ciudad}
            error={errores.city}
            onChange={(e) => setCiudadEditada(e.target.value)}
          />

          <CampoSeleccion
            etiqueta="Estrellas"
            name="stars"
            defaultValue={String(alojamiento?.stars ?? 4)}
            error={errores.stars}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'estrella' : 'estrellas'}
              </option>
            ))}
          </CampoSeleccion>
        </div>

        <CampoTexto
          etiqueta="Dirección"
          name="address"
          placeholder="Av. Bustillo Km 5"
          defaultValue={alojamiento?.address}
          error={errores.address}
        />

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoTexto
            etiqueta="Precio por noche"
            name="price_per_night"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="145000.00"
            defaultValue={alojamiento?.price_per_night}
            error={errores.price_per_night}
          />
          <CampoSeleccion
            etiqueta="Divisa"
            name="currency"
            defaultValue={alojamiento?.currency ?? 'ARS'}
            error={errores.currency}
          >
            {entradasDe(ETIQUETAS_DIVISA_ADMIN).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </CampoSeleccion>
          <CampoTexto
            etiqueta="Huéspedes máx."
            name="max_guests"
            type="number"
            min={1}
            defaultValue={alojamiento?.max_guests ?? 2}
            error={errores.max_guests}
          />
          <CampoTexto
            etiqueta="Habitaciones disp."
            name="available_rooms"
            type="number"
            min={0}
            defaultValue={alojamiento?.available_rooms ?? 5}
            error={errores.available_rooms}
          />
        </div>

        <CampoTexto
          etiqueta="Servicios incluidos"
          name="amenities"
          placeholder="WiFi · Desayuno · Pileta"
          defaultValue={alojamiento?.amenities ?? 'WiFi · Desayuno'}
          error={errores.amenities}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="campo-cancelacion-alojamiento" className="text-[13px] font-semibold text-ink-700">
            Política de cancelación
          </label>
          <textarea
            id="campo-cancelacion-alojamiento"
            name="cancellation_policy"
            rows={2}
            defaultValue={alojamiento?.cancellation_policy ?? ''}
            placeholder="Ej: Cancelación sin cargo hasta 48 horas antes del check-in."
            className="w-full rounded-lg border border-ink-200 bg-sheet px-3.5 py-2.5 text-[15px] text-ink-900 transition-colors placeholder:text-ink-500 hover:border-ink-300 focus:border-shield-600 focus:ring-3 focus:ring-shield-600/15 focus:outline-none"
          />
          {errores.cancellation_policy && <p className="text-[13px] text-route-600">{errores.cancellation_policy}</p>}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            name="is_refundable"
            defaultChecked={alojamiento?.is_refundable ?? true}
            className="size-4 rounded border-ink-300"
          />
          Tarifa reembolsable
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <Boton variante="secondary" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={guardar.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Crear alojamiento'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
