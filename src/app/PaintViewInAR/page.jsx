'use client'

import { useRef, useState, useEffect, useCallback } from "react"
import { Brush, Eraser, Download, Play, Palette, RotateCcw, Settings } from "lucide-react"

const defaultColors = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF",
  "#00FFFF", "#FFA500", "#800080", "#FFC0CB", "#A52A2A", "#808080", "#90EE90", "#FFB6C1",
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
  const [isClearActive, setIsClearActive] = useState(false)
  const [isStartActive, setIsStartActive] = useState(false)

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

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = (e) => {
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

  const draw = (e) => {
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

  const saveAndRedirect = () => {
    const canvas = canvasRef.current
    const dataURL = canvas.toDataURL("image/png")
    sessionStorage.setItem("drawingImage", dataURL)
    window.location.href = "/page3"
  }

  const handleStart = () => {
    setIsStarted(true)
    clearCanvas()
  }

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("#color-popover")) setShowColorPopover(false)
      if (!e.target.closest("#settings-popover")) setShowSettingsPopover(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const btnClass = (active) =>
    `p-2 rounded text-white ${active ? 'bg-green-600' : 'bg-blue-500'} hover:opacity-90 active:bg-green-700`

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Panel – 10vh */}
      <div className="h-[10vh] bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Paint App</h1>
        <div className="flex items-center gap-2">
          <button
            className={btnClass(isClearActive)}
            onClick={clearCanvas}
            onMouseDown={() => setIsClearActive(true)}
            onMouseUp={() => setIsClearActive(false)}
            disabled={!isStarted}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            className={btnClass(false)}
            onClick={saveAndRedirect}
            disabled={!isStarted}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas – 70vh */}
      <div className="h-[70vh] relative">
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
              <button
                className={btnClass(isStartActive)}
                onClick={handleStart}
                onMouseDown={() => setIsStartActive(true)}
                onMouseUp={() => setIsStartActive(false)}
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel – 10vh */}
      <div className="h-[10vh] bg-white border-t shadow-lg p-4">
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          <button
            className={btnClass(tool === "brush")}
            onClick={() => setTool("brush")}
            disabled={!isStarted}
          >
            <Brush className="w-4 h-4" />
          </button>

          <button
            className={btnClass(tool === "eraser")}
            onClick={() => setTool("eraser")}
            disabled={!isStarted}
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="relative" id="color-popover">
            <button
              className={btnClass(showColorPopover)}
              onClick={() => setShowColorPopover(v => !v)}
              disabled={!isStarted}
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPopover && (
              <div className="absolute left-0 top-full mt-2 bg-white rounded-md shadow-lg p-4 z-10 w-64">
                <label className="text-sm font-medium mb-2 block">Colors</label>
                <div className="grid grid-cols-5 gap-2">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 ${brushColor === color ? "border-black scale-110" : "border-gray-300"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                    />
                  ))}
                </div>
                <div className="mt-4 flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    className="w-12 h-8 border rounded"
                  />
                  <button
                    className={btnClass(false)}
                    onClick={() => setBrushColor(customColor)}
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" id="settings-popover">
            <button
              className={btnClass(showSettingsPopover)}
              onClick={() => setShowSettingsPopover(v => !v)}
              disabled={!isStarted}
            >
              <Settings className="w-4 h-4" />
            </button>
            {showSettingsPopover && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-md shadow-lg p-4 z-10 w-64">
                <label className="text-sm font-medium mb-2 block">Brush Size: {brushSize}px</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={e => setBrushSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
