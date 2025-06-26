"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Brush, Eraser, Palette, RotateCcw, Settings, X } from "lucide-react"

const defaultColors = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#FFC0CB",
  "#A52A2A",
  "#808080",
  "#000080",
  "#008000",
  "#800000",
  "#808000",
  "#008080",
]

export default function PaintingApp() {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState("brush")
  const [brushSize, setBrushSize] = useState(5)
  const [brushColor, setBrushColor] = useState("#000000")
  const [customColor, setCustomColor] = useState("#000000")
  const [showColorPopover, setShowColorPopover] = useState(false)
  const [showSettingsPopover, setShowSettingsPopover] = useState(false)
  const [isClearActive, setIsClearActive] = useState(false)
  const [isViewArActive, setIsViewArActive] = useState(false)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    canvas.style.width = rect.width + "px"
    canvas.style.height = rect.height + "px"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = brushSize
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"
    ctx.strokeStyle = brushColor
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"
    ctx.lineWidth = brushSize
    ctx.strokeStyle = brushColor
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const saveAndRedirect = () => {
    const canvas = canvasRef.current
    const dataURL = canvas.toDataURL("image/png")
    sessionStorage.setItem("drawingImage", dataURL)
    window.location.href = "/page3"
  }

  const selectColor = (color) => {
    setBrushColor(color)
    setCustomColor(color)
    setShowColorPopover(false)
  }

  const handleCustomColorChange = (e) => {
    const color = e.target.value
    setCustomColor(color)
    setBrushColor(color)
  }

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".modal-content")) {
        setShowColorPopover(false)
        setShowSettingsPopover(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const buttonClass = (active) =>
    `p-3 rounded-lg text-white transition-all duration-200 ${
      active
        ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transform scale-105"
        : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600"
    } hover:shadow-md active:transform active:scale-95`

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Top Panel */}
      <div className="h-[10vh] bg-white shadow-lg p-4 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Paint Studio
        </h1>
        <button
          className={`${buttonClass(isClearActive)} flex items-center gap-2`}
          onClick={clearCanvas}
          onMouseDown={() => setIsClearActive(true)}
          onMouseUp={() => setIsClearActive(false)}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Canvas */}
      <div className="h-[70vh] relative overflow-hidden bg-white m-4 rounded-xl shadow-inner border-2 border-gray-200">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair rounded-xl"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Bottom Panel */}
      <div className="h-[20vh] bg-white border-t border-gray-200 shadow-lg p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full h-full">
          {/* Left Tools */}
          <div className="flex items-center gap-3">
            <button
              className={`${buttonClass(tool === "brush")} flex items-center gap-2`}
              onClick={() => setTool("brush")}
            >
              <Brush className="w-5 h-5" />
              <span className="hidden sm:inline">Brush</span>
            </button>

            <button
              className={`${buttonClass(showColorPopover)} flex items-center gap-2`}
              onClick={() => setShowColorPopover(!showColorPopover)}
            >
              <Palette className="w-5 h-5" />
              <div
                className="w-4 h-4 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: brushColor }}
              />
              <span className="hidden sm:inline">Colors</span>
            </button>
          </div>

          {/* Center Action */}
          <button
            className={`${buttonClass(isViewArActive)} px-6 py-3 text-lg font-semibold`}
            onClick={saveAndRedirect}
            onMouseDown={() => setIsViewArActive(true)}
            onMouseUp={() => setIsViewArActive(false)}
          >
            View in AR
          </button>

          {/* Right Tools */}
          <div className="flex items-center gap-3">
            <button
              className={`${buttonClass(tool === "eraser")} flex items-center gap-2`}
              onClick={() => setTool("eraser")}
            >
              <Eraser className="w-5 h-5" />
              <span className="hidden sm:inline">Eraser</span>
            </button>

            <button
              className={`${buttonClass(showSettingsPopover)} flex items-center gap-2`}
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Color Palette Modal */}
      {showColorPopover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Choose Color</h3>
              <button
                onClick={() => setShowColorPopover(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Color Grid */}
            <div className="grid grid-cols-6 gap-3 mb-6">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                    brushColor === color ? "border-blue-500 shadow-lg" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => selectColor(color)}
                />
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Custom Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsPopover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Brush Settings</h3>
              <button
                onClick={() => setShowSettingsPopover(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Brush Size */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brush Size: {brushSize}px</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Brush Preview */}
              <div className="flex items-center justify-center py-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div
                    className="rounded-full"
                    style={{
                      width: `${Math.max(brushSize, 4)}px`,
                      height: `${Math.max(brushSize, 4)}px`,
                      backgroundColor: brushColor,
                    }}
                  />
                </div>
              </div>

              {/* Quick Size Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[2, 5, 10, 20].map((size) => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      brushSize === size ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
