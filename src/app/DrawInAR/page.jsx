"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import * as THREE from "three"
import { ARButton } from "three/examples/jsm/webxr/ARButton"
import { Brush, Eraser, Download, Palette, RotateCcw, Settings } from "lucide-react"

const defaultColors = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
  "#FFC0CB", "#A52A2A", "#808080", "#90EE90", "#FFB6C1",
]

export default function PaintingApp() {
  console.log("🚀 Rendering PaintingApp")
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState("brush")
  const [brushSize, setBrushSize] = useState(5)
  const [brushColor, setBrushColor] = useState("#000000")
  const [customColor, setCustomColor] = useState("#000000")
  const [isStarted, setIsStarted] = useState(false)
  const [showColorPopover, setShowColorPopover] = useState(false)
  const [showSettingsPopover, setShowSettingsPopover] = useState(false)

  // Initialize/resizing canvas
  const setupCanvas = useCallback(() => {
    console.log("⚙️ setupCanvas")
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    console.log("Canvas cleared & transparent")
  }, [])

  useEffect(() => {
    setupCanvas()
    window.addEventListener("resize", setupCanvas)
    return () => window.removeEventListener("resize", setupCanvas)
  }, [setupCanvas])

  const getCoordinates = e => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top,
    }
  }

  const startDrawing = e => {
    if (!isStarted) return
    console.log("✏️ startDrawing", e.type)
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = brushSize
    ctx.strokeStyle = brushColor
    ctx.globalCompositeOperation = tool === "brush" ? "source-over" : "destination-out"
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = e => {
    if (!isDrawing || !isStarted) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    console.log("✋ stopDrawing")
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    console.log("🧼 clearCanvas")
    const ctx = canvasRef.current.getContext("2d")
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const startARScene = async () => {
    console.log("🎬 startARScene")
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    // AR session with DOM overlay
    const xrRoot = document.getElementById("xr-ui-root")
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "dom-overlay"],
      domOverlay: { root: xrRoot }
    })
    renderer.xr.setSession(session)
    document.body.appendChild(ARButton.createButton(renderer))
    console.log("AR session started with DOM overlay")

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1))

    // Load drawing image
    const img = new Image()
    img.src = sessionStorage.getItem("drawingImage") || ""
    await img.decode()
    const texture = new THREE.Texture(img)
    texture.needsUpdate = true

    const aspect = img.width / img.height
    const size = 0.5
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size / aspect),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true })
    )

    // Hit-test placement
    const refSpace = await renderer.xr.getReferenceSpace()
    const viewerSpace = await session.requestReferenceSpace("viewer")
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace })

    let placed = false
    renderer.setAnimationLoop((_, frame) => {
      if (frame && !placed) {
        const hits = frame.getHitTestResults(hitTestSource)
        if (hits.length) {
          const pose = hits[0].getPose(refSpace)
          plane.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z)
          plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().fromArray(pose.transform.matrix))
          scene.add(plane)
          placed = true
          console.log("✅ Placed drawing image in AR")
        }
      }
      renderer.render(scene, camera)
    })
  }

  const saveAndStartAR = () => {
    console.log("💾 saveAndStartAR")
    const url = canvasRef.current.toDataURL("image/png")
    sessionStorage.setItem("drawingImage", url)
    startARScene()
  }

  useEffect(() => {
    const handleClickOutside = e => {
      if (!e.target.closest("#color-popover")) setShowColorPopover(false)
      if (!e.target.closest("#settings-popover")) setShowSettingsPopover(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div id="xr-ui-root" className="h-screen flex flex-col bg-transparent">
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Paint App</h1>
        <div className="flex gap-2">
          <button onClick={clearCanvas} disabled={!isStarted}><RotateCcw /></button>
          <button onClick={saveAndStartAR} disabled={!isStarted}><Download /></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/80 backdrop-blur p-2 flex items-center gap-2">
        <button onClick={() => setTool("brush")} className={tool === "brush" ? "bg-blue-500 text-white p-2 rounded" : "border p-2 rounded"} disabled={!isStarted}><Brush /></button>
        <button onClick={() => setTool("eraser")} className={tool === "eraser" ? "bg-blue-500 text-white p-2 rounded" : "border p-2 rounded"} disabled={!isStarted}><Eraser /></button>
        <div className="relative" id="color-popover">
          <button onClick={() => setShowColorPopover(prev => !prev)} className="border p-2 rounded" disabled={!isStarted}><Palette /></button>
          {showColorPopover && (
            <div className="absolute bg-white shadow p-2 grid grid-cols-5 gap-1 mt-1">
              {defaultColors.map(c => (
                <button key={c} style={{ background: c }} className="w-6 h-6 rounded border" onClick={() => setBrushColor(c)} />
              ))}
              <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-6 h-6" />
              <button onClick={() => setBrushColor(customColor)}>Use</button>
            </div>
          )}
        </div>
        <div className="relative" id="settings-popover">
          <button onClick={() => setShowSettingsPopover(prev => !prev)} className="border p-2 rounded" disabled={!isStarted}><Settings /></button>
          {showSettingsPopover && (
            <div className="absolute bg-white shadow p-2 mt-1">
              <label>Size: {brushSize}px</label>
              <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(+e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Canvas Area (fixed 80vh) */}
      <div className="flex-1 flex items-end justify-center">
        <div style={{ width: "100%", height: "80vh", position: "relative" }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-transparent"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!isStarted && (
            <button
              onClick={() => { clearCanvas(); setIsStarted(true) }}
              className="absolute inset-0 m-auto bg-green-500 text-white px-4 py-2 rounded"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
