import type { Ref } from 'vue'

export interface InertiaState {
  velocityX: number
  velocityY: number
  isActive: boolean
}

export interface InteractionContext {
  longitude: Ref<number>
  latitude: Ref<number>
  zoom: Ref<number>
  isDragging: Ref<boolean>
  stopAutoRotate: () => void
}

export function setupGlobeInteraction(
  canvas: HTMLCanvasElement,
  ctx: InteractionContext,
  inertia: InertiaState,
): () => void {
  let lastMouseX = 0
  let lastMouseY = 0
  let lastTouchX = 0
  let lastTouchY = 0
  let lastDragTime = 0

  function stopInertia() {
    inertia.isActive = false
    inertia.velocityX = 0
    inertia.velocityY = 0
  }

  function startInertia() {
    if (Math.abs(inertia.velocityX) > 0.01 || Math.abs(inertia.velocityY) > 0.01) {
      inertia.isActive = true
    }
  }

  function applyDrag(deltaX: number, deltaY: number, sensitivity: number) {
    const now = performance.now()
    const dt = now - lastDragTime
    if (dt > 0 && dt < 100) {
      inertia.velocityX = deltaX / dt
      inertia.velocityY = deltaY / dt
    }
    lastDragTime = now

    const zoomFactor = 1 - ctx.zoom.value * 0.8
    ctx.longitude.value = ((ctx.longitude.value - deltaX * sensitivity * zoomFactor) % 360 + 540) % 360 - 180
    ctx.latitude.value = Math.max(-85, Math.min(85, ctx.latitude.value + deltaY * sensitivity * zoomFactor))
  }

  const onMouseDown = (e: MouseEvent) => {
    ctx.isDragging.value = true
    lastMouseX = e.screenX
    lastMouseY = e.screenY
    lastDragTime = performance.now()
    ctx.stopAutoRotate()
    stopInertia()
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!ctx.isDragging.value)
      return
    const deltaX = e.screenX - lastMouseX
    const deltaY = e.screenY - lastMouseY
    lastMouseX = e.screenX
    lastMouseY = e.screenY
    applyDrag(deltaX, deltaY, 0.3)
  }

  const onMouseUp = () => {
    if (!ctx.isDragging.value)
      return
    ctx.isDragging.value = false
    startInertia()
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    let amount = -e.deltaY * 0.001
    if ((e as any).mozInputSource === 1 && e.deltaMode === 1) {
      amount *= 50
    }
    ctx.zoom.value = Math.max(0, Math.min(1, ctx.zoom.value + amount))
    ctx.stopAutoRotate()
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      ctx.isDragging.value = true
      lastTouchX = e.touches[0]!.clientX
      lastTouchY = e.touches[0]!.clientY
      lastDragTime = performance.now()
      ctx.stopAutoRotate()
      stopInertia()
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!ctx.isDragging.value || e.touches.length !== 1)
      return
    const deltaX = e.touches[0]!.clientX - lastTouchX
    const deltaY = e.touches[0]!.clientY - lastTouchY
    lastTouchX = e.touches[0]!.clientX
    lastTouchY = e.touches[0]!.clientY
    applyDrag(deltaX, deltaY, 0.5)
  }

  const onTouchEnd = () => {
    if (!ctx.isDragging.value)
      return
    ctx.isDragging.value = false
    startInertia()
  }

  canvas.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart)
  canvas.addEventListener('touchmove', onTouchMove)
  canvas.addEventListener('touchend', onTouchEnd)

  return () => {
    stopInertia()
    canvas.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
  }
}
