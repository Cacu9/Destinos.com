import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { adaptarVuelosApi } from '../src/features/busqueda-vuelos/adaptadorApi.ts'
import {
  cantidadParaBuscar,
  filtrosDesdeParametros,
  ordenarVuelos,
  ordenDesdeParametros,
  parametrosDesdeFiltros,
  precioEnArs,
  sentidoDesdeParametros,
} from '../src/features/busqueda-vuelos/utilidades.ts'
import { buscarVuelosDemo } from '../src/features/busqueda-vuelos/vuelosDemo.ts'

const FECHA_BASE = new Date(2026, 10, 25, 10, 0, 0)

describe('Búsqueda de vuelos (SCRUM-58 a SCRUM-62)', () => {
  it('sin filtros devuelve vuelos de ida, ida y vuelta y multidestino con divisa y cancelación', () => {
    const vuelos = buscarVuelosDemo({}, FECHA_BASE)
    assert.ok(vuelos.length >= 15)

    const tipos = new Set(vuelos.map((vuelo) => vuelo.flight_type))
    assert.deepEqual(tipos, new Set(['one_way', 'round_trip', 'multi_city']))

    const divisas = new Set(vuelos.map((vuelo) => vuelo.currency))
    assert.deepEqual(divisas, new Set(['ARS', 'USD', 'EUR']))

    for (const vuelo of vuelos) {
      assert.ok(vuelo.airline.name.length > 0)
      assert.ok(vuelo.duration_minutes > 0)
      assert.ok(vuelo.price > 0)
      assert.ok(vuelo.cancellation_summary.length > 0)
      if (vuelo.flight_type === 'one_way') assert.equal(vuelo.legs.length, 1)
      if (vuelo.flight_type === 'round_trip') assert.equal(vuelo.legs.length, 2)
      if (vuelo.flight_type === 'multi_city') assert.ok(vuelo.legs.length >= 2)
    }
  })

  it('filtra por cada criterio opcional de forma individual', () => {
    const soloIda = buscarVuelosDemo({ flight_type: 'one_way' }, FECHA_BASE)
    assert.ok(soloIda.length > 0 && soloIda.every((vuelo) => vuelo.flight_type === 'one_way'))

    const idaYVuelta = buscarVuelosDemo({ flight_type: 'round_trip' }, FECHA_BASE)
    assert.ok(idaYVuelta.length > 0 && idaYVuelta.every((vuelo) => vuelo.flight_type === 'round_trip'))

    const multidestino = buscarVuelosDemo({ flight_type: 'multi_city' }, FECHA_BASE)
    assert.ok(multidestino.length > 0 && multidestino.every((vuelo) => vuelo.flight_type === 'multi_city'))

    const desdeEze = buscarVuelosDemo({ origin: 'EZE' }, FECHA_BASE)
    assert.ok(desdeEze.length > 0 && desdeEze.every((vuelo) => vuelo.origin.code === 'EZE'))

    const ejecutiva = buscarVuelosDemo({ category: 'business' }, FECHA_BASE)
    assert.ok(ejecutiva.length > 0 && ejecutiva.every((vuelo) => vuelo.category === 'business'))

    const paraOcho = buscarVuelosDemo({ passengers: 8 }, FECHA_BASE)
    assert.ok(paraOcho.length > 0 && paraOcho.every((vuelo) => vuelo.seats_available >= 8))

    const manana = '2026-11-26'
    const porFecha = buscarVuelosDemo({ date: manana }, FECHA_BASE)
    assert.ok(porFecha.length > 0 && porFecha.every((vuelo) => vuelo.departure.startsWith(manana)))
  })

  it('combina múltiples filtros correctamente', () => {
    const resultado = buscarVuelosDemo(
      {
        flight_type: 'one_way',
        origin: 'AEP',
        destination: 'MDZ',
        category: 'economy',
        date: '2026-11-26',
        passengers: 3,
      },
      FECHA_BASE,
    )

    assert.equal(resultado.length, 3)
    for (const vuelo of resultado) {
      assert.equal(vuelo.flight_type, 'one_way')
      assert.equal(vuelo.origin.code, 'AEP')
      assert.equal(vuelo.destination.code, 'MDZ')
      assert.equal(vuelo.category, 'economy')
      assert.ok(vuelo.departure.startsWith('2026-11-26'))
      assert.ok(vuelo.seats_available >= 3)
    }
  })

  it('devuelve lista vacía cuando no hay coincidencias', () => {
    assert.deepEqual(buscarVuelosDemo({ origin: 'USH', destination: 'BCN' }, FECHA_BASE), [])
    assert.deepEqual(buscarVuelosDemo({ origin: 'EZE', destination: 'MIA', passengers: 9 }, FECHA_BASE), [])
    assert.deepEqual(buscarVuelosDemo({ date: '2099-01-01' }, FECHA_BASE), [])
  })

  it('ordena resultados filtrados por precio, duración y escalas en ambos sentidos', () => {
    const filtrados = buscarVuelosDemo({ origin: 'AEP' }, FECHA_BASE)
    assert.ok(filtrados.length > 3)

    const precioAsc = ordenarVuelos(filtrados, 'precio', 'asc')
    const precioDesc = ordenarVuelos(filtrados, 'precio', 'desc')
    for (let i = 1; i < precioAsc.length; i++) {
      assert.ok(precioEnArs(precioAsc[i - 1]) <= precioEnArs(precioAsc[i]))
      assert.ok(precioEnArs(precioDesc[i - 1]) >= precioEnArs(precioDesc[i]))
    }

    const duracionAsc = ordenarVuelos(filtrados, 'duracion', 'asc')
    const duracionDesc = ordenarVuelos(filtrados, 'duracion', 'desc')
    for (let i = 1; i < duracionAsc.length; i++) {
      assert.ok(duracionAsc[i - 1].duration_minutes <= duracionAsc[i].duration_minutes)
      assert.ok(duracionDesc[i - 1].duration_minutes >= duracionDesc[i].duration_minutes)
    }

    const escalasAsc = ordenarVuelos(filtrados, 'escalas', 'asc')
    const escalasDesc = ordenarVuelos(filtrados, 'escalas', 'desc')
    for (let i = 1; i < escalasAsc.length; i++) {
      assert.ok(escalasAsc[i - 1].stops.length <= escalasAsc[i].stops.length)
      assert.ok(escalasDesc[i - 1].stops.length >= escalasDesc[i].stops.length)
    }
  })

  it('serializa y valida filtros, orden y sentido desde la URL', () => {
    const params = parametrosDesdeFiltros(
      { flight_type: 'round_trip', origin: 'EZE', destination: 'MAD', category: 'business', passengers: 2 },
      'duracion',
      'desc',
    )
    assert.deepEqual(filtrosDesdeParametros(params), {
      flight_type: 'round_trip',
      origin: 'EZE',
      destination: 'MAD',
      category: 'business',
      date: undefined,
      passengers: 2,
    })
    assert.equal(ordenDesdeParametros(params), 'duracion')
    assert.equal(sentidoDesdeParametros(params), 'desc')

    const invalidos = new URLSearchParams('tipo=invalido&origen=XX&pasajeros=99&orden=otro&sentido=otro')
    assert.deepEqual(filtrosDesdeParametros(invalidos), {
      flight_type: undefined,
      origin: undefined,
      destination: undefined,
      category: undefined,
      date: undefined,
      passengers: undefined,
    })
    assert.equal(ordenDesdeParametros(invalidos), 'precio')
    assert.equal(sentidoDesdeParametros(invalidos), 'asc')
  })

  it('adapta vuelos del backend conservando divisa ARS/USD, tarifas y escalas numéricas', () => {
    const adaptados = adaptarVuelosApi(
      [
        {
          id: 2,
          flight_number: 'FO5210',
          airline: 'Flybondi',
          origin_city: 'Buenos Aires',
          origin_code: 'EZE',
          destination_city: 'Mendoza',
          destination_code: 'MDZ',
          departure_at: '2026-12-03T10:00:00-03:00',
          arrival_at: '2026-12-03T11:50:00-03:00',
          duration_minutes: 110,
          stops: 1,
          base_price_ars: '800.00',
          currency: 'USD',
          min_price_ars: 800,
          cancellation_summary: 'Permite cambio con penalidad hasta 24 h antes.',
          fares: [
            {
              id: 3,
              cabin_class: 'economy',
              cabin_class_display: 'Económica',
              price_ars: '800.00',
              currency: 'USD',
              available_seats: 20,
              is_refundable: false,
            },
          ],
        },
      ],
      {},
    )

    assert.equal(adaptados.length, 1)
    assert.equal(adaptados[0].currency, 'USD')
    assert.equal(adaptados[0].price, 800)
    assert.equal(adaptados[0].stops_count, 1)
    assert.equal(adaptados[0].backend_id, 2)
    assert.equal(adaptados[0].cancellation_summary, 'No reembolsable · Permite cambio con penalidad hasta 24 h antes.')
  })

  it('calcula pasajeros totales combinando mayores y menores desde la URL', () => {
    const filtros = filtrosDesdeParametros(new URLSearchParams('mayores=2&menores=3'))
    assert.equal(filtros.adults, 2)
    assert.equal(filtros.children, 3)
    assert.equal(cantidadParaBuscar(filtros), 5)
  })

  it('refleja la ciudad actualizada de un destino en el catálogo de vuelos', () => {
    const adaptados = adaptarVuelosApi(
      [
        {
          id: 1,
          flight_number: 'AR1680',
          airline: 'Aerolíneas Argentinas',
          origin_city: 'Buenos Aires',
          origin_code: 'AEP',
          destination_city: 'San Carlos de Bariloche',
          destination_code: 'BRC',
          departure_at: '2026-12-02T06:00:00-03:00',
          arrival_at: '2026-12-02T08:25:00-03:00',
          duration_minutes: 145,
          stops: 0,
          base_price_ars: '185000.00',
          currency: 'ARS',
          min_price_ars: 185000,
          fares: [],
        },
      ],
      {},
    )
    assert.equal(adaptados[0].destination.city, 'San Carlos de Bariloche')
  })

  it('adapta un multidestino del backend con todos sus tramos y filtra por tipo de viaje', () => {
    const api = [
      {
        id: 7,
        flight_number: 'IB6860',
        airline: 'Iberia',
        origin_city: 'Buenos Aires',
        origin_code: 'EZE',
        destination_city: 'Madrid',
        destination_code: 'MAD',
        departure_at: '2026-12-10T13:05:00-03:00',
        arrival_at: '2026-12-11T01:45:00-03:00',
        duration_minutes: 835,
        stops: 0,
        total_stops: 0,
        trip_type: 'multi_city' as const,
        base_price_ars: '1590.00',
        currency: 'USD' as const,
        min_price_ars: 1590,
        is_non_refundable: true,
        cancellation_summary: 'No reembolsable.',
        fares: [],
        legs: [
          {
            position: 2,
            flight_number: 'IB1024',
            origin_city: 'Madrid',
            origin_code: 'MAD',
            destination_city: 'Barcelona',
            destination_code: 'BCN',
            departure_at: '2026-12-14T10:00:00-03:00',
            arrival_at: '2026-12-14T11:15:00-03:00',
            duration_minutes: 75,
            stops: 0,
          },
        ],
      },
    ]
    const [vuelo] = adaptarVuelosApi(api, {})
    assert.equal(vuelo.flight_type, 'multi_city')
    assert.equal(vuelo.legs.length, 2)
    assert.equal(vuelo.destination.code, 'BCN')
    assert.equal(vuelo.fare, 'promotional')
    assert.equal(vuelo.cancellation_summary, 'No reembolsable.')
    assert.equal(adaptarVuelosApi(api, { flight_type: 'one_way' }).length, 0)
  })
})
