import type { InertiaState } from './interaction'
import type { ArcData, RippleData, WebGLGlobeContext } from './types'
import * as twgl from 'twgl.js'
import { ref, shallowRef } from 'vue'
import { parseColor } from './color'
import { createArcGeometry, latLngToXYZ } from './geometry'
import { setupGlobeInteraction } from './interaction'
import {
  arcFragmentShader,
  arcVertexShader,
  earthFragmentShader,
  earthVertexShader,
  rippleFragmentShader,
  rippleVertexShader,
} from './shaders'
import { createCountryTexture } from './texture'

export type { ArcData, RippleData, WebGLGlobeContext }

const m4 = twgl.m4

function deleteBufferInfo(gl: WebGLRenderingContext, bufferInfo: twgl.BufferInfo) {
  if (bufferInfo.attribs) {
    for (const attrib of Object.values(bufferInfo.attribs)) {
      if (attrib.buffer)
        gl.deleteBuffer(attrib.buffer)
    }
  }
  if (bufferInfo.indices)
    gl.deleteBuffer(bufferInfo.indices)
}

const INTRO_SPIN_DURATION = 1000

// Cached MAX_VERTEX_ATTRIBS per WebGL context (WeakMap avoids memory leaks)
const maxAttribsCache = new WeakMap<WebGLRenderingContext, number>()

function disableAllAttribs(gl: WebGLRenderingContext) {
  let maxAttribs = maxAttribsCache.get(gl)
  if (maxAttribs === undefined) {
    maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number
    maxAttribsCache.set(gl, maxAttribs)
  }
  for (let i = 0; i < maxAttribs; i++) {
    gl.disableVertexAttribArray(i)
  }
}

// Monotonic version counter for texture cache invalidation
let textureVersion = 0

interface ArcAnimation {
  data: ArcData
  startTime: number
  duration: number
  bufferInfo: twgl.BufferInfo
  vertexCount: number
  color: [number, number, number]
}

interface RippleAnimation {
  data: RippleData
  startTime: number
  color: [number, number, number]
}

