import { geoGraticule, geoMercator, geoPath, type GeoProjection } from 'd3-geo'
import type { FeatureCollection } from 'geojson'
import { LocateFixed, Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import countriesData from './countries.json'
import provincesData from './provinces.json'
import { estiloTramo } from './colores'
import type { MapPoint, MapRoute } from './geo'
import { fitBounds, useMapView, type Bounds, type MapView } from './useMapView'
import { useElementSize } from './useElementSize'

const countries = countriesData as FeatureCollection
const provinces = provincesData as FeatureCollection
const graticule = geoGraticule().step([10, 10])()
const ARGENTINA_ID = '032'

/** The sheet the map is built around: the Southern Cone plus Lima and Río (lon/lat corners). */
const HOME_SHEET = {
  type: 'MultiPoint' as const,
  coordinates: [
    [-82, -56],
    [-36, -56],
    [-82, -8],
    [-36, -8],
  ],
}
/** How far the view can travel: the inhabited world, without the poles. */
const WORLD: [[number, number], [number, number]] = [
  [-170, -58],
  [180, 75],
]
const MAX_ZOOM = 14
/** Room kept around a fitted route for its labels and the map controls. */
const FIT_PADDING = 56
/** Height the route legend takes per leg, kept clear when fitting a route. */
const LEGEND_ROW = 22
const LEGEND_WIDTH = 270
/** The zoom buttons in the top right corner, kept clear of labels. */
const CONTROLS_WIDTH = 60
const CONTROLS_HEIGHT = 160
/** Width of one character of an airport code in the expanded bold face. */
const CODE_CHAR_WIDTH = 10.5
/** Past this distance the scale bar says little, so it only shows once the map is zoomed in. */
const MAX_SCALE_KM = 1000
/** A fitted route never zooms in past this share of the home sheet, so short hops keep their surroundings. */
const MIN_FIT_SPAN = 0.32
/** Arcs bow out by this share of their length, to the left of the direction of travel. */
const ARC_BOW = 0.2
const SCALE_STEPS_KM = [50, 100, 200, 500, 1000, 2000, 5000]
const EARTH_RADIUS_KM = 6371

const legStyle = (route: MapRoute) => estiloTramo(route.order - 1)

const KIND_LABEL: Record<MapRoute['kind'], (route: MapRoute) => string> = {
  outbound: () => 'Ida',
  return: () => 'Vuelta',
  leg: (route) => `Tramo ${route.order}`,
}

interface RouteMapProps {
  points: MapPoint[]
  /** Legs to draw, in trip order; the view fits them whenever they change. */
  routes?: MapRoute[]
  /** Makes each airport a link, e.g. to the flights that reach it. */
  onSelectPoint?: (point: MapPoint) => void
  label: string
  className?: string
}

type Vec = [number, number]

interface Arc {
  route: MapRoute
  start: Vec
  control: Vec
  end: Vec
}

export function MapaRutas({ points, routes = [], onSelectPoint, label, className }: RouteMapProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [surfaceRef, size] = useElementSize<HTMLDivElement>()
  const { width, height } = size
  const [fullscreen, setFullscreen] = useState(false)

  // Base projection: the home sheet filling the box at zoom 1; pan and zoom are applied on top.
  const base = useMemo(() => {
    if (!width || !height) return null
    const projection = geoMercator()
      .precision(0.2)
      .fitExtent(
        [
          [FIT_PADDING, FIT_PADDING],
          [width - FIT_PADDING, height - FIT_PADDING],
        ],
        HOME_SHEET,
      )
    const path = geoPath(projection)
    const world = projectBounds(projection, WORLD)
    const minK = Math.min(width / (world[1][0] - world[0][0]), height / (world[1][1] - world[0][1]))
    return {
      projection,
      world,
      limits: { minK, maxK: MAX_ZOOM, world },
      graticule: path(graticule) ?? '',
      countries: countries.features.map((country, index) => ({
        key: index,
        id: String(country.id),
        d: path(country) ?? '',
      })),
      provinces: path(provinces) ?? '',
    }
  }, [width, height])

  const { view, flyTo, zoomIn, zoomOut, gestureHandlers, onKeyDown, wheelHint } = useMapView(
    surfaceRef,
    size,
    base?.limits ?? null,
    // La rueda acerca y aleja directo sobre el mapa: está fijo al costado, así que no compite con el scroll.
    true,
  )

  const at = (point: MapPoint): Vec => base?.projection([point.lon, point.lat]) ?? [0, 0]
  const arcs: Arc[] = base ? routes.map((route) => arcOf(route, at(route.from), at(route.to))) : []

  // What "fit" means: the drawn route with its bow, or every destination when there is no route.
  const fitTarget = (): MapView | null => {
    if (!base) return null
    const spots = arcs.length ? arcs.flatMap((arc) => [arc.start, arc.end, apex(arc)]) : points.map(at)
    if (spots.length === 0)
      return fitBounds(
        projectBounds(base.projection, [
          [-82, -56],
          [-36, -8],
        ]),
        width,
        height,
        0,
        base.limits,
      )
    const minSpan = MIN_FIT_SPAN * Math.min(width, height)
    const legend = routes.length ? routes.length * LEGEND_ROW + 16 : 0
    return fitBounds(boundsOf(spots, minSpan), width, height, FIT_PADDING, base.limits, legend)
  }
  const fit = (animate = true) => {
    const target = fitTarget()
    if (target) flyTo(target, animate)
  }

  // Refit when the route changes (animated) or the box resizes (at once).
  const routeKey = routes.map((route) => route.id).join('|')
  const pointKey = points.map((point) => point.code).join('|')
  const sized = useRef('')
  useEffect(() => {
    if (!base) return
    const sizeKey = `${width}x${height}`
    const resized = sized.current !== sizeKey
    sized.current = sizeKey
    fit(!resized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, routeKey, pointKey])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () =>
    document.fullscreenElement ? void document.exitFullscreen() : void frameRef.current?.requestFullscreen()

  const toScreen = ([bx, by]: Vec): Vec => [bx * view.k + view.x, by * view.k + view.y]
  const labels = base ? placeLabels(points, routes, (point) => toScreen(at(point)), width, height) : []
  const selectable = onSelectPoint && routes.length === 0
  const scale = base ? scaleBar(base.projection, view, width, height) : null

  return (
    <div
      ref={frameRef}
      className={cn('relative overflow-hidden bg-water-100', fullscreen ? 'rounded-none border-0' : className)}
    >
      <div
        ref={surfaceRef}
        tabIndex={0}
        role="group"
        aria-roledescription="mapa"
        aria-label={`${label}. Arrastrá o usá las flechas para moverlo, y la rueda, + o − para acercar o alejar.`}
        className={cn(
          'absolute inset-0 cursor-grab outline-none select-none focus-visible:ring-2 focus-visible:ring-shield-600 focus-visible:ring-inset active:cursor-grabbing',
          fullscreen ? 'touch-none' : 'touch-pan-y',
        )}
        onKeyDown={(event) => onKeyDown(event, () => fit())}
        {...gestureHandlers}
      >
        {base && (
          <svg width={width} height={height} aria-hidden className="absolute inset-0">
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <path
                d={base.graticule}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className="stroke-water-400/25"
                strokeWidth={0.6}
              />
              {base.countries.map((country) => (
                <path
                  key={country.key}
                  d={country.d}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={country.id === ARGENTINA_ID ? 1 : 0.5}
                  className={country.id === ARGENTINA_ID ? 'fill-home stroke-home-edge' : 'fill-land stroke-land-edge'}
                />
              ))}
              {/* Provinces, so a trip inside Argentina reads as going from one province to another. */}
              <path
                d={base.provinces}
                fill="none"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                strokeWidth={0.6}
                className="stroke-home-edge/60"
              />
            </g>

            {arcs.map((arc) => (
              <RouteArc key={arc.route.id} arc={arc} toScreen={toScreen} numbered={arcs.length > 1} />
            ))}

            {labels.map((item) => (
              <PointMark
                key={item.point.code}
                {...item}
                onSelect={selectable ? () => onSelectPoint(item.point) : undefined}
              />
            ))}

            {scale && (
              <g transform={`translate(${width - scale.width - 16} ${height - 18})`} className="text-ink-700">
                <rect width={scale.width / 2} height={4} className="fill-ink-900" />
                <rect x={scale.width / 2} width={scale.width / 2} height={4} className="fill-sheet stroke-ink-900" />
                <text y={-6} className="fill-current text-[10px] font-semibold font-condensed">
                  0
                </text>
                <text
                  x={scale.width}
                  y={-6}
                  textAnchor="end"
                  className="fill-current text-[10px] font-semibold font-condensed"
                >
                  {scale.km.toLocaleString('es-AR')} km
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-lg border border-ink-200 bg-sheet shadow-sheet">
        <MapButton label="Acercar" onClick={zoomIn}>
          <Plus className="size-4" />
        </MapButton>
        <MapButton label="Alejar" onClick={zoomOut}>
          <Minus className="size-4" />
        </MapButton>
        <MapButton label={routes.length ? 'Ver la ruta completa' : 'Ver todos los destinos'} onClick={() => fit()}>
          <LocateFixed className="size-4" />
        </MapButton>
        <MapButton label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </MapButton>
      </div>

      {selectable && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-ink-200 bg-sheet/95 px-3 py-1.5 text-[12px] font-semibold text-ink-700 shadow-sheet">
          Elegí un destino para ver sus vuelos
        </p>
      )}

      {routes.length > 0 && (
        <ol className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-9rem)] flex-col gap-1 rounded-lg border border-ink-200 bg-sheet/95 px-3 py-2 text-[12px] shadow-sheet">
          {routes.map((route) => (
            <li key={route.id} className="flex items-center gap-2" data-numeric>
              <span aria-hidden className={cn('h-[3px] w-5 shrink-0 rounded-full', legStyle(route).swatch)} />
              <span className="font-bold">{KIND_LABEL[route.kind](route)}</span>
              <span className="truncate text-ink-700">
                {route.from.code} → {route.to.code} ·{' '}
                {route.stops === 0 ? 'directo' : `${route.stops} ${route.stops === 1 ? 'escala' : 'escalas'}`}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p
        aria-live="polite"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-lg bg-ink-900/85 px-4 py-2 text-sm font-semibold text-sheet transition-opacity duration-300',
          wheelHint ? 'opacity-100' : 'opacity-0',
        )}
      >
        {wheelHint ? 'Mantené Ctrl y usá la rueda para acercar o alejar' : ''}
      </p>
    </div>
  )
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 cursor-pointer place-items-center border-b border-ink-200 text-ink-900 last:border-b-0 hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-shield-600"
    >
      {children}
    </button>
  )
}

function RouteArc({ arc, toScreen, numbered }: { arc: Arc; toScreen: (point: Vec) => Vec; numbered: boolean }) {
  const [start, control, end] = [arc.start, arc.control, arc.end].map(toScreen)
  const style = legStyle(arc.route)
  const length = Math.hypot(end[0] - start[0], end[1] - start[1])
  const arrowAt = pointOnArc(start, control, end, 0.72)
  const arrowAngle = tangentAngle(start, control, end, 0.72)
  const badge = pointOnArc(start, control, end, 0.5)

  return (
    <g>
      <path
        d={`M${start} Q${control} ${end}`}
        fill="none"
        strokeWidth={7}
        strokeLinecap="round"
        className="stroke-water-100/80"
      />
      <path
        d={`M${start} Q${control} ${end}`}
        pathLength={1}
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        className={cn('animate-draw-route', style.stroke)}
      />
      {length > 48 && (
        <g transform={`translate(${arrowAt}) rotate(${arrowAngle})`} className="animate-route-mark">
          <path
            d="M-6,-6 L5,0 L-6,6 L-3,0 Z"
            strokeWidth={1.5}
            strokeLinejoin="round"
            className={cn(style.fill, 'stroke-sheet')}
          />
        </g>
      )}
      {numbered && length > 48 && (
        <g transform={`translate(${badge})`} className="animate-route-mark">
          <circle r={9} strokeWidth={2} className={cn('fill-sheet', style.stroke)} />
          <text y={4} textAnchor="middle" className="fill-ink-900 text-[11px] font-extrabold">
            {arc.route.order}
          </text>
        </g>
      )}
    </g>
  )
}

interface PlacedPoint {
  point: MapPoint
  x: number
  y: number
  /** Where the label sits, or null when it would cover another one. */
  side: Side | null
  role: 'origin' | 'route' | 'other'
}

type Side = 'right' | 'left' | 'above' | 'below'
type Box = [number, number, number, number]

const LABEL_OFFSET: Record<Side, { x: number; y: number; anchor: 'start' | 'end' | 'middle' }> = {
  right: { x: 10, y: 4, anchor: 'start' },
  left: { x: -10, y: 4, anchor: 'end' },
  above: { x: 0, y: -9, anchor: 'middle' },
  below: { x: 0, y: 17, anchor: 'middle' },
}

function PointMark({ point, x, y, side, role, onSelect }: PlacedPoint & { onSelect?: () => void }) {
  const onRoute = role !== 'other'
  const offset = LABEL_OFFSET[side ?? 'right']
  const halo = 'stroke-water-100 [paint-order:stroke]'
  return (
    <g transform={`translate(${x} ${y})`} onClick={onSelect} className={cn(onSelect && 'group/point cursor-pointer')}>
      <title>{onSelect ? `Ver vuelos a ${point.city} (${point.code})` : `${point.city} (${point.code})`}</title>
      {/* A larger invisible target, so small dots are easy to hit. */}
      {onSelect && <circle r={12} className="fill-transparent" />}
      <circle
        r={onRoute ? 5.5 : 3.5}
        strokeWidth={onRoute ? 2.5 : 1.5}
        className={cn(
          role === 'origin' ? 'fill-ink-900 stroke-sheet' : 'fill-sheet',
          role === 'route' && 'stroke-route-500',
          role === 'other' && 'stroke-ink-900 group-hover/point:fill-route-500 group-hover/point:stroke-route-600',
        )}
      />
      {side && (
        <text x={offset.x} y={onRoute ? 0 : offset.y} textAnchor={offset.anchor} strokeWidth={3} className={halo}>
          <tspan className="fill-ink-900 text-[12px] font-extrabold font-expanded group-hover/point:fill-route-600">
            {point.code}
          </tspan>
          {onRoute && (
            <tspan x={offset.x} dy={13} className="fill-ink-700 text-[11px] font-semibold">
              {point.city}
              {role === 'origin' ? ' · salida' : ''}
            </tspan>
          )}
        </text>
      )}
    </g>
  )
}

/**
 * Route airports first, then the rest. Each label tries the right, left, above and below its dot,
 * and is left out (the dot keeps its tooltip, and the label returns on zoom) when every side covers something.
 */
function placeLabels(
  points: MapPoint[],
  routes: MapRoute[],
  toScreen: (point: MapPoint) => Vec,
  width: number,
  height: number,
): PlacedPoint[] {
  const routeCodes = new Set(routes.flatMap((route) => [route.from.code, route.to.code]))
  const originCode = routes[0]?.from.code
  // Route airports may be missing from `points` (e.g. a destination filtered out); add them back.
  const all = new Map(points.map((point) => [point.code, point]))
  for (const route of routes) for (const point of [route.from, route.to]) all.set(point.code, point)

  // With a route on screen, only its airports are drawn: the rest of the catalog is noise there.
  const shown = routes.length ? [...all.values()].filter((point) => routeCodes.has(point.code)) : [...all.values()]
  const located = shown
    .map((point) => ({ point, at: toScreen(point) }))
    .filter(({ at: [x, y] }) => x >= -20 && y >= -20 && x <= width + 20 && y <= height + 20)
    .sort((a, b) => Number(routeCodes.has(b.point.code)) - Number(routeCodes.has(a.point.code)))

  // Every dot, the map controls and the legend block labels from the start.
  const taken: Box[] = [
    ...located.map(({ at: [x, y] }): Box => [x - 6, y - 6, x + 6, y + 6]),
    [width - CONTROLS_WIDTH, 0, width, CONTROLS_HEIGHT],
  ]
  if (routes.length) taken.push([0, height - routes.length * LEGEND_ROW - 28, LEGEND_WIDTH, height])

  const placed = located.map(({ point, at: [x, y] }): PlacedPoint => {
    const role = point.code === originCode ? 'origin' : routeCodes.has(point.code) ? 'route' : 'other'
    const onRoute = role !== 'other'
    const codeWidth = point.code.length * CODE_CHAR_WIDTH
    const labelWidth = Math.max(codeWidth, onRoute ? point.city.length * 6.4 + (role === 'origin' ? 44 : 0) : 0)
    const [top, bottom] = onRoute ? [y - 10, y + 18] : [y - 8, y + 8]
    const boxes: Record<Side, Box> = {
      right: [x + 7, top, x + 12 + labelWidth, bottom],
      left: [x - 12 - labelWidth, top, x - 7, bottom],
      above: [x - codeWidth / 2 - 2, y - 22, x + codeWidth / 2 + 2, y - 6],
      below: [x - codeWidth / 2 - 2, y + 6, x + codeWidth / 2 + 2, y + 22],
    }
    const candidates: Side[] = onRoute ? ['right', 'left'] : ['right', 'left', 'above', 'below']
    const fits = (box: Box) => box[0] >= 4 && box[2] <= width - 4 && box[1] >= 4 && box[3] <= height - 4
    const free = (box: Box) => fits(box) && !taken.some((other) => overlaps(other, box))
    const side = candidates.find((candidate) => free(boxes[candidate])) ?? null
    if (side) taken.push(boxes[side])
    return { point, x, y, side, role }
  })
  // Draw the less important points first so route airports sit on top.
  return placed.reverse()
}

function overlaps(a: Box, b: Box) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
}

function arcOf(route: MapRoute, start: Vec, end: Vec): Arc {
  const [dx, dy] = [end[0] - start[0], end[1] - start[1]]
  // Bow to the left of travel: the way out and the way back form a lens instead of one shared line.
  const control: Vec = [(start[0] + end[0]) / 2 + dy * ARC_BOW, (start[1] + end[1]) / 2 - dx * ARC_BOW]
  return { route, start, control, end }
}

const apex = (arc: Arc): Vec => pointOnArc(arc.start, arc.control, arc.end, 0.5)

function pointOnArc(start: Vec, control: Vec, end: Vec, t: number): Vec {
  const u = 1 - t
  return [
    u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
    u * u * start[1] + 2 * u * t * control[1] + t * t * end[1],
  ]
}

function tangentAngle(start: Vec, control: Vec, end: Vec, t: number): number {
  const dx = 2 * (1 - t) * (control[0] - start[0]) + 2 * t * (end[0] - control[0])
  const dy = 2 * (1 - t) * (control[1] - start[1]) + 2 * t * (end[1] - control[1])
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

function boundsOf(spots: Vec[], minSpan: number): Bounds {
  const xs = spots.map(([x]) => x)
  const ys = spots.map(([, y]) => y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const growX = Math.max(0, minSpan - (x1 - x0)) / 2
  const growY = Math.max(0, minSpan - (y1 - y0)) / 2
  return [
    [x0 - growX, y0 - growY],
    [x1 + growX, y1 + growY],
  ]
}

function projectBounds(projection: GeoProjection, [[west, south], [east, north]]: [Vec, Vec]): Bounds {
  const [x0, y1] = projection([west, south]) ?? [0, 0]
  const [x1, y0] = projection([east, north]) ?? [0, 0]
  return [
    [x0, y0],
    [x1, y1],
  ]
}

/** A round distance whose bar is 50–130 px long at the latitude in the middle of the view. */
function scaleBar(projection: GeoProjection, view: MapView, width: number, height: number) {
  const center = projection.invert?.([(width / 2 - view.x) / view.k, (height / 2 - view.y) / view.k])
  if (!center) return null
  const pixelsPerKm = (projection.scale() * view.k) / (EARTH_RADIUS_KM * Math.cos((center[1] * Math.PI) / 180))
  const km = SCALE_STEPS_KM.find((step) => step * pixelsPerKm >= 50) ?? SCALE_STEPS_KM.at(-1)!
  const barWidth = km * pixelsPerKm
  return barWidth <= 160 && km <= MAX_SCALE_KM ? { km, width: barWidth } : null
}
