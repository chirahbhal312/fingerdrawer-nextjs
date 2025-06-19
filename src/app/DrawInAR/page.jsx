'use client'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'

export default function Page() {
  const canvasRef = useRef(null)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState([0, 0])
  const [currentMaterial, setCurrentMaterial] = useState(null)
  const [ready, setReady] = useState(false)

  const [sceneState, setSceneState] = useState({}) // hold renderer, scene, camera, controller
  const drawingUIRef = useRef()
  const hamburgerRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    const onStart = (x, y) => {
      setIsDrawing(true)
      setLastPos([x, y])
    }
    const onDraw = (x, y) => {
      if (!isDrawing) return
      ctx.strokeStyle = color
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lastPos[0], lastPos[1])
      ctx.lineTo(x, y)
      ctx.stroke()
      setLastPos([x, y])
    }
    const onEnd = () => {
      setIsDrawing(false)
      const url = canvas.toDataURL('image/png')
      new THREE.TextureLoader().load(url, tex => {
        setCurrentMaterial(new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
        }))
        setReady(true)
      })
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    canvas.addEventListener('mousedown', e => onStart(e.offsetX, e.offsetY))
    canvas.addEventListener('mousemove', e => onDraw(e.offsetX, e.offsetY))
    canvas.addEventListener('mouseup', onEnd)
    canvas.addEventListener('mouseout', () => setIsDrawing(false))
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0]
      onStart(t.clientX, t.clientY)
      e.preventDefault()
    })
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0]
      onDraw(t.clientX, t.clientY)
      e.preventDefault()
    })
    canvas.addEventListener('touchend', () => onEnd())

    return () => window.removeEventListener('resize', resize)
  }, [color, brushSize, isDrawing, lastPos])

  useEffect(() => {
    // AR initialization
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)

    const arBtn = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    })
    document.body.appendChild(arBtn)

    renderer.xr.addEventListener('sessionstart', () => {
      drawingUIRef.current.classList.remove('hidden')
      hamburgerRef.current.classList.remove('hidden')
    })
    renderer.xr.addEventListener('sessionend', () => {
      drawingUIRef.current.classList.add('hidden')
      hamburgerRef.current.classList.add('hidden')
      const canvas = canvasRef.current
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      setReady(false)
      setCurrentMaterial(null)
    })

    const controller = renderer.xr.getController(0)
    scene.add(controller)

    controller.addEventListener('select', () => {
      if (!ready || !currentMaterial) return
      const canvas = canvasRef.current
      const aspect = canvas.width / canvas.height
      const geo = new THREE.PlaneGeometry(0.4, 0.4 / aspect)
      const mat = currentMaterial.clone()
      const plane = new THREE.Mesh(geo, mat)

      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      plane.position.copy(camera.position).add(dir.multiplyScalar(1.5))
      plane.quaternion.copy(camera.quaternion)
      plane.userData.scale = 1

      scene.add(plane)
      setSceneState(s => ({ ...s, selectedPlane: plane }))
      setReady(false)
    })

    renderer.setAnimationLoop(() => renderer.render(scene, camera))

    setSceneState({ scene, camera, renderer, controller })
  }, [ready, currentMaterial])

  return (
    <>
      <div ref={hamburgerRef} className="hamburger hidden" onClick={() => drawingUIRef.current.classList.toggle('hidden')}>☰</div>
      <div ref={drawingUIRef} className="controls hidden">
        <div style={{ display: 'flex', gap: 10 }}>
          <label>Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
          <label>Brush: <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(e.target.value)} /></label>
          <button onClick={() => {
            // same as touchend
            const canvas = canvasRef.current
            const url = canvas.toDataURL()
            new THREE.TextureLoader().load(url, tex => {
              setCurrentMaterial(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }))
              setReady(true)
            })
          }}>Draw → AR</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button onClick={() => canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)}>Clear</button>
          <button onClick={() => {
            const { scene, selectedPlane } = sceneState
            scene.children.filter(obj => obj.isMesh && obj.geometry.type === 'PlaneGeometry').forEach(m => scene.remove(m))
            setSceneState(s => ({ ...s, selectedPlane: null }))
          }}>Delete All</button>
        </div>
      </div>
      <canvas ref={canvasRef} id="drawingCanvas" className="drawing-canvas"></canvas>

      {/* global styles */}
      <style jsx global>{`
        html, body {
          margin: 0; overflow: hidden; height: 100%; background: black;
        }
        .hamburger {
          position: fixed; top:10px; right:10px; font-size:28px; z-index:3;
          background:rgba(255,255,255,0.9); padding:5px 10px; border-radius:8px;
          cursor:pointer;
        }
        .controls {
          position: fixed; top:10px; left:10px; z-index:2;
          background:rgba(255,255,255,0.9); padding:10px; border-radius:8px;
          display:flex; flex-direction:column; gap:10px;
        }
        canvas#drawingCanvas {
          position: absolute; top:0; left:0; z-index:1; touch-action:none;
        }
      `}</style>
    </>
  )
}
