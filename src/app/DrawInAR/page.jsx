"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import * as THREE from "three"
import { ARButton } from "three/examples/jsm/webxr/ARButton"
import { Brush, Eraser, Download, Play, Palette, RotateCcw, Settings } from "lucide-react"

const defaultColors = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
  "#FFC0CB", "#A52A2A", "#808080", "#90EE90", "#FFB6C1",
]

export default function PaintingApp() {
  console.log("🔄 Rendering PaintingApp")
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState("brush")
  const [brushSize, setBrushSize] = useState(5)
  const [brushColor, setBrushColor] = useState("#000000")
  const [customColor, setCustomColor] = useState("#000000")
  const [isStarted, setIsStarted] = useState(false)
  const [showColorPopover, setShowColorPopover] = useState(false)
  const [showSettingsPopover, setShowSettingsPopover] = useState(false)

  const setupCanvas = useCallback(() => {
    console.log("⚙️ setupCanvas called")
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
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    console.log("Canvas reset with white background")
  }, [])

  useEffect(() => {
    console.log("📌 useEffect: setupCanvas & add resize listener")
    setupCanvas()
    window.addEventListener("resize", setupCanvas)
    return () => window.removeEventListener("resize", setupCanvas)
  }, [setupCanvas])

  const getCoordinates = e => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = e => {
    console.log("✏️ startDrawing", e.type)
    if (!isStarted) return
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = brushSize
    ctx.strokeStyle = tool === "brush" ? brushColor : "white"
    ctx.globalCompositeOperation = tool === "brush" ? "source-over" : "destination-out"
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = e => {
    if (!isDrawing || !isStarted) return
    console.log("🖌️ draw in progress")
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
console.log("Canvas cleared to transparent")
  }

  const startARScene = () => {
    console.log("🚀 startARScene initializing")
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
    document.body.appendChild(arButton)
    console.log("ARButton appended to document")

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
    scene.add(light)

    const imageURL = sessionStorage.getItem("drawingImage")
    console.log("Loaded imageURL:", imageURL?.slice(0, 50), "...")
    const image = new Image()
    image.src = imageURL || ""
    image.onload = () => {
      console.log("🖼️ Image loaded", image.width, "x", image.height)
      const texture = new THREE.Texture(image)
      texture.needsUpdate = true

      const maxPlaneWidth = 0.5
      const aspect = image.width / image.height
      const width = maxPlaneWidth
      const height = width / aspect

      const geometry = new THREE.PlaneGeometry(width, height)
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
      const plane = new THREE.Mesh(geometry, material)
      plane.position.set(0, 0, -0.5)
      scene.add(plane)
      console.log(`🌐 Plane added of size ${width.toFixed(3)}m x ${height.toFixed(3)}m`)

      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera)
      })
    }
    image.onerror = e => console.error("❌ Image failed to load", e)

    window.addEventListener("resize", () => {
      console.log("🌐 Window resized")
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  const saveAndStartAR = () => {
    console.log("💾 saveAndStartAR triggered")
    const canvas = canvasRef.current
    const dataURL = canvas.toDataURL("image/png")
    console.log("Data URL (start):", dataURL.slice(0, 50), "...")
    sessionStorage.setItem("drawingImage", dataURL)
    console.log("Image saved to sessionStorage")
    startARScene()
  }

  useEffect(() => {
    console.log("📍 Click-outside popover listeners setup")
    const onClickOutside = e => {
      if (!e.target.closest("#color-popover")) setShowColorPopover(false)
      if (!e.target.closest("#settings-popover")) setShowSettingsPopover(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Paint App</h1>
        <div className="flex items-center gap-2">
          <button onClick={clearCanvas} disabled={!isStarted}><RotateCcw /></button>
          <button onClick={saveAndStartAR} disabled={!isStarted}><Download /></button>
        </div>
      </div>
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />
        {!isStarted && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-lg text-center">
              <h2 className="text-lg font-semibold">Ready to Paint?</h2>
              <p className="text-gray-600 mb-4">Tap Start to begin your masterpiece!</p>
              <button
                onClick={() => { console.log("▶️ Start clicked"); clearCanvas(); setIsStarted(true) }}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Start
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white border-t shadow-lg p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={() => { console.log("Brush tool"); setTool("brush") }} className={`p-2 rounded ${tool === "brush" ? "bg-blue-500 text-white" : "border"}`} disabled={!isStarted}><Brush /></button>
            <button onClick={() => { console.log("Eraser tool"); setTool("eraser") }} className={`p-2 rounded ${tool === "eraser" ? "bg-blue-500 text-white" : "border"}`} disabled={!isStarted}><Eraser /></button>
            <div className="relative" id="color-popover">
              <button onClick={() => { console.log("Toggle color picker"); setShowColorPopover(!showColorPopover) }} className="p-2 border rounded" disabled={!isStarted}><Palette /></button>
              {showColorPopover && (
                <div className="absolute bg-white p-4 rounded shadow mt-2 w-64">
                  <div className="grid grid-cols-5 gap-2">
                    {defaultColors.map(c => (
                      <button
                        key={c}
                        style={{ background: c }}
                        className={`w-8 h-8 rounded border-2 ${brushColor === c ? "border-black" : "border-gray-300"}`}
                        onClick={() => { console.log(`Color selected: ${c}`); setBrushColor(c) }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-10 h-8 rounded" />
                    <button onClick={() => { console.log(`Custom color applied: ${customColor}`); setBrushColor(customColor) }} className="bg-blue-500 text-white px-2 py-1 rounded">Use</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative" id="settings-popover">
            <button onClick={() => { console.log("Toggle settings"); setShowSettingsPopover(!showSettingsPopover) }} className="p-2 border rounded" disabled={!isStarted}><Settings /></button>
            {showSettingsPopover && (
              <div className="absolute bg-white p-4 rounded shadow mt-2 w-64 right-0">
                <label className="block">Brush size: {brushSize}px</label>
                <input type="range" min="1" max="50" value={brushSize} onChange={e => { console.log(`Brush size: ${e.target.value}`); setBrushSize(+e.target.value) }} className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
