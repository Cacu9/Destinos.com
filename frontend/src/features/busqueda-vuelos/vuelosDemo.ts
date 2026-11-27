/**
 * Datos de demostración mientras no exista la API de vuelos. Incluye vuelos de solo ida, ida y vuelta y multidestino
 * en distintas divisas (ARS, USD, EUR) con fechas calculadas desde hoy. Al conectar el backend, este archivo se borra.
 */
import type {
  Aerolinea,
  Aeropuerto,
  CategoriaVuelo,
  Divisa,
  FiltrosVuelos,
  TarifaVuelo,
  TipoVuelo,
  TramoVuelo,
  Vuelo,
} from './tipos.ts'
import { cantidadParaBuscar } from './utilidades.ts'

export const AEROPUERTOS_DEMO: Aeropuerto[] = [
  { code: 'AEP', name: 'Aeroparque Jorge Newbery', city: 'Buenos Aires', country: 'Argentina' },
  { code: 'EZE', name: 'Ministro Pistarini (Ezeiza)', city: 'Buenos Aires', country: 'Argentina' },
  { code: 'COR', name: 'Ingeniero Taravella', city: 'Córdoba', country: 'Argentina' },
  { code: 'MDZ', name: 'El Plumerillo', city: 'Mendoza', country: 'Argentina' },
  { code: 'BRC', name: 'Teniente Candelaria', city: 'Bariloche', country: 'Argentina' },
  { code: 'IGR', name: 'Cataratas del Iguazú', city: 'Puerto Iguazú', country: 'Argentina' },
  { code: 'USH', name: 'Malvinas Argentinas', city: 'Ushuaia', country: 'Argentina' },
  { code: 'SLA', name: 'Martín Miguel de Güemes', city: 'Salta', country: 'Argentina' },
  { code: 'GRU', name: 'Guarulhos', city: 'San Pablo', country: 'Brasil' },
  { code: 'SCL', name: 'Arturo Merino Benítez', city: 'Santiago', country: 'Chile' },
  { code: 'MIA', name: 'Internacional de Miami', city: 'Miami', country: 'Estados Unidos' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'España' },
  { code: 'BCN', name: 'Josep Tarradellas Barcelona-El Prat', city: 'Barcelona', country: 'España' },
]

const AEROLINEAS: Record<string, Aerolinea> = {
  AR: { code: 'AR', name: 'Aerolíneas Argentinas' },
  FO: { code: 'FO', name: 'Flybondi' },
  JA: { code: 'JA', name: 'JetSMART' },
  LA: { code: 'LA', name: 'LATAM' },
  G3: { code: 'G3', name: 'GOL' },
  AA: { code: 'AA', name: 'American Airlines' },
  IB: { code: 'IB', name: 'Iberia' },
}

const CANCELACION_POR_TARIFA: Record<TarifaVuelo, string> = {
  flexible: 'Cancelación sin cargo hasta 24 h antes de la salida. Reembolso del 100 %.',
  standard: 'Cancelás con un cargo del 30 % hasta 72 h antes; después no hay reembolso.',
  promotional: 'Sin reembolso. Solo podés cambiar la fecha pagando la diferencia tarifaria.',
}

interface DefinicionTramo {
  numero: number
  origen: string
  destino: string
  dentroDeDias: number
  hora: string
  duracion: number
  escalas: string[]
}

interface DefinicionVuelo {
  aerolinea: string
  tipo: TipoVuelo
  categoria: CategoriaVuelo
  tarifa: TarifaVuelo
  precio: number
  divisa: Divisa
  asientos: number
  tramos: DefinicionTramo[]
}

