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
  resetView: () => void
  requestRender: () => void
  reducedMotion: Ref<boolean>
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
    if (ctx.reducedMotion.value)
      return
    if (Math.abs(inertia.velocityX) > 0.01 || Math.abs(inertia.velocityY) > 0.01) {
      inertia.isActive = true
      ctx.requestRender()
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
    ctx.requestRender()
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0)
      return
    ctx.isDragging.value = true
    lastMouseX = e.screenX
    lastMouseY = e.screenY
    lastDragTime = performance.now()
    ctx.stopAutoRotate()
    stopInertia()
    canvas.focus({ preventScroll: true })
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
    if (document.activeElement !== canvas)
      return
    e.preventDefault()
    let amount = -e.deltaY * 0.001
    if ((e as any).mozInputSource === 1 && e.deltaMode === 1) {
      amount *= 50
    }
    ctx.zoom.value = Math.max(0, Math.min(1, ctx.zoom.value + amount))
    ctx.stopAutoRotate()
    ctx.requestRender()
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
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      ctx.isDragging.value = false
      stopInertia()
      return
    }
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

  const onKeyDown = (e: KeyboardEvent) => {
    const rotationStep = 5
    const zoomStep = 0.1
    if (e.key === 'Escape') {
      canvas.blur()
      return
    }
    if (e.key === 'Home') {
      ctx.resetView()
    }
    else if (e.key === 'ArrowLeft') {
      ctx.longitude.value -= rotationStep
    }
    else if (e.key === 'ArrowRight') {
      ctx.longitude.value += rotationStep
    }
    else if (e.key === 'ArrowUp') {
      ctx.latitude.value = Math.min(85, ctx.latitude.value + rotationStep)
    }
    else if (e.key === 'ArrowDown') {
      ctx.latitude.value = Math.max(-85, ctx.latitude.value - rotationStep)
    }
    else if (e.key === '+' || e.key === '=') {
      ctx.zoom.value = Math.min(1, ctx.zoom.value + zoomStep)
    }
    else if (e.key === '-' || e.key === '_') {
      ctx.zoom.value = Math.max(0, ctx.zoom.value - zoomStep)
    }
    else {
      return
    }
    e.preventDefault()
    ctx.stopAutoRotate()
    stopInertia()
    ctx.requestRender()
  }

  const onWindowBlur = () => {
    ctx.isDragging.value = false
    stopInertia()
  }

  canvas.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart)
  canvas.addEventListener('touchmove', onTouchMove)
  canvas.addEventListener('touchend', onTouchEnd)
  canvas.addEventListener('touchcancel', onTouchEnd)
  canvas.addEventListener('keydown', onKeyDown)
  window.addEventListener('blur', onWindowBlur)

  return () => {
    stopInertia()
    canvas.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    canvas.removeEventListener('touchcancel', onTouchEnd)
    canvas.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('blur', onWindowBlur)
  }
}