export function useWebGLGlobe(ctx: WebGLGlobeContext) {
  // Reactive state
  const longitude = ref(0)
  const latitude = ref(0)
  const zoom = ref(0)
  const isAutoRotating = ref(true)
  const isDragging = ref(false)
  const isReady = ref(false)

  // WebGL state
  let gl: WebGLRenderingContext | null = null
  let earthProgram: twgl.ProgramInfo | null = null
  let arcProgram: twgl.ProgramInfo | null = null
  let rippleProgram: twgl.ProgramInfo | null = null
  let earthBufferInfo: twgl.BufferInfo | null = null
  let countryTexture: WebGLTexture | null = null
  let animationFrameId: number | null = null
  let cleanupInteraction: (() => void) | null = null

  // Inertia (shared between interaction and render loop)
  const inertia: InertiaState = { velocityX: 0, velocityY: 0, isActive: false }

  // Intro spin animation
  let introSpinActive = false
  let introSpinStartTime = 0
  let introTargetLat = 0
  let introTargetLng = 0
  let introStartLng = 0
  let introStartLat = 0

  // Active animations
  const activeArcs = shallowRef<ArcAnimation[]>([])
  const activeRipples = shallowRef<RippleAnimation[]>([])

  // Reusable ripple buffer
  let rippleBufferInfo: twgl.BufferInfo | null = null
  const ripplePositionData = new Float32Array(3)

  // Sphere geometry (loaded async from prebuilt binary)
  let sphereGeometry: { position: Float32Array, texcoord: Float32Array, indices: Uint16Array } | null = null

  // Texture cache version
  let lastTextureVersion = -1

  // Render timing
  let lastFrameTime = 0

  // ============================================================================
  // Camera
  // ============================================================================

  function getCameraValues() {
    const w = ctx.width.value
    const h = ctx.height.value
    const aspect = w / h

    const fov = (30 * Math.PI / 180) / Math.min(aspect, 1.0)
    const projection = m4.perspective(fov, aspect, 0.01, 10)

    const baseDistance = 1 / Math.tan(0.8 * fov / 2)
    const distance = baseDistance * (1 - zoom.value * 0.7)
    let camera = m4.identity()
    camera = m4.rotateY(camera, (longitude.value + 180) * Math.PI / 180)
    camera = m4.rotateX(camera, latitude.value * Math.PI / 180)

    const eye = m4.transformPoint(camera, [0, 0, -distance]) as number[]
    const up = m4.transformPoint(camera, [0, 1, 0]) as number[]
    const view = m4.inverse(m4.lookAt(eye, [0, 0, 0], up))

    return { view, projection, eye }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async function init() {
    const canvas = ctx.canvasRef.value
    if (!canvas)
      return false

    // Load prebuilt sphere geometry
    if (!sphereGeometry) {
      const buf = await $fetch<ArrayBuffer>('/sphere.bin', { responseType: 'arrayBuffer' })
      const header = new Uint32Array(buf, 0, 3)
      let offset = 12
      const position = new Float32Array(buf, offset, header[0]! / 4)
      offset += header[0]!
      const texcoord = new Float32Array(buf, offset, header[1]! / 4)
      offset += header[1]!
      const indices = new Uint16Array(buf, offset, header[2]! / 2)
      sphereGeometry = { position, texcoord, indices }
    }

    gl = canvas.getContext('webgl', { alpha: true, antialias: true })
    if (!gl) {
      console.error('WebGL not supported')
      return false
    }

    earthProgram = twgl.createProgramInfo(gl, [earthVertexShader, earthFragmentShader])
    arcProgram = twgl.createProgramInfo(gl, [arcVertexShader, arcFragmentShader])
    rippleProgram = twgl.createProgramInfo(gl, [rippleVertexShader, rippleFragmentShader])

    earthBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 3, data: sphereGeometry.position },
      texcoord: { numComponents: 2, data: sphereGeometry.texcoord },
      indices: { numComponents: 3, data: sphereGeometry.indices },
    })

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.clearColor(0, 0, 0, 0)

    const textures = twgl.createTextures(gl, {
      placeholder: { min: gl.LINEAR, mag: gl.LINEAR, width: 1, height: 1, src: [0, 0, 0, 0] },
    })
    countryTexture = textures.placeholder ?? null

    cleanupInteraction = setupGlobeInteraction(canvas, {
      longitude,
      latitude,
      zoom,
      isDragging,
      stopAutoRotate,
    }, inertia)

    isReady.value = true
    return true
  }

  function updateCanvasSize() {
    const canvas = ctx.canvasRef.value
    if (!canvas || !gl)
      return

    const w = ctx.width.value
    const h = ctx.height.value
    const dpr = window.devicePixelRatio || 1

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  async function updateCountryTexture() {
    if (!gl || !isReady.value)
      return

    const containerSize = Math.max(ctx.width.value, ctx.height.value)
    if (containerSize < 1) {
      // Retry once when container size becomes available
      const unwatch = watch([ctx.width, ctx.height], () => {
        if (Math.max(ctx.width.value, ctx.height.value) >= 1) {
          unwatch()
          updateCountryTexture()
        }
      })
      return
    }

    const currentVersion = ++textureVersion
    lastTextureVersion = currentVersion

    const countries = ctx.countries.value
    const stats = ctx.countryStats.value
    const max = ctx.maxCountryVisits.value
    const tiers = ctx.countryColorTiers.value
    const colors = ctx.colors.value
    const locs = ctx.locations.value
    const high = ctx.highest.value
    const heatTiers = ctx.heatmapColorTiers.value

    // Keep old texture reference for delayed replacement
    const oldTexture = countryTexture

    const newTexture = await createCountryTexture(
      gl,
      countries,
      stats,
      max,
      tiers,
      colors.globeFill,
      locs,
      high,
      heatTiers,
      containerSize,
    )

    // Guard: gl may have been destroyed during async texture creation
    if (!gl || !isReady.value) {
      if (newTexture) {
        // Context destroyed, but we still have a reference - can't delete without gl
        // Just discard the reference; browser will GC the texture
      }
      return
    }

    // Discard stale result if a newer update was triggered
    if (lastTextureVersion !== currentVersion) {
      if (newTexture)
        gl.deleteTexture(newTexture)
      return
    }

    // Replace texture: assign new first, then delete old (avoids blank frame)
    countryTexture = newTexture
    if (oldTexture && oldTexture !== newTexture) {
      gl.deleteTexture(oldTexture)
    }
  }

  // ============================================================================
  // Auto Rotation
  // ============================================================================

  function startAutoRotate() {
    isAutoRotating.value = true
  }

  function stopAutoRotate() {
    isAutoRotating.value = false
  }

  // ============================================================================
  // Arc and Ripple
  // ============================================================================

  function drawArc(arcData: ArcData, duration: number = 2000) {
    if (!gl)
      return

    const color = arcData.color ? parseColor(arcData.color) : [1.0, 0.6, 0.2] as [number, number, number]

    const geom = createArcGeometry(
      arcData.startLat,
      arcData.startLng,
      arcData.endLat,
      arcData.endLng,
      50,
      1,
    )

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 3, data: geom.positions },
      alpha: { numComponents: 1, data: geom.alphas },
      dashParam: { numComponents: 1, data: geom.dashParams },
    })

    activeArcs.value = [...activeArcs.value, {
      data: arcData,
      startTime: performance.now(),
      duration,
      bufferInfo,
      vertexCount: geom.positions.length / 3,
      color,
    }]
  }

  function drawRipple(rippleData: RippleData) {
    const color = rippleData.color ? parseColor(rippleData.color) : [1.0, 0.6, 0.2] as [number, number, number]

    activeRipples.value = [...activeRipples.value, {
      data: rippleData,
      startTime: performance.now(),
      color,
    }]
  }

  // ============================================================================
  // Render Loop
  // ============================================================================

  function render() {
    if (!gl || !earthProgram || !earthBufferInfo || !countryTexture)
      return

    const w = ctx.width.value
    const h = ctx.height.value
    if (w < 2 || h < 2)
      return

    const now = performance.now()
    const dt = lastFrameTime > 0 ? Math.min((now - lastFrameTime) / 1000, 0.1) : 0.016
    lastFrameTime = now

    // Intro spin animation
    if (introSpinActive) {
      const elapsed = now - introSpinStartTime
      const t = Math.min(elapsed / INTRO_SPIN_DURATION, 1)
      const eased = 1 - (1 - t) ** 3
      longitude.value = introStartLng + (introTargetLng - introStartLng) * eased
      latitude.value = introStartLat + (introTargetLat - introStartLat) * eased

      if (t >= 1) {
        introSpinActive = false
        longitude.value = introTargetLng
        latitude.value = introTargetLat
        isAutoRotating.value = true
      }
    }

    // Auto-rotate
    if (isAutoRotating.value && !introSpinActive) {
      longitude.value = ((longitude.value - 9 * dt) % 360 + 540) % 360 - 180
    }

    // Inertia decay
    if (inertia.isActive) {
      const decay = Math.exp(-3.0 * dt)
      inertia.velocityX *= decay
      inertia.velocityY *= decay

      const zoomFactor = 1 - zoom.value * 0.8
      const dtMs = dt * 1000
      longitude.value = ((longitude.value - inertia.velocityX * dtMs * 0.3 * zoomFactor) % 360 + 540) % 360 - 180
      latitude.value = Math.max(-85, Math.min(85, latitude.value + inertia.velocityY * dtMs * 0.3 * zoomFactor))

      if (Math.abs(inertia.velocityX) < 0.001 && Math.abs(inertia.velocityY) < 0.001) {
        inertia.isActive = false
      }
    }

    const { view, projection, eye } = getCameraValues()
    const model = m4.identity()

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Draw earth
    disableAllAttribs(gl)
    gl.useProgram(earthProgram.program)
    twgl.setBuffersAndAttributes(gl, earthProgram, earthBufferInfo)
    twgl.setUniforms(earthProgram, { model, view, projection, u_countryTexture: countryTexture })
    twgl.drawBufferInfo(gl, earthBufferInfo)

    // Draw arcs (ribbon triangle strips)
    if (arcProgram && activeArcs.value.length > 0) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.depthMask(false)
      gl.disable(gl.CULL_FACE)

      const newArcs: ArcAnimation[] = []
      for (const arc of activeArcs.value) {
        const elapsed = now - arc.startTime
        const progress = Math.min(elapsed / arc.duration, 1)

        if (progress < 1 || elapsed < arc.duration + 500) {
          const fadeProgress = progress >= 1 ? 1 - (elapsed - arc.duration) / 500 : 1
          // Each arc point produces 2 vertices; ensure even count for triangle strip
          let visibleVerts = Math.floor(arc.vertexCount * Math.min(progress, 1))
          visibleVerts = visibleVerts & ~1

          if (visibleVerts >= 4) {
            disableAllAttribs(gl!)
            gl!.useProgram(arcProgram!.program)
            twgl.setBuffersAndAttributes(gl!, arcProgram!, arc.bufferInfo)
            twgl.setUniforms(arcProgram!, { model, view, projection, u_color: arc.color, u_fade: fadeProgress, u_dashCount: 8.0, u_dashRatio: 0.8 })
            gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, visibleVerts)
          }
          newArcs.push(arc)
        }
        else {
          // Release GPU buffers for expired arcs
          deleteBufferInfo(gl!, arc.bufferInfo)
        }
      }

      activeArcs.value = newArcs
      gl.enable(gl.CULL_FACE)
      gl.depthMask(true)
      gl.disable(gl.BLEND)
    }

    // Draw ripples (depth test off — shader backface check handles occlusion)
    if (rippleProgram && activeRipples.value.length > 0) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.disable(gl.DEPTH_TEST)

      if (!rippleBufferInfo) {
        rippleBufferInfo = twgl.createBufferInfoFromArrays(gl, {
          position: { numComponents: 3, data: ripplePositionData },
        })
      }

      const newRipples: RippleAnimation[] = []
      for (const ripple of activeRipples.value) {
        const elapsed = now - ripple.startTime
        const duration = ripple.data.duration ?? 1500
        const progress = elapsed / duration

        if (progress < 1) {
          const maxRadius = ripple.data.maxRadius ?? 6
          const projectedGlobeRadius = h * 0.4
          const maxSize = maxRadius * projectedGlobeRadius * Math.PI / 180 * 4
          const currentSize = Math.max(12, maxSize * progress)
          const alpha = 1.0 - progress

          const pos = latLngToXYZ(ripple.data.lat, ripple.data.lng, 1.005)
          ripplePositionData[0] = pos[0]
          ripplePositionData[1] = pos[1]
          ripplePositionData[2] = pos[2]

          const posAttrib = rippleBufferInfo!.attribs?.position
          if (posAttrib) {
            gl!.bindBuffer(gl!.ARRAY_BUFFER, posAttrib.buffer)
            gl!.bufferData(gl!.ARRAY_BUFFER, ripplePositionData, gl!.DYNAMIC_DRAW)
          }

          disableAllAttribs(gl!)
          gl!.useProgram(rippleProgram!.program)
          twgl.setBuffersAndAttributes(gl!, rippleProgram!, rippleBufferInfo!)
          twgl.setUniforms(rippleProgram!, {
            model,
            view,
            projection,
            u_pointSize: currentSize,
            u_color: ripple.color,
            u_eye: eye,
            u_alpha: Math.min(alpha, 1.0),
            u_ringWidth: 0.25 + 0.15 * (1 - progress),
          })

          gl!.drawArrays(gl!.POINTS, 0, 1)
          newRipples.push(ripple)
        }
      }

      activeRipples.value = newRipples
      gl.enable(gl.DEPTH_TEST)
      gl.disable(gl.BLEND)
    }
  }

  function startRenderLoop() {
    if (animationFrameId !== null)
      return

    function loop() {
      render()
      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
  }

  function stopRenderLoop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  function setPointOfView(lat: number, lng: number, animate: boolean = false) {
    const targetLat = Math.max(-85, Math.min(85, lat))
    const targetLng = lng

    if (animate) {
      introSpinActive = true
      introSpinStartTime = performance.now()
      introStartLng = targetLng + 360
      introStartLat = targetLat
      introTargetLng = targetLng
      introTargetLat = targetLat
      longitude.value = introStartLng
      latitude.value = introStartLat
      isAutoRotating.value = false
    }
    else {
      latitude.value = targetLat
      longitude.value = targetLng
    }
  }

  function destroy() {
    stopRenderLoop()
    stopAutoRotate()
    isReady.value = false

    if (cleanupInteraction) {
      cleanupInteraction()
      cleanupInteraction = null
    }

    if (gl) {
      // Release arc buffers
      for (const arc of activeArcs.value) {
        deleteBufferInfo(gl, arc.bufferInfo)
      }
      activeArcs.value = []
      activeRipples.value = []

      // Release ripple buffer
      if (rippleBufferInfo) {
        deleteBufferInfo(gl, rippleBufferInfo)
        rippleBufferInfo = null
      }

      // Release earth geometry buffer
      if (earthBufferInfo) {
        deleteBufferInfo(gl, earthBufferInfo)
        earthBufferInfo = null
      }

      // Release textures
      if (countryTexture) {
        gl.deleteTexture(countryTexture)
        countryTexture = null
      }

      // Release shader programs
      if (earthProgram) {
        gl.deleteProgram(earthProgram.program)
        earthProgram = null
      }
      if (arcProgram) {
        gl.deleteProgram(arcProgram.program)
        arcProgram = null
      }
      if (rippleProgram) {
        gl.deleteProgram(rippleProgram.program)
        rippleProgram = null
      }

      gl = null
    }
  }

  return {
    longitude,
    latitude,
    zoom,
    isAutoRotating,
    isDragging,
    isReady,

    init,
    updateCanvasSize,
    updateCountryTexture,
    setPointOfView,
    startAutoRotate,
    stopAutoRotate,
    drawArc,
    drawRipple,
    startRenderLoop,
    stopRenderLoop,
    destroy,

    hasActiveAnimations: () => activeArcs.value.length > 0 || activeRipples.value.length > 0,
  }
}