const VUELOS_BASE: DefinicionVuelo[] = [
  // Solo ida (nacionales e internacionales)
  {
    aerolinea: 'FO',
    tipo: 'one_way',
    categoria: 'economy',
    tarifa: 'promotional',
    precio: 74_900,
    divisa: 'ARS',
    asientos: 9,
    tramos: [
      { numero: 5120, origen: 'AEP', destino: 'MDZ', dentroDeDias: 1, hora: '09:40', duracion: 120, escalas: [] },
    ],
  },
  {
    aerolinea: 'JA',
    tipo: 'one_way',
    categoria: 'economy',
    tarifa: 'standard',
    precio: 81_200,
    divisa: 'ARS',
    asientos: 6,
    tramos: [
      { numero: 3061, origen: 'AEP', destino: 'MDZ', dentroDeDias: 1, hora: '13:25', duracion: 230, escalas: ['COR'] },
    ],
  },
  {
    aerolinea: 'AR',
    tipo: 'one_way',
    categoria: 'economy',
    tarifa: 'flexible',
    precio: 142_300,
    divisa: 'ARS',
    asientos: 3,
    tramos: [
      { numero: 1406, origen: 'AEP', destino: 'MDZ', dentroDeDias: 1, hora: '18:50', duracion: 115, escalas: [] },
    ],
  },
  {
    aerolinea: 'AR',
    tipo: 'one_way',
    categoria: 'business',
    tarifa: 'flexible',
    precio: 365_000,
    divisa: 'ARS',
    asientos: 2,
    tramos: [
      { numero: 1408, origen: 'AEP', destino: 'MDZ', dentroDeDias: 1, hora: '20:15', duracion: 115, escalas: [] },
    ],
  },
  {
    aerolinea: 'JA',
    tipo: 'one_way',
    categoria: 'economy',
    tarifa: 'promotional',
    precio: 62_300,
    divisa: 'ARS',
    asientos: 9,
    tramos: [
      { numero: 3402, origen: 'COR', destino: 'SLA', dentroDeDias: 3, hora: '10:10', duracion: 95, escalas: [] },
    ],
  },
  {
    aerolinea: 'AR',
    tipo: 'one_way',
    categoria: 'premium_economy',
    tarifa: 'flexible',
    precio: 268_000,
    divisa: 'ARS',
    asientos: 4,
    tramos: [
      { numero: 1880, origen: 'AEP', destino: 'USH', dentroDeDias: 5, hora: '05:45', duracion: 215, escalas: [] },
    ],
  },
  {
    aerolinea: 'LA',
    tipo: 'one_way',
    categoria: 'economy',
    tarifa: 'promotional',
    precio: 295,
    divisa: 'USD',
    asientos: 5,
    tramos: [
      { numero: 8010, origen: 'EZE', destino: 'SCL', dentroDeDias: 4, hora: '07:55', duracion: 135, escalas: [] },
    ],
  },
  {
    aerolinea: 'AA',
    tipo: 'one_way',
    categoria: 'first',
    tarifa: 'flexible',
    precio: 4_150,
    divisa: 'USD',
    asientos: 1,
    tramos: [
      { numero: 900, origen: 'EZE', destino: 'MIA', dentroDeDias: 7, hora: '22:15', duracion: 540, escalas: [] },
    ],
  },

  // Ida y vuelta
  {
    aerolinea: 'AR',
    tipo: 'round_trip',
    categoria: 'economy',
    tarifa: 'standard',
    precio: 184_500,
    divisa: 'ARS',
    asientos: 7,
    tramos: [
      { numero: 1402, origen: 'AEP', destino: 'MDZ', dentroDeDias: 1, hora: '07:10', duracion: 115, escalas: [] },
      { numero: 1405, origen: 'MDZ', destino: 'AEP', dentroDeDias: 5, hora: '19:30', duracion: 110, escalas: [] },
    ],
  },
  {
    aerolinea: 'FO',
    tipo: 'round_trip',
    categoria: 'economy',
    tarifa: 'promotional',
    precio: 169_800,
    divisa: 'ARS',
    asientos: 4,
    tramos: [
      { numero: 5402, origen: 'EZE', destino: 'BRC', dentroDeDias: 2, hora: '11:15', duracion: 145, escalas: [] },
      { numero: 5403, origen: 'BRC', destino: 'EZE', dentroDeDias: 6, hora: '14:40', duracion: 140, escalas: [] },
    ],
  },
  {
    aerolinea: 'AR',
    tipo: 'round_trip',
    categoria: 'economy',
    tarifa: 'flexible',
    precio: 249_000,
    divisa: 'ARS',
    asientos: 6,
    tramos: [
      { numero: 1672, origen: 'AEP', destino: 'BRC', dentroDeDias: 2, hora: '06:30', duracion: 140, escalas: [] },
      { numero: 1675, origen: 'BRC', destino: 'AEP', dentroDeDias: 6, hora: '17:55', duracion: 135, escalas: [] },
    ],
  },
  {
    aerolinea: 'G3',
    tipo: 'round_trip',
    categoria: 'economy',
    tarifa: 'standard',
    precio: 540,
    divisa: 'USD',
    asientos: 6,
    tramos: [
      { numero: 7461, origen: 'EZE', destino: 'GRU', dentroDeDias: 3, hora: '09:30', duracion: 175, escalas: [] },
      { numero: 7462, origen: 'GRU', destino: 'EZE', dentroDeDias: 7, hora: '16:15', duracion: 185, escalas: [] },
    ],
  },
  {
    aerolinea: 'LA',
    tipo: 'round_trip',
    categoria: 'economy',
    tarifa: 'promotional',
    precio: 980,
    divisa: 'USD',
    asientos: 8,
    tramos: [
      { numero: 8200, origen: 'EZE', destino: 'MIA', dentroDeDias: 7, hora: '23:40', duracion: 760, escalas: ['GRU'] },
      { numero: 8201, origen: 'MIA', destino: 'EZE', dentroDeDias: 14, hora: '20:50', duracion: 740, escalas: ['SCL'] },
    ],
  },
  {
    aerolinea: 'IB',
    tipo: 'round_trip',
    categoria: 'premium_economy',
    tarifa: 'flexible',
    precio: 1_850,
    divisa: 'EUR',
    asientos: 3,
    tramos: [
      { numero: 6856, origen: 'EZE', destino: 'MAD', dentroDeDias: 8, hora: '13:05', duracion: 760, escalas: [] },
      { numero: 6857, origen: 'MAD', destino: 'EZE', dentroDeDias: 18, hora: '23:55', duracion: 785, escalas: [] },
    ],
  },
  {
    aerolinea: 'IB',
    tipo: 'round_trip',
    categoria: 'business',
    tarifa: 'flexible',
    precio: 3_620,
    divisa: 'EUR',
    asientos: 2,
    tramos: [
      { numero: 6858, origen: 'EZE', destino: 'MAD', dentroDeDias: 8, hora: '21:10', duracion: 750, escalas: [] },
      { numero: 6859, origen: 'MAD', destino: 'EZE', dentroDeDias: 18, hora: '12:20', duracion: 775, escalas: [] },
    ],
  },

  // Multidestino
  {
    aerolinea: 'AR',
    tipo: 'multi_city',
    categoria: 'economy',
    tarifa: 'standard',
    precio: 238_400,
    divisa: 'ARS',
    asientos: 5,
    tramos: [
      { numero: 1520, origen: 'AEP', destino: 'COR', dentroDeDias: 1, hora: '08:15', duracion: 80, escalas: [] },
      { numero: 2410, origen: 'COR', destino: 'MDZ', dentroDeDias: 3, hora: '12:40', duracion: 75, escalas: [] },
    ],
  },
  {
    aerolinea: 'JA',
    tipo: 'multi_city',
    categoria: 'economy',
    tarifa: 'promotional',
    precio: 274_900,
    divisa: 'ARS',
    asientos: 7,
    tramos: [
      { numero: 3270, origen: 'AEP', destino: 'BRC', dentroDeDias: 3, hora: '15:05', duracion: 270, escalas: ['MDZ'] },
      { numero: 3890, origen: 'BRC', destino: 'USH', dentroDeDias: 6, hora: '10:20', duracion: 145, escalas: [] },
    ],
  },
  {
    aerolinea: 'AR',
    tipo: 'multi_city',
    categoria: 'economy',
    tarifa: 'flexible',
    precio: 318_000,
    divisa: 'ARS',
    asientos: 4,
    tramos: [
      { numero: 1730, origen: 'AEP', destino: 'IGR', dentroDeDias: 2, hora: '08:00', duracion: 110, escalas: [] },
      { numero: 2742, origen: 'IGR', destino: 'SLA', dentroDeDias: 5, hora: '16:10', duracion: 130, escalas: [] },
      { numero: 1455, origen: 'SLA', destino: 'AEP', dentroDeDias: 8, hora: '19:45', duracion: 125, escalas: [] },
    ],
  },
  {
    aerolinea: 'LA',
    tipo: 'multi_city',
    categoria: 'economy',
    tarifa: 'standard',
    precio: 1_190,
    divisa: 'USD',
    asientos: 6,
    tramos: [
      { numero: 8023, origen: 'EZE', destino: 'GRU', dentroDeDias: 3, hora: '14:10', duracion: 330, escalas: ['SCL'] },
      { numero: 8190, origen: 'GRU', destino: 'MIA', dentroDeDias: 6, hora: '22:30', duracion: 515, escalas: [] },
    ],
  },
  {
    aerolinea: 'IB',
    tipo: 'multi_city',
    categoria: 'business',
    tarifa: 'flexible',
    precio: 4_180,
    divisa: 'EUR',
    asientos: 2,
    tramos: [
      { numero: 6856, origen: 'EZE', destino: 'MAD', dentroDeDias: 8, hora: '13:05', duracion: 760, escalas: [] },
      { numero: 1024, origen: 'MAD', destino: 'BCN', dentroDeDias: 12, hora: '10:00', duracion: 75, escalas: [] },
    ],
  },
]

