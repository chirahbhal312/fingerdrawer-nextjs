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
    .style.height = rect.height + "px"
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
    `p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 text-sm sm:text-base md:text-lg ${
      active
        ? "bg-[#7C3AED] text-white shadow-lg transform scale-105"
        : "bg-[#3C3C3C] text-[#CCCCCC] hover:bg-[#4C4C4C] hover:text-white"
    } hover:shadow-md active:transform active:scale-95`

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] overflow-hidden">
      {/* Top Panel */}
      <div className="h-[7vh] bg-[#2C2C2C] shadow-lg p-4 flex items-center justify-between border-b border-[#3C3C3C]">
        <h1 className="text-2xl font-bold text-white">Paint Studio</h1>
        <button
          className={`${buttonClass(isClearActive)} flex items-center gap-1 sm:gap-2`}
          onClick={clearCanvas}
          onMouseDown={() => setIsClearActive(true)}
          onMouseUp={() => setIsClearActive(false)}
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          <span className="hidden sm:inline text-xs sm:text-sm">Clear</span>
        </button>
      </div>

      {/* Canvas */}
      <div className="h-[70vh] sm:h-[70vh] relative overflow-hidden bg-white m-2 sm:m-4 rounded-2xl shadow-2xl border border-[#E5E5E5]">
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
      <div className="h-[10vh] sm:h-[12,5vh] bg-[#2C2C2C] border-t border-[#3C3C3C] shadow-lg p-2 sm:p-4">
        <div className="flex items-center justify-center max-w-4xl mx-auto w-full h-full">
          <div className="flex items-center justify-evenly w-full max-w-2xl gap-2 sm:gap-4">
            {/* Brush Tool */}
            <button
              className={`${buttonClass(tool === "brush")} flex items-center gap-1 sm:gap-2`}
              onClick={() => setTool("brush")}
            >
              <Brush className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span className="hidden md:inline text-xs sm:text-sm">Brush</span>
            </button>

            {/* Color Palette */}
            <button
              className={`${buttonClass(showColorPopover)} flex items-center gap-1 sm:gap-2`}
              onClick={() => setShowColorPopover(!showColorPopover)}
            >
              <Palette className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded border border-white shadow-sm"
                style={{ backgroundColor: brushColor }}
              />
              <span className="hidden md:inline text-xs sm:text-sm">Colors</span>
            </button>

            {/* Center Action - View AR */}
            <button
              className={`${buttonClass(isViewArActive)} px-4 py-3 sm:px-6 sm:py-3 md:px-8 md:py-4 text-base sm:text-lg md:text-xl font-semibold`}
              onClick={saveAndRedirect}
              onMouseDown={() => setIsViewArActive(true)}
              onMouseUp={() => setIsViewArActive(false)}
            >
              <span className="hidden sm:inline">View in AR</span>
              <span className="sm:hidden">AR</span>
            </button>

            {/* Eraser Tool */}
            <button
              className={`${buttonClass(tool === "eraser")} flex items-center gap-1 sm:gap-2`}
              onClick={() => setTool("eraser")}
            >
              <Eraser className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span className="hidden md:inline text-xs sm:text-sm">Eraser</span>
            </button>

            {/* Settings */}
            <button
              className={`${buttonClass(showSettingsPopover)} flex items-center gap-1 sm:gap-2`}
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span className="hidden md:inline text-xs sm:text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Color Palette Modal */}
      {showColorPopover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content bg-[#2C2C2C] rounded-2xl p-4 sm:p-6 max-w-xs sm:max-w-md w-full mx-4 shadow-2xl border border-[#3C3C3C]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Choose Color</h3>
              <button
                onClick={() => setShowColorPopover(false)}
                className="p-1 hover:bg-[#3C3C3C] rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-[#CCCCCC]" />
              </button>
            </div>

            {/* Color Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 transition-all duration-200 hover:scale-110 ${
                    brushColor === color ? "border-[#7C3AED] shadow-lg shadow-[#7C3AED]/25" : "border-[#4C4C4C]"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => selectColor(color)}
                />
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#CCCCCC]">Custom Color</label>
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-[#4C4C4C] cursor-pointer bg-[#3C3C3C]"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e)}
                  className="flex-1 px-2 py-1 sm:px-3 sm:py-2 text-sm border border-[#4C4C4C] rounded-xl focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] bg-[#3C3C3C] text-white placeholder-[#888888]"
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
          <div className="modal-content bg-[#2C2C2C] rounded-2xl p-4 sm:p-6 max-w-xs sm:max-w-md w-full mx-4 shadow-2xl border border-[#3C3C3C]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Brush Settings</h3>
              <button
                onClick={() => setShowSettingsPopover(false)}
                className="p-1 hover:bg-[#3C3C3C] rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-[#CCCCCC]" />
              </button>
            </div>

            {/* Brush Size */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#CCCCCC] mb-2">Brush Size: {brushSize}px</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
                  className="w-full h-2 bg-[#3C3C3C] rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Brush Preview */}
              <div className="flex items-center justify-center py-4">
                <div className="bg-[#3C3C3C] rounded-xl p-4">
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
                    className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                      brushSize === size
                        ? "bg-[#7C3AED] text-white"
                        : "bg-[#3C3C3C] text-[#CCCCCC] hover:bg-[#4C4C4C] hover:text-white"
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
          background: #7C3AED;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }
      `}</style>
    </div>
  )
}
