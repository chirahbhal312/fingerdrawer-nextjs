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
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    canvas.style.width = rect.width + "px"
    canvas.style.height = rect.height + "px"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  useEffect(() => {
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
    if (!isStarted) return
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = brushSize
    ctx.strokeStyle = tool === "brush" ? brushColor : "white"
    ctx.globalCompositeOperation = tool === "brush" ? "source-over" : "destination-out"
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = e => {
    if (!isDrawing || !isStarted) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d")
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const startARScene = () => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
    document.body.appendChild(arButton)

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
    scene.add(light)

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
    const material = new THREE.MeshNormalMaterial()
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(0, 0, -0.5)
    scene.add(cube)

    const animate = () => {
      renderer.setAnimationLoop(() => {
        cube.rotation.x += 0.01
        cube.rotation.y += 0.01
        renderer.render(scene, camera)
      })
    }
    animate()

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  const saveAndStartAR = () => {
    const canvas = canvasRef.current
    const dataURL = canvas.toDataURL("image/png")
    sessionStorage.setItem("drawingImage", dataURL)
    startARScene()
  }

  useEffect(() => {
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
        <h1 className="text-xl font-bold text-gray-800">Paint App</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded border hover:bg-gray-100" onClick={clearCanvas} disabled={!isStarted}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <button className="p-2 rounded border hover:bg-gray-100" onClick={saveAndStartAR} disabled={!isStarted}>
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!isStarted && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <h2 className="text-lg font-semibold mb-2">Ready to Paint?</h2>
              <p className="text-gray-600 mb-4">Tap Start to begin your masterpiece!</p>
              <button onClick={() => { clearCanvas(); setIsStarted(true) }} className="mt-2 bg-green-500 text-white px-4 py-2 rounded">
                Start
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t shadow-lg p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={() => setTool("brush")} className={`p-2 rounded ${tool === "brush" ? "bg-blue-500 text-white" : "border"}`} disabled={!isStarted}>
              <Brush className="w-4 h-4" />
            </button>
            <button onClick={() => setTool("eraser")} className={`p-2 rounded ${tool === "eraser" ? "bg-blue-500 text-white" : "border"}`} disabled={!isStarted}>
              <Eraser className="w-4 h-4" />
            </button>

            <div className="relative" id="color-popover">
              <button onClick={() => setShowColorPopover(!showColorPopover)} className="p-2 rounded border" disabled={!isStarted}>
                <Palette className="w-4 h-4" />
              </button>
              {showColorPopover && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded shadow p-4 w-64">
                  <div className="grid grid-cols-5 gap-2">
                    {defaultColors.map(c => (
                      <button key={c} style={{ background: c }} className={`w-8 h-8 rounded border-2 ${brushColor === c ? "border-black" : "border-gray-300"}`}
                        onClick={() => setBrushColor(c)} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-10 h-8 rounded" />
                    <button onClick={() => setBrushColor(customColor)} className="px-2 py-1 bg-blue-500 text-white rounded">
                      Use
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative" id="settings-popover">
            <button onClick={() => setShowSettingsPopover(!showSettingsPopover)} className="p-2 rounded border" disabled={!isStarted}>
              <Settings className="w-4 h-4" />
            </button>
            {showSettingsPopover && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded shadow p-4 w-64">
                <label className="block">Brush size: {brushSize}px</label>
                <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(+e.target.value)} className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
)
}