function aFechaHoraLocal(fecha: Date): string {
  const dosDigitos = (numero: number) => String(numero).padStart(2, '0')
  return (
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
    `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  )
}

function aeropuerto(codigo: string): Aeropuerto {
  const encontrado = AEROPUERTOS_DEMO.find((candidato) => candidato.code === codigo)
  if (!encontrado) throw new Error(`Aeropuerto desconocido: ${codigo}`)
  return encontrado
}

function construirTramo(aerolinea: string, tramo: DefinicionTramo, base: Date): TramoVuelo {
  const [horas, minutos] = tramo.hora.split(':').map(Number)
  const salida = new Date(base.getFullYear(), base.getMonth(), base.getDate() + tramo.dentroDeDias, horas, minutos)
  // Simplificación de la demo: la llegada ignora la diferencia horaria entre aeropuertos.
  const llegada = new Date(salida.getTime() + tramo.duracion * 60_000)
  return {
    flight_number: `${aerolinea} ${tramo.numero}`,
    origin: aeropuerto(tramo.origen),
    destination: aeropuerto(tramo.destino),
    departure: aFechaHoraLocal(salida),
    arrival: aFechaHoraLocal(llegada),
    duration_minutes: tramo.duracion,
    stops: tramo.escalas,
  }
}

export function crearVuelosDemo(fechaBase = new Date()): Vuelo[] {
  return VUELOS_BASE.map((definicion, indice) => {
    const tramos = definicion.tramos.map((tramo) => construirTramo(definicion.aerolinea, tramo, fechaBase))
    const primero = tramos[0]
    const tramoDestino = definicion.tipo === 'round_trip' ? primero : tramos[tramos.length - 1]
    const duracionTotal = tramos.reduce((suma, tramo) => suma + tramo.duration_minutes, 0)
    const escalasTotales = tramos.flatMap((tramo) => tramo.stops)

    return {
      id: indice + 1,
      flight_number: tramos.map((tramo) => tramo.flight_number).join(' · '),
      airline: AEROLINEAS[definicion.aerolinea],
      flight_type: definicion.tipo,
      origin: primero.origin,
      destination: tramoDestino.destination,
      departure: primero.departure,
      arrival: tramoDestino.arrival,
      duration_minutes: duracionTotal,
      stops: escalasTotales,
      legs: tramos,
      category: definicion.categoria,
      fare: definicion.tarifa,
      price: definicion.precio,
      currency: definicion.divisa,
      seats_available: definicion.asientos,
      cancellation_summary: CANCELACION_POR_TARIFA[definicion.tarifa],
    }
  })
}

function coincideDestino(vuelo: Vuelo, codigoDestino: string): boolean {
  if (vuelo.destination.code === codigoDestino) return true
  if (vuelo.flight_type === 'multi_city') {
    return vuelo.legs.some((tramo) => tramo.destination.code === codigoDestino)
  }
  return false
}

/** Imita el filtrado que hará `GET /api/flights/`. */
export function buscarVuelosDemo(filtros: FiltrosVuelos, fechaBase = new Date()): Vuelo[] {
  return crearVuelosDemo(fechaBase).filter(
    (vuelo) =>
      (!filtros.flight_type || vuelo.flight_type === filtros.flight_type) &&
      (!filtros.origin || vuelo.origin.code === filtros.origin) &&
      (!filtros.destination || coincideDestino(vuelo, filtros.destination)) &&
      (!filtros.category || vuelo.category === filtros.category) &&
      (!filtros.date || vuelo.departure.startsWith(filtros.date)) &&
      vuelo.seats_available >= cantidadParaBuscar(filtros),
  )
}
