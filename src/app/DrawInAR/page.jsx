"use client"

import { useEffect, useRef, useState } from "react"

let THREE, ARButton
;(async () => {
  THREE = await import("three")
  ARButton = (await import("three/examples/jsm/webxr/ARButton.js")).ARButton
})()

export default function HomePage() {
  const canvasRef = useRef(null)
  const webglRef = useRef(null)
  const [ctx, setCtx] = useState(null)
  const [drawings, setDrawings] = useState([])
  const [inAR, setInAR] = useState(false)
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)

  const arSession = useRef({
    initialized: false,
    scene: null,
    camera: null,
    renderer: null,
    planeCount: 0, // Track number of planes for z-offset
  })

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const context = canvas.getContext("2d")
    context.lineWidth = brushSize
    context.lineCap = "round"
    context.strokeStyle = color
    setCtx(context)

    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    })
    ;(async () => {
      const THREEmod = await import("three")
      const { ARButton: A } = await import("three/examples/jsm/webxr/ARButton.js")
      THREE = THREEmod
      ARButton = A
      if (webglRef.current) initAR()
    })()
  }, [])

  useEffect(() => {
    if (ctx) {
      ctx.lineWidth = brushSize
      ctx.strokeStyle = color
    }
  }, [brushSize, color, ctx])

  const initAR = () => {
    if (!THREE || !ARButton || !webglRef.current) return
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: webglRef.current,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true

    // Enable proper depth testing and sorting for overlapping transparent objects
    renderer.sortObjects = true
    renderer.shadowMap.enabled = false // Disable shadows for better transparency handling

    const arBtn = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.getElementById("drawingUI") },
    })
    document.body.appendChild(arBtn)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()

    arSession.current = { renderer, scene, camera, initialized: true, planeCount: 0 }

    renderer.xr.addEventListener("sessionstart", () => setInAR(true))
    renderer.xr.addEventListener("sessionend", resetState)

    renderer.setAnimationLoop(() => renderer.render(scene, camera))
  }

  const resetState = () => {
    setInAR(false)
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setDrawings([])
    arSession.current.planeCount = 0
  }

  const finalizeDrawing = () => {
    const dataURL = canvasRef.current.toDataURL("image/png")
    new THREE.TextureLoader().load(dataURL, (texture) => {
      // Improved material settings for better transparency handling
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1, // Helps with transparency sorting
        depthWrite: false, // Disable depth writing for transparent objects
        depthTest: true, // Keep depth testing enabled
      })

      const { scene, renderer, camera } = arSession.current
      const aspect = canvasRef.current.width / canvasRef.current.height
      const geom = new THREE.PlaneGeometry(0.4, 0.4 / aspect)
      const mesh = new THREE.Mesh(geom, material)

      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)

      // Add a small z-offset for each plane to prevent z-fighting
      const zOffset = arSession.current.planeCount * 0.001
      mesh.position.copy(camera.position).add(dir.multiplyScalar(1.5 + zOffset))
      mesh.quaternion.copy(camera.quaternion)

      // Set render order for proper sorting (higher numbers render last)
      mesh.renderOrder = arSession.current.planeCount

      // Add a small random offset to prevent exact overlap
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
      )
      mesh.position.add(randomOffset)

      scene.add(mesh)
      setDrawings((prev) => [...prev, mesh])
      arSession.current.planeCount++

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    })
  }

  const clearCanvas = () => {
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const deleteAllPlanes = () => {
    const { scene } = arSession.current
    drawings.forEach((m) => scene.remove(m))
    setDrawings([])
    arSession.current.planeCount = 0
  }

  const start = (x, y) => {
    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const drawLine = (x, y) => {
    if (isDrawing) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }
  const stop = () => {
    setIsDrawing(false)
    if (inAR) finalizeDrawing() // draw only during AR
  }

  const getTouch = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top }
  }

  return (
    <>
      <div id="drawingUI" style={styles.drawingUI}>
        <div className="controls" style={styles.controls}>
          <div className="row" style={styles.row}>
            <label>
              Color: <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
            <label>
              Brush:{" "}
              <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} />
            </label>
          </div>
          <div className="row" style={styles.row}>
            <button onClick={clearCanvas}>Clear</button>
            <button onClick={deleteAllPlanes}>Delete All</button>
          </div>
        </div>

        <canvas
          id="drawingCanvas"
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={(e) => start(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
          onMouseMove={(e) => drawLine(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={(e) => {
            const { x, y } = getTouch(e)
            start(x, y)
            e.preventDefault()
          }}
          onTouchMove={(e) => {
            const { x, y } = getTouch(e)
            drawLine(x, y)
            e.preventDefault()
          }}
          onTouchEnd={stop}
        />
      </div>

      <canvas ref={webglRef} style={styles.webglCanvas} />
    </>
  )
}

const styles = {
  drawingUI: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 3,
    display: "block",
    pointerEvents: "auto",
  },
  controls: {
    position: "fixed",
    top: 10,
    left: 10,
    zIndex: 4,
    background: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    display: "flex",
    gap: 10,
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
    touchAction: "none",
  },
  webglCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 0,
  },
}
