'use client'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'

export default function Page() {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef([0, 0])
  const colorRef = useRef('#000000')
  const brushRef = useRef(5)

  const [currentMaterial, setCurrentMaterial] = useState(null)
  const [isReadyForAR, setIsReadyForAR] = useState(false)
  const sceneRef = useRef()
  const cameraRef = useRef()
  const rendererRef = useRef()
  const controllerRef = useRef()

  // Drawing logic using refs
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    function start(x, y) {
      isDrawing.current = true
      lastPos.current = [x, y]
    }

    function draw(x, y) {
      if (!isDrawing.current) return
      const [lx, ly] = lastPos.current
      ctx.strokeStyle = colorRef.current
      ctx.lineWidth = brushRef.current
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastPos.current = [x, y]
    }

    function end() {
      if (!isDrawing.current) return
      isDrawing.current = false

      const dataURL = canvas.toDataURL('image/png')
      new THREE.TextureLoader().load(dataURL, tex => {
        setCurrentMaterial(new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
        }))
        setIsReadyForAR(true)
      })
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Mouse handlers
    canvas.addEventListener('mousedown', e => start(e.offsetX, e.offsetY))
    canvas.addEventListener('mousemove', e => draw(e.offsetX, e.offsetY))
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseout', end)

    // Touch handlers
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0]
      start(t.clientX, t.clientY)
      e.preventDefault()
    })
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0]
      draw(t.clientX, t.clientY)
      e.preventDefault()
    })
    canvas.addEventListener('touchend', end)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  // AR setup
  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    })
    document.body.appendChild(arButton)

    renderer.xr.addEventListener('sessionstart', () => {
      document.getElementById('drawingUI')?.classList.remove('hidden')
      document.getElementById('hamburger')?.classList.remove('hidden')
    })

    renderer.xr.addEventListener('sessionend', () => {
      document.getElementById('drawingUI')?.classList.add('hidden')
      document.getElementById('hamburger')?.classList.add('hidden')
      canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      setIsReadyForAR(false)
      setCurrentMaterial(null)
    })

    const controller = renderer.xr.getController(0)
    scene.add(controller)

    controller.addEventListener('select', () => {
      if (!isReadyForAR || !currentMaterial) return
      const canvas = canvasRef.current
      const aspect = canvas.width / canvas.height
      const geometry = new THREE.PlaneGeometry(0.4, 0.4 / aspect)
      const materialCopy = currentMaterial.clone()
      const plane = new THREE.Mesh(geometry, materialCopy)

      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      plane.position.copy(camera.position).add(dir.multiplyScalar(1.5))
      plane.quaternion.copy(camera.quaternion)
      plane.userData.scale = 1

      scene.add(plane)
    })

    renderer.setAnimationLoop(() => renderer.render(scene, camera))

    // Save refs
    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer
    controllerRef.current = controller
  }, [isReadyForAR, currentMaterial])

  return (
    <>
      <div id="hamburger" className="hamburger hidden" onClick={() =>
        document.getElementById('drawingUI')?.classList.toggle('hidden')
      }>☰</div>

      <div id="drawingUI" className="controls hidden">
        <div className="row">
          <label>
            Color:
            <input type="color" defaultValue="#000000" onChange={e => colorRef.current = e.target.value} />
          </label>
          <label>
            Brush:
            <input type="range" min="1" max="50" defaultValue="5" onChange={e => brushRef.current = e.target.value} />
          </label>
          <button onClick={() => {
            const dataURL = canvasRef.current.toDataURL('image/png')
            new THREE.TextureLoader().load(dataURL, tex => {
              setCurrentMaterial(new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                side: THREE.DoubleSide
              }))
              setIsReadyForAR(true)
            })
          }}>Draw → AR</button>
        </div>
        <div className="row">
          <button onClick={() => {
            const ctx = canvasRef.current.getContext('2d')
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          }}>Clear</button>
          <button onClick={() => {
            const scene = sceneRef.current
            scene.children.filter(o => o.isMesh && o.geometry.type === 'PlaneGeometry').forEach(o => scene.remove(o))
          }}>Delete All</button>
        </div>
      </div>

      <canvas ref={canvasRef} id="drawingCanvas"></canvas>

      <style jsx global>{`
        html, body {
          margin: 0;
          overflow: hidden;
          height: 100%;
          background: black;
        }
        .hamburger {
          position: fixed;
          top: 10px;
          right: 10px;
          font-size: 28px;
          z-index: 3;
          background: rgba(255,255,255,0.9);
          padding: 5px 10px;
          border-radius: 8px;
          cursor: pointer;
        }
        .controls {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 2;
          background: rgba(255,255,255,0.9);
          padding: 10px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .row {
          display: flex;
          gap: 10px;
        }
        canvas#drawingCanvas {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          touch-action: none;
        }
      `}</style>
    </>
  )
}
