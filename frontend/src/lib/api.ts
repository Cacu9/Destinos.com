import { almacenSesion } from './sesion'

const URL_API = import.meta.env.VITE_API_URL ?? '/api'
const ERROR_GENERICO = 'Hubo un error. Intente nuevamente.'

type ErroresCampo = Record<string, string>

export class ErrorApi extends Error {
  readonly estado: number
  readonly erroresCampo: ErroresCampo

  constructor(estado: number, mensaje: string, erroresCampo: ErroresCampo = {}) {
    super(mensaje)
    this.estado = estado
    this.erroresCampo = erroresCampo
  }
}

/** Errores por campo de un pedido fallido, para mostrarlos junto a cada campo. */
export function erroresDeCampos(error: unknown): ErroresCampo {
  return error instanceof ErrorApi ? error.erroresCampo : {}
}

/** Mensaje de los errores que no son de un campo puntual; los de campo se muestran junto a su campo. */
export function errorDeFormulario(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined
  return error instanceof ErrorApi && Object.keys(error.erroresCampo).length ? undefined : error.message
}

/** El primer mensaje legible de un error de DRF, que puede anidar listas y objetos (por ejemplo, uno por tramo). */
function primerMensaje(valor: unknown): string | undefined {
  if (typeof valor === 'string') return valor
  const hijos = Array.isArray(valor) ? valor : valor && typeof valor === 'object' ? Object.values(valor) : []
  for (const hijo of hijos) {
    const mensaje = primerMensaje(hijo)
    if (mensaje) return mensaje
  }
  return undefined
}

async function aErrorApi(respuesta: Response): Promise<ErrorApi> {
  const cuerpo = await respuesta.json().catch(() => null)
  if (!cuerpo || typeof cuerpo !== 'object') return new ErrorApi(respuesta.status, ERROR_GENERICO)

  const erroresCampo: ErroresCampo = {}
  for (const [campo, mensajes] of Object.entries(cuerpo as Record<string, unknown>)) {
    const mensaje = primerMensaje(mensajes)
    if (mensaje) erroresCampo[campo] = mensaje
  }
  const { detail, non_field_errors: sinCampo, ...campos } = erroresCampo
  return new ErrorApi(respuesta.status, detail ?? sinCampo ?? Object.values(campos)[0] ?? ERROR_GENERICO, campos)
}

let renovando: Promise<boolean> | null = null

/** Cambia el refresh token por un access token nuevo una sola vez, aunque lo pidan varios pedidos a la vez. */
function renovarTokenAcceso(): Promise<boolean> {
  renovando ??= (async () => {
    const sesion = almacenSesion.obtener()
    if (!sesion) return false
    const respuesta = await fetch(`${URL_API}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: sesion.refresh }),
    })
    if (!respuesta.ok) {
      almacenSesion.guardar(null)
      return false
    }
    const tokens: { access: string; refresh?: string } = await respuesta.json()
    almacenSesion.guardar({ ...sesion, access: tokens.access, refresh: tokens.refresh ?? sesion.refresh })
    return true
  })().finally(() => {
    renovando = null
  })
  return renovando
}

interface OpcionesPedido {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  cuerpo?: unknown
  parametros?: Record<string, string | number | boolean | undefined>
}

export async function api<T>(ruta: string, { metodo = 'GET', cuerpo, parametros }: OpcionesPedido = {}): Promise<T> {
  const consulta = new URLSearchParams(
    Object.entries(parametros ?? {}).flatMap(([clave, valor]) =>
      valor === undefined || valor === '' ? [] : [[clave, String(valor)]],
    ),
  ).toString()
  const url = `${URL_API}${ruta}${consulta ? `?${consulta}` : ''}`

  const enviar = () => {
    const encabezados: HeadersInit = { 'Content-Type': 'application/json' }
    const acceso = almacenSesion.obtener()?.access
    if (acceso) encabezados.Authorization = `Bearer ${acceso}`
    return fetch(url, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  }

  let respuesta = await enviar().catch(() => {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor.')
  })
  if (respuesta.status === 401 && almacenSesion.obtener() && (await renovarTokenAcceso())) {
    respuesta = await enviar()
  }
  if (!respuesta.ok) throw await aErrorApi(respuesta)
  return respuesta.status === 204 ? (undefined as T) : respuesta.json()
}
