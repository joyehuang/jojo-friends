// Renderer, post-processing, lights, sky and the time of day.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export type Level = 'high' | 'medium' | 'low'

const PRESETS: Record<Level, { pixelRatio: number; ao: boolean; bloom: boolean; shadow: number; msaa: number }> = {
  high: { pixelRatio: 2, ao: true, bloom: true, shadow: 4096, msaa: 4 },
  medium: { pixelRatio: 1.5, ao: true, bloom: true, shadow: 2048, msaa: 2 },
  low: { pixelRatio: 1, ao: false, bloom: false, shadow: 1024, msaa: 0 },
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly sun: THREE.DirectionalLight
  readonly hemi: THREE.HemisphereLight
  readonly outline: OutlinePass
  private composer: EffectComposer
  private ao: GTAOPass
  private bloom: UnrealBloomPass
  private sky: THREE.Mesh
  private skyUniforms: { top: { value: THREE.Color }; horizon: { value: THREE.Color }; bottom: { value: THREE.Color }; sunDir: { value: THREE.Vector3 }; sunColor: { value: THREE.Color } }
  level: Level = 'high'
  width = 1
  height = 1
  /** 0 (day) .. 1 (night) */
  night = 0
  private sunDir = new THREE.Vector3(0.4, 0.6, 0.3).normalize()

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.98
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.5, 2400)
    this.camera.position.set(120, 150, 150)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.45
    pmrem.dispose()

    this.hemi = new THREE.HemisphereLight('#fff8ec', '#bfe0cf', 0.95)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.4)
    this.sun.castShadow = true
    const sc = this.sun.shadow.camera
    sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 20; sc.far = 700
    this.sun.shadow.bias = -0.0002
    this.sun.shadow.normalBias = 0.035
    this.sun.shadow.radius = 4
    this.scene.add(this.sun, this.sun.target)

    this.skyUniforms = {
      top: { value: new THREE.Color('#9fcff0') },
      horizon: { value: new THREE.Color('#e9f4f2') },
      bottom: { value: new THREE.Color('#9fd3f0') },
      sunDir: { value: new THREE.Vector3(0.4, 0.6, 0.3).normalize() },
      sunColor: { value: new THREE.Color('#fff4d6') },
    }
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1600, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyUniforms,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * p;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.55, h), 0.8)) : mix(horizon, bottom, smoothstep(0.0, -0.08, h));
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += sunColor * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.18);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    )
    this.sky.frustumCulled = false
    this.sky.renderOrder = -10
    this.scene.add(this.sky)
    this.scene.fog = new THREE.Fog('#e9f4f2', 420, 1300)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.ao = new GTAOPass(this.scene, this.camera, 1, 1)
    this.ao.output = GTAOPass.OUTPUT.Default
    this.ao.blendIntensity = 0.9
    this.ao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12, distanceFallOff: 1 })
    this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 })
    this.composer.addPass(this.ao)
    this.outline = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera)
    this.outline.edgeStrength = 4
    this.outline.edgeGlow = 0.3
    this.outline.edgeThickness = 1.4
    this.outline.visibleEdgeColor.set('#fe6a4a')
    this.outline.hiddenEdgeColor.set('#fe6a4a')
    this.outline.pulsePeriod = 0
    this.composer.addPass(this.outline)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.92)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
  }

  setLevel(level: Level) {
    this.level = level
    const p = PRESETS[level]
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio))
    this.ao.enabled = p.ao
    this.bloom.enabled = p.bloom
    if (this.sun.shadow.mapSize.x !== p.shadow) {
      this.sun.shadow.mapSize.set(p.shadow, p.shadow)
      this.sun.shadow.map?.dispose()
      this.sun.shadow.map = null
    }
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (target.samples !== p.msaa) {
        target.samples = p.msaa
        target.dispose()
      }
    }
    this.resize(this.width, this.height)
  }

  resize(w: number, h: number) {
    this.width = Math.max(1, w)
    this.height = Math.max(1, h)
    this.renderer.setSize(this.width, this.height, false)
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }

  /**
   * Light the town for a local hour (0..24). Sunrise ~6, sunset ~19.
   * Returns how "night" it is (0..1), which lamps and windows follow.
   */
  setHour(hour: number): number {
    const dayT = (hour - 6) / 13 // 0 at sunrise, 1 at sunset
    const elev = Math.sin(Math.max(-0.25, Math.min(1.25, dayT)) * Math.PI) // -..1
    const az = (dayT - 0.5) * Math.PI * 0.9 + Math.PI * 0.15
    const dusk = 1 - Math.min(1, Math.max(0, elev) * 3.2) // warm near the horizon
    const night = Math.min(1, Math.max(0, (0.18 - elev) / 0.35))
    this.night = night
    const dir = new THREE.Vector3(Math.sin(az) * 0.8, Math.max(0.12, elev) * 1.1 + 0.15, Math.cos(az) * 0.6).normalize()
    this.sunDir.copy(dir)
    this.sun.position.copy(this.sun.target.position).addScaledVector(dir, 320)
    const day = new THREE.Color('#fff1dc'), warm = new THREE.Color('#ffb27a'), moon = new THREE.Color('#9aa6ff')
    this.sun.color.copy(day).lerp(warm, dusk * 0.85).lerp(moon, night)
    this.sun.intensity = THREE.MathUtils.lerp(2.5, 0.55, night) * (1 - dusk * 0.25)
    this.hemi.color.set('#fff8ec').lerp(new THREE.Color('#ffd8b8'), dusk * 0.5).lerp(new THREE.Color('#7f88d6'), night)
    this.hemi.groundColor.set('#bfe0cf').lerp(new THREE.Color('#3a3f6e'), night)
    this.hemi.intensity = THREE.MathUtils.lerp(0.95, 0.42, night)
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.12, night)
    const u = this.skyUniforms
    u.top.value.set('#8fc8ef').lerp(new THREE.Color('#7f9fe0'), dusk * 0.6).lerp(new THREE.Color('#1c2150'), night)
    u.horizon.value.set('#eaf5f2').lerp(new THREE.Color('#ffc59e'), dusk * 0.8).lerp(new THREE.Color('#3d3f7a'), night)
    u.bottom.value.set('#a6d6f0').lerp(new THREE.Color('#2b2f63'), night)
    u.sunDir.value.copy(dir)
    u.sunColor.value.set('#fff4d6').lerp(new THREE.Color('#ffae7a'), dusk).multiplyScalar(1 - night * 0.9)
    ;(this.scene.fog as THREE.Fog).color.copy(u.horizon.value)
    this.bloom.strength = THREE.MathUtils.lerp(0.18, 0.75, night)
    this.bloom.threshold = THREE.MathUtils.lerp(0.95, 0.55, night)
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(0.98, 1.2, night)
    return night
  }

  /**
   * Keep the shadow map on what the camera is looking at: a tight box round
   * the view when zoomed in (crisp shadows), the whole map when zoomed out.
   * The centre snaps to whole shadow texels so shadows do not shimmer.
   */
  aimShadow(cx: number, cz: number, half: number) {
    const cam = this.sun.shadow.camera
    const texel = (half * 2) / this.sun.shadow.mapSize.x
    const sx = Math.round(cx / texel) * texel, sz = Math.round(cz / texel) * texel
    this.sun.target.position.set(sx, 0, sz)
    this.sun.position.set(sx, 0, sz).addScaledVector(this.sunDir, 320)
    if (cam.right !== half) {
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half
      cam.updateProjectionMatrix()
    }
  }

  setOutlined(objects: THREE.Object3D[]) {
    this.outline.selectedObjects = objects
  }

  render() {
    this.composer.render()
  }

  dispose() {
    this.composer.dispose()
    this.renderer.dispose()
  }
}
