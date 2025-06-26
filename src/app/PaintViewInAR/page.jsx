"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Brush, Eraser, Play, Palette, RotateCcw, Settings } from "lucide-react"

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
  "#90EE90",
  "#FFB6C1",
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
    if (!isStarted) return
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.lineWidth = brushSize
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"
    ctx.strokeStyle = brushColor
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing || !isStarted) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    const { x, y } = getCoordinates(e)
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"
    ctx.strokeStyle = brushColor
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
    if (!canvas) return

    // Create temp canvas with white background
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext("2d")

    // Draw white background
    tempCtx.fillStyle = "white"
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

    // Draw original canvas over it
    tempCtx.drawImage(canvas, 0, 0)

    const dataURL = tempCanvas.toDataURL("image/png")
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

  const btnClass = (active, disabled = false) =>
    `p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 text-sm sm:text-base md:text-lg ${
      disabled
        ? "bg-[#2C2C2C] text-[#666666] cursor-not-allowed"
        : active
          ? "bg-[#7C3AED] text-white shadow-lg transform scale-105"
          : "bg-[#3C3C3C] text-[#CCCCCC] hover:bg-[#4C4C4C] hover:text-white"
    } hover:shadow-md active:transform active:scale-95`

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] overflow-hidden">
      {/* Top Panel – 10vh */}
      <div className="h-[10vh] bg-[#2C2C2C] shadow-lg p-4 flex items-center justify-between border-b border-[#3C3C3C]">
        <h1 className="text-2xl font-bold text-white">Paint Studio</h1>
        <div className="flex items-center gap-2">
          <button
            className={btnClass(isClearActive, !isStarted)}
            onClick={clearCanvas}
            onMouseDown={() => setIsClearActive(true)}
            onMouseUp={() => setIsClearActive(false)}
            disabled={!isStarted}
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>

      {/* Canvas – 70vh */}
      <div className="h-[70vh] relative bg-white m-2 sm:m-4 rounded-2xl shadow-2xl border border-[#E5E5E5]">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair rounded-2xl"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!isStarted && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
            <div className="bg-[#2C2C2C] rounded-2xl p-6 text-center shadow-2xl border border-[#3C3C3C]">
              <h2 className="text-xl font-semibold mb-2 text-white">Ready to Paint?</h2>
              <p className="text-[#CCCCCC] mb-4">Tap Start to begin your masterpiece!</p>
              <button
                className={`${btnClass(isStartActive)} flex items-center gap-2 mx-auto`}
                onClick={handleStart}
                onMouseDown={() => setIsStartActive(true)}
                onMouseUp={() => setIsStartActive(false)}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                Start
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel – 10vh */}
      <div className="h-[10vh] bg-[#2C2C2C] border-t border-[#3C3C3C] shadow-lg p-4">
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          <button
            className={btnClass(tool === "brush", !isStarted)}
            onClick={() => setTool("brush")}
            disabled={!isStarted}
          >
            <Brush className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>

          <button
            className={btnClass(tool === "eraser", !isStarted)}
            onClick={() => setTool("eraser")}
            disabled={!isStarted}
          >
            <Eraser className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>

          <button className={btnClass(false, !isStarted)} onClick={saveAndRedirect} disabled={!isStarted}>
            View In AR
          </button>

          <div className="relative" id="color-popover">
            <button
              className={`${btnClass(showColorPopover, !isStarted)} relative`}
              onClick={() => setShowColorPopover((v) => !v)}
              disabled={!isStarted}
            >
              <Palette className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white"
                style={{ backgroundColor: brushColor }}
              />
            </button>
            {showColorPopover && (
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 bg-[#2C2C2C] rounded-2xl shadow-2xl p-4 z-10 w-64 border border-[#3C3C3C]">
                <label className="text-sm font-medium mb-2 block text-white">Colors</label>
                <div className="grid grid-cols-5 gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      className={`w-10 h-10 rounded-xl border-2 transition-all ${
                        brushColor === color
                          ? "border-[#7C3AED] scale-110 shadow-lg shadow-[#7C3AED]/25"
                          : "border-[#4C4C4C] hover:border-[#7C3AED]"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setBrushColor(color)
                        setShowColorPopover(false)
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-12 h-8 border border-[#4C4C4C] rounded-xl bg-[#3C3C3C]"
                  />
                  <button
                    className={btnClass(false)}
                    onClick={() => {
                      setBrushColor(customColor)
                      setShowColorPopover(false)
                    }}
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" id="settings-popover">
            <button
              className={btnClass(showSettingsPopover, !isStarted)}
              onClick={() => setShowSettingsPopover((v) => !v)}
              disabled={!isStarted}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            {showSettingsPopover && (
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 bg-[#2C2C2C] rounded-2xl shadow-2xl p-4 z-10 w-64 border border-[#3C3C3C]">
                <label className="text-sm font-medium mb-2 block text-white">Brush Size: {brushSize}px</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
                  className="w-full h-2 bg-[#3C3C3C] rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            )}
          </div>
        </div>
      </div>

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
