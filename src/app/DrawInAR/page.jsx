"use client"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { ARButton } from "three/examples/jsm/webxr/ARButton.js"

export default function CanvasARApp() {
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const controllerRef = useRef(null)

  const [isDrawingUIVisible, setIsDrawingUIVisible] = useState(false)
  const [isHamburgerVisible, setIsHamburgerVisible] = useState(false)
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)

  const drawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const isNewARDrawingReadyRef = useRef(false)
  const currentMaterialRef = useRef(null)
  const selectedPlaneRef = useRef(null)
  const initialDistanceRef = useRef(0)
  const initialScaleRef = useRef(1)
  const rotationStartAngleRef = useRef(0)
  const initialRotationYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const raycasterRef = useRef(new THREE.Raycaster())
  const dragPlaneRef = useRef(new THREE.Plane())
  const dragIntersectionRef = useRef(new THREE.Vector3())
  const dragOffsetRef = useRef(new THREE.Vector3())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    function resizeCanvas() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()

    function startDrawing(x, y) {
      drawingRef.current = true
      lastPosRef.current = { x, y }
    }

    function drawLine(x, y) {
      if (!drawingRef.current) return
      ctx.strokeStyle = color
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastPosRef.current = { x, y }
    }

    // Mouse events
    const handleMouseDown = (e) => startDrawing(e.offsetX, e.offsetY)
    const handleMouseMove = (e) => drawLine(e.offsetX, e.offsetY)
    const handleMouseUp = () => {
      drawingRef.current = false
    }
    const handleMouseOut = () => {
      drawingRef.current = false
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseout", handleMouseOut)

    // Touch events
    const handleTouchStart = (e) => {
      const touch = e.touches[0]
      startDrawing(touch.clientX, touch.clientY)
      e.preventDefault()
    }

    const handleTouchMove = (e) => {
      const touch = e.touches[0]
      drawLine(touch.clientX, touch.clientY)
      e.preventDefault()
    }

    const handleTouchEnd = () => {
      drawingRef.current = false
      const dataURL = canvas.toDataURL("image/png")
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(dataURL, (texture) => {
        currentMaterialRef.current = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        })
        isNewARDrawingReadyRef.current = true
      })
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseout", handleMouseOut)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [color, brushSize])

  useEffect(() => {
    // AR Setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    })
    document.body.appendChild(arButton)

    renderer.xr.addEventListener("sessionstart", () => {
      setIsDrawingUIVisible(true)
      setIsHamburgerVisible(true)
    })

    renderer.xr.addEventListener("sessionend", () => {
      setIsDrawingUIVisible(false)
      setIsHamburgerVisible(false)
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      isNewARDrawingReadyRef.current = false
      currentMaterialRef.current = null
      selectedPlaneRef.current = null
    })

    const controller = renderer.xr.getController(0)
    scene.add(controller)
    controllerRef.current = controller

    controller.addEventListener("select", () => {
      if (!isNewARDrawingReadyRef.current || !currentMaterialRef.current) return

      const canvas = canvasRef.current
      const aspect = canvas.width / canvas.height
      const geometry = new THREE.PlaneGeometry(0.4, 0.4 / aspect)
      const plane = new THREE.Mesh(geometry, currentMaterialRef.current.clone())

      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      plane.position.copy(camera.position).add(dir.multiplyScalar(1.5))
      plane.quaternion.copy(camera.quaternion)

      plane.userData.scale = 1
      scene.add(plane)
      selectedPlaneRef.current = plane

      isNewARDrawingReadyRef.current = false
    })

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera)
    })

    // Touch gestures for AR manipulation
    const handleTouchStart = (e) => {
      const touch = e.touches[0]

      // Tap-to-select
      if (!isDrawingUIVisible && e.touches.length === 1) {
        const ndc = new THREE.Vector2(
          (touch.clientX / window.innerWidth) * 2 - 1,
          -(touch.clientY / window.innerHeight) * 2 + 1,
        )
        raycasterRef.current.setFromCamera(ndc, camera)
        const intersects = raycasterRef.current.intersectObjects(scene.children, false)
        const hit = intersects.find((i) => i.object.isMesh && i.object.geometry?.type === "PlaneGeometry")
        if (hit) {
          selectedPlaneRef.current = hit.object
        }
      }

      // Only continue if drawing UI is hidden and we have a selected plane
      if (!selectedPlaneRef.current || isDrawingUIVisible) return

      if (e.touches.length === 1) {
        isDraggingRef.current = true
        const ndc = new THREE.Vector2(
          (touch.clientX / window.innerWidth) * 2 - 1,
          -(touch.clientY / window.innerHeight) * 2 + 1,
        )
        raycasterRef.current.setFromCamera(ndc, camera)
        dragPlaneRef.current.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(new THREE.Vector3()).normalize(),
          selectedPlaneRef.current.position,
        )
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, dragIntersectionRef.current)) {
          dragOffsetRef.current.copy(dragIntersectionRef.current).sub(selectedPlaneRef.current.position)
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        initialDistanceRef.current = Math.hypot(dx, dy)
        initialScaleRef.current = selectedPlaneRef.current.scale.x
        rotationStartAngleRef.current = Math.atan2(dy, dx)
        initialRotationYRef.current = selectedPlaneRef.current.rotation.y
      }
    }

    const handleTouchMove = (e) => {
      if (!selectedPlaneRef.current || isDrawingUIVisible) return

      if (e.touches.length === 1 && isDraggingRef.current) {
        const touch = e.touches[0]
        const ndc = new THREE.Vector2(
          (touch.clientX / window.innerWidth) * 2 - 1,
          -(touch.clientY / window.innerHeight) * 2 + 1,
        )
        raycasterRef.current.setFromCamera(ndc, camera)
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, dragIntersectionRef.current)) {
          selectedPlaneRef.current.position.copy(dragIntersectionRef.current.sub(dragOffsetRef.current))
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const newDistance = Math.hypot(dx, dy)
        const scale = initialScaleRef.current * (newDistance / initialDistanceRef.current)
        selectedPlaneRef.current.scale.set(scale, scale, scale)
        const angle = Math.atan2(dy, dx)
        selectedPlaneRef.current.rotation.y = initialRotationYRef.current + (angle - rotationStartAngleRef.current)
      }
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
    }

    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [isDrawingUIVisible])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const enterAR = () => {
    const canvas = canvasRef.current
    const dataURL = canvas.toDataURL("image/png")
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(dataURL, (texture) => {
      currentMaterialRef.current = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      })
      isNewARDrawingReadyRef.current = true
    })
  }

  const deleteAllPlanes = () => {
    const scene = sceneRef.current
    if (!scene) return

    scene.children = scene.children.filter((obj) => {
      if (obj.isMesh && obj.geometry?.type === "PlaneGeometry") {
        scene.remove(obj)
        return false
      }
      return true
    })
    selectedPlaneRef.current = null
  }

  const toggleDrawingUI = () => {
    setIsDrawingUIVisible(!isDrawingUIVisible)
  }

  return (
    <div style={{ margin: 0, overflow: "hidden", height: "100vh", backgroundColor: "black" }}>
      {isHamburgerVisible && (
        <div
          onClick={toggleDrawingUI}
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            fontSize: "28px",
            zIndex: 3,
            background: "rgba(255,255,255,0.9)",
            padding: "5px 10px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ☰
        </div>
      )}

      {isDrawingUIVisible && (
        <div>
          <div
            style={{
              position: "fixed",
              top: "10px",
              left: "10px",
              zIndex: 2,
              background: "rgba(255,255,255,0.9)",
              padding: "10px",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "10px" }}>
              <label>
                Color:
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </label>
              <label>
                Brush:
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
                />
              </label>
              <button onClick={enterAR} style={{ padding: "5px 10px" }}>
                Draw → AR
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={clearCanvas} style={{ padding: "5px 10px" }}>
                Clear
              </button>
              <button onClick={deleteAllPlanes} style={{ padding: "5px 10px" }}>
                Delete All
              </button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
              touchAction: "none",
            }}
          />
        </div>
      )}
    </div>
  )
}
