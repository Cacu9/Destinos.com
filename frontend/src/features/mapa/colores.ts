/**
 * Un color por tramo, compartido por el mapa y las tarjetas: la ida en rojo de ruta, la vuelta (o el 2.º destino) en
 * azul de escudo y, en multidestinos, el 3.º en verde y el 4.º en ocre. Ningún tramo comparte color con el anterior.
 */
export const ESTILOS_TRAMO = [
  { stroke: 'stroke-route-500', fill: 'fill-route-500', swatch: 'bg-route-500', texto: 'text-route-600' },
  { stroke: 'stroke-shield-600', fill: 'fill-shield-600', swatch: 'bg-shield-600', texto: 'text-shield-700' },
  {
    stroke: 'stroke-fare-flexible',
    fill: 'fill-fare-flexible',
    swatch: 'bg-fare-flexible',
    texto: 'text-fare-flexible',
  },
  {
    stroke: 'stroke-fare-standard',
    fill: 'fill-fare-standard',
    swatch: 'bg-fare-standard',
    texto: 'text-fare-standard',
  },
]

export const estiloTramo = (indice: number) => ESTILOS_TRAMO[indice % ESTILOS_TRAMO.length]
