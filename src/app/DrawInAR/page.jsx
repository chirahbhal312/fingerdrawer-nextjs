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
  console.log("Rendering PaintingApp")
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
    console.log("setupCanvas")
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
    console.log("startDrawing")
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
    console.log("stopDrawing")
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    console.log("clearCanvas")
    const ctx = canvasRef.current.getContext("2d")
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const startARScene = async () => {
    console.log("startARScene")
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    const xrRoot = document.getElementById("xr-ui-root")
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "dom-overlay"],
      domOverlay: { root: xrRoot }
    })
    renderer.xr.setSession(session)
    document.body.appendChild(ARButton.createButton(renderer))

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1))

    const img = new Image()
    img.src = sessionStorage.getItem("drawingImage") || ""
    await img.decode()
    const texture = new THREE.Texture(img)
    texture.needsUpdate = true

    const aspect = img.width / img.height
    const size = 0.5
    const planeGeo = new THREE.PlaneGeometry(size, size / aspect)
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true })
    const plane = new THREE.Mesh(planeGeo, material)

    const refSpace = await renderer.xr.getReferenceSpace()
    const viewerSpace = await session.requestReferenceSpace("viewer")
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace })

    const onXRFrame = (time, frame) => {
      const pose = frame.getViewerPose(refSpace)
      const hit = frame.getHitTestResults(hitTestSource)[0]

      if (hit && !scene.getObjectById(plane.id)) {
        const hitPose = hit.getPose(refSpace)
        plane.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z)
        plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().fromArray(hitPose.transform.matrix))
        scene.add(plane)
        console.log("Placed drawing in AR")
      }

      renderer.render(scene, camera)
    }

    renderer.setAnimationLoop(onXRFrame)
  }

  const saveAndStartAR = () => {
    console.log("saveAndStartAR")
    const url = canvasRef.current.toDataURL("image/png")
    sessionStorage.setItem("drawingImage", url)
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
      <div className="bg-white/80 p-4 flex flex-col">
        <div className="flex justify-between">
          <h1>Paint App</h1>
          <div>
            <button onClick={clearCanvas} disabled={!isStarted}><RotateCcw /></button>
            <button onClick={saveAndStartAR} disabled={!isStarted}><Download /></button>
          </div>
        </div>

        <div className="relative flex-1">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ background: "transparent" }}
            className="w-full h-full"
          />
          {!isStarted && (
            <button
              onClick={() => { clearCanvas(); setIsStarted(true); }}
              className="absolute inset-0 mx-auto my-auto block bg-green-500 text-white px-4 py-2 rounded"
            >
              Start
            </button>
          )}
        </div>

        <div className="flex gap-4 py-2">
          <button onClick={() => setTool("brush")} className={tool === "brush" ? "bg-blue-500 text-white" : "border"} disabled={!isStarted}>
            <Brush />
          </button>
          <button onClick={() => setTool("eraser")} className={tool === "eraser" ? "bg-blue-500 text-white" : "border"} disabled={!isStarted}>
            <Eraser />
          </button>
          <div id="color-popover" className="relative">
            <button onClick={() => setShowColorPopover(!showColorPopover)} disabled={!isStarted}><Palette /></button>
            {showColorPopover && (
              <div className="absolute bg-white p-2 flex gap-1">
                {defaultColors.map(c => <button key={c} style={{ background: c, width: 20, height: 20 }} onClick={() => setBrushColor(c)} />)}
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} />
                <button onClick={() => setBrushColor(customColor)}>Use</button>
              </div>
            )}
          </div>
          <div id="settings-popover" className="relative">
            <button onClick={() => setShowSettingsPopover(!showSettingsPopover)} disabled={!isStarted}><Settings /></button>
            {showSettingsPopover && (
              <div className="absolute bg-white p-2">
                <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(+e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
