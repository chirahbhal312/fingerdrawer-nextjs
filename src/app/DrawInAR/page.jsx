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
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    console.log("Canvas initialized transparent")
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
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top,
    }
  }

  const startDrawing = e => {
    console.log("✏️ startDrawing", e.type)
    if (!isStarted) return
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = brushSize
    ctx.strokeStyle = tool === "brush" ? brushColor : "#000000"
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
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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

    const xrRoot = document.getElementById("xr-ui-root")
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test", "dom-overlay"],
      domOverlay: { root: xrRoot },
    })
    document.body.appendChild(arButton)
    console.log("ARButton with DOM overlay appended")

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1))

    const imageURL = sessionStorage.getItem("drawingImage")
    console.log("Loaded imageURL:", imageURL?.slice(0, 50), "…")
    const image = new Image()
    image.src = imageURL || ""
    image.onload = () => {
      console.log("🖼️ Image loaded", image.width, "x", image.height)
      const texture = new THREE.Texture(image)
      texture.needsUpdate = true

      const maxW = 0.5
      const aspect = image.width / image.height
      const width = maxW
      const height = width / aspect

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        })
      )
      plane.position.set(0, 0, -0.5)
      scene.add(plane)
      console.log(`Plane added ${width} x ${height}`)

      renderer.setAnimationLoop(() => renderer.render(scene, camera))
    }
    image.onerror = err => console.error("❌ Image load error", err)

    window.addEventListener("resize", () => {
      console.log("🌐 Window resized")
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  const saveAndStartAR = () => {
    console.log("💾 saveAndStartAR triggered")
    const dataURL = canvasRef.current.toDataURL("image/png")
    console.log("dataURL slice:", dataURL.slice(0, 50), "…")
    sessionStorage.setItem("drawingImage", dataURL)
    startARScene()
  }

  useEffect(() => {
    const handler = e => {
      if (!e.target.closest("#color-popover")) setShowColorPopover(false)
      if (!e.target.closest("#settings-popover")) setShowSettingsPopover(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div id="xr-ui-root" className="h-screen bg-transparent">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Paint App</h1>
        <div className="flex gap-2">
          <button onClick={clearCanvas} disabled={!isStarted}><RotateCcw /></button>
          <button onClick={saveAndStartAR} disabled={!isStarted}><Download /></button>
        </div>
      </div>

      {/* Canvas - updated height and overflow */}
      <div className="relative h-[80vh] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ background: "transparent" }}
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
            <button
              onClick={() => {
                console.log("▶️ Start clicked")
                clearCanvas()
                setIsStarted(true)
              }}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Start
            </button>
          </div>
        )}
      </div>

      {/* Footer Toolbar */}
      <div className="bg-white/80 backdrop-blur p-4 flex justify-center gap-4">
        <button
          onClick={() => {
            console.log("Brush tool selected")
            setTool("brush")
          }}
          className={`p-2 rounded ${tool === "brush" ? "bg-blue-500 text-white" : "border"}`}
          disabled={!isStarted}
        >
          <Brush />
        </button>

        <button
          onClick={() => {
            console.log("Eraser tool selected")
            setTool("eraser")
          }}
          className={`p-2 rounded ${tool === "eraser" ? "bg-blue-500 text-white" : "border"}`}
          disabled={!isStarted}
        >
          <Eraser />
        </button>

        <div className="relative" id="color-popover">
          <button
            onClick={() => {
              console.log("Toggle color picker")
              setShowColorPopover(!showColorPopover)
            }}
            className="p-2 border rounded"
            disabled={!isStarted}
          >
            <Palette />
          </button>
          {showColorPopover && (
            <div className="absolute bg-white rounded shadow p-4 mt-2">
              <div className="grid grid-cols-5 gap-2">
                {defaultColors.map(c => (
                  <button
                    key={c}
                    style={{ background: c }}
                    className={`w-8 h-8 rounded border-2 ${
                      brushColor === c ? "border-black" : "border-gray-300"
                    }`}
                    onClick={() => {
                      console.log(`Color selected: ${c}`)
                      setBrushColor(c)
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center">
                <input
                  type="color"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  className="w-8 h-8 border rounded"
                />
                <button
                  onClick={() => {
                    console.log(`Custom color applied: ${customColor}`)
                    setBrushColor(customColor)
                  }}
                  className="ml-2 bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Use
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" id="settings-popover">
          <button
            onClick={() => {
              console.log("Toggle settings")
              setShowSettingsPopover(!showSettingsPopover)
            }}
            className="p-2 border rounded"
            disabled={!isStarted}
          >
            <Settings />
          </button>
          {showSettingsPopover && (
            <div className="absolute bg-white rounded shadow p-4 mt-2 right-0">
              <label>Brush size: {brushSize}px</label>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={e => {
                  console.log(`Brush size changed: ${e.target.value}`)
                  setBrushSize(+e.target.value)
                }}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
