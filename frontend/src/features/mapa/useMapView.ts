import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react'

/** Zoom and pan over the base projection: a base point (bx, by) lands on screen at (bx·k + x, by·k + y). */
export interface MapView {
  k: number
  x: number
  y: number
}

export type Bounds = [[number, number], [number, number]]

interface Limits {
  minK: number
  maxK: number
  /** Base-coordinate box the center of the view must stay inside. */
  world: Bounds
}

const IDENTITY: MapView = { k: 1, x: 0, y: 0 }
const ZOOM_STEP = 1.6
const PAN_STEP = 80
/** Pixels a press must travel before it becomes a drag rather than a click. */
const DRAG_THRESHOLD = 4
const ANIMATION_MS = 650

/**
 * The view that fits `bounds` inside a width × height box with `padding` around it,
 * plus `bottomInset` pixels kept free at the bottom (e.g. for a legend).
 */
export function fitBounds(
  bounds: Bounds,
  width: number,
  height: number,
  padding: number,
  limits: Limits,
  bottomInset = 0,
): MapView {
  const [[x0, y0], [x1, y1]] = bounds
  const k = clamp(
    Math.min((width - padding * 2) / Math.max(x1 - x0, 1), (height - bottomInset - padding * 2) / Math.max(y1 - y0, 1)),
    limits.minK,
    limits.maxK,
  )
  return { k, x: width / 2 - ((x0 + x1) / 2) * k, y: (height - bottomInset) / 2 - ((y0 + y1) / 2) * k }
}

/**
 * Pan and zoom for the route map: drag or two-finger pinch, Ctrl + wheel (plain wheel in full screen),
 * double click, keyboard, and an animated `flyTo` for fitting routes.
 */
export function useMapView(
  surface: RefObject<HTMLDivElement | null>,
  size: { width: number; height: number },
  limits: Limits | null,
  wheelWithoutModifier: boolean,
) {
  const [view, setViewState] = useState<MapView>(IDENTITY)
  const [wheelHint, setWheelHint] = useState(false)
  const viewRef = useRef(view)
  const frame = useRef(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const hintTimer = useRef(0)

  const constrain = useCallback(
    (next: MapView): MapView => {
      if (!limits) return next
      const k = clamp(next.k, limits.minK, limits.maxK)
      const [[wx0, wy0], [wx1, wy1]] = limits.world
      const centerX = clamp((size.width / 2 - next.x) / k, wx0, wx1)
      const centerY = clamp((size.height / 2 - next.y) / k, wy0, wy1)
      return { k, x: size.width / 2 - centerX * k, y: size.height / 2 - centerY * k }
    },
    [limits, size.width, size.height],
  )

  const setView = useCallback(
    (next: MapView) => {
      const constrained = constrain(next)
      viewRef.current = constrained
      setViewState(constrained)
    },
    [constrain],
  )

  const stop = () => cancelAnimationFrame(frame.current)

  const flyTo = useCallback(
    (target: MapView, animate = true) => {
      stop()
      const from = viewRef.current
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!animate || reduced) return setView(target)
      // Interpolate the center in base coordinates and the zoom on a log scale, so it feels like one move.
      const center = (v: MapView) => [(size.width / 2 - v.x) / v.k, (size.height / 2 - v.y) / v.k]
      const [fx, fy] = center(from)
      const [tx, ty] = center(target)
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ANIMATION_MS)
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
        const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e)
        const cx = fx + (tx - fx) * e
        const cy = fy + (ty - fy) * e
        setView({ k, x: size.width / 2 - cx * k, y: size.height / 2 - cy * k })
        if (t < 1) frame.current = requestAnimationFrame(step)
      }
      frame.current = requestAnimationFrame(step)
    },
    [setView, size.width, size.height],
  )

  const zoomAt = useCallback(
    (factor: number, sx = size.width / 2, sy = size.height / 2) => {
      const { k, x, y } = viewRef.current
      const nextK = limits ? clamp(k * factor, limits.minK, limits.maxK) : k * factor
      setView({ k: nextK, x: sx - ((sx - x) / k) * nextK, y: sy - ((sy - y) / k) * nextK })
    },
    [limits, setView, size.width, size.height],
  )

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const { k, x, y } = viewRef.current
      setView({ k, x: x + dx, y: y + dy })
    },
    [setView],
  )

  // The wheel listener must be non-passive to keep the page from scrolling while zooming.
  useEffect(() => {
    const element = surface.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (!wheelWithoutModifier && !event.ctrlKey && !event.metaKey) {
        setWheelHint(true)
        window.clearTimeout(hintTimer.current)
        hintTimer.current = window.setTimeout(() => setWheelHint(false), 1400)
        return
      }
      event.preventDefault()
      stop()
      const rect = element.getBoundingClientRect()
      zoomAt(
        Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0022)),
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [surface, zoomAt, wheelWithoutModifier])

  useEffect(() => () => (stop(), window.clearTimeout(hintTimer.current)), [])

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const gestureHandlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0) return
      stop()
      // No pointer capture yet: a press that doesn't move stays a click on whatever is under it.
      pointers.current.set(event.pointerId, local(event))
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const previous = pointers.current.get(event.pointerId)
      if (!previous) return
      const current = local(event)
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        if (Math.hypot(current.x - previous.x, current.y - previous.y) < DRAG_THRESHOLD) return
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      const others = [...pointers.current].filter(([id]) => id !== event.pointerId).map(([, point]) => point)
      pointers.current.set(event.pointerId, current)
      if (others.length === 0) return panBy(current.x - previous.x, current.y - previous.y)
      // Pinch: zoom by the change in finger distance around the midpoint, and pan with the midpoint.
      const other = others[0]
      const before = Math.hypot(previous.x - other.x, previous.y - other.y)
      const after = Math.hypot(current.x - other.x, current.y - other.y)
      const mid = { x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 }
      panBy((current.x - previous.x) / 2, (current.y - previous.y) / 2)
      if (before > 0) zoomAt(after / before, mid.x, mid.y)
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      pointers.current.delete(event.pointerId)
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) {
      pointers.current.delete(event.pointerId)
    },
    onPointerLeave(event: PointerEvent<HTMLDivElement>) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) pointers.current.delete(event.pointerId)
    },
    onDoubleClick(event: MouseEvent<HTMLDivElement>) {
      const rect = event.currentTarget.getBoundingClientRect()
      zoomAt(event.shiftKey ? 1 / ZOOM_STEP : ZOOM_STEP, event.clientX - rect.left, event.clientY - rect.top)
    },
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, fit: () => void) => {
    const actions: Record<string, () => void> = {
      '+': () => zoomAt(ZOOM_STEP),
      '=': () => zoomAt(ZOOM_STEP),
      '-': () => zoomAt(1 / ZOOM_STEP),
      '0': fit,
      ArrowLeft: () => panBy(PAN_STEP, 0),
      ArrowRight: () => panBy(-PAN_STEP, 0),
      ArrowUp: () => panBy(0, PAN_STEP),
      ArrowDown: () => panBy(0, -PAN_STEP),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    stop()
    action()
  }

  return {
    view,
    flyTo,
    zoomIn: () => zoomAt(ZOOM_STEP),
    zoomOut: () => zoomAt(1 / ZOOM_STEP),
    gestureHandlers,
    onKeyDown,
    wheelHint,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
