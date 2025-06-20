'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

export default function Page() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [color, setColor] = useState('#000000');
  const [brush, setBrush] = useState(5);
  const [drawingUI, setDrawingUI] = useState(false);
  const [isNewARDrawingReady, setNewARDrawingReady] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controllerRef = useRef();
  const selectedPlaneRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const dragPlaneRef = useRef(new THREE.Plane());
  const dragIntersectionRef = useRef(new THREE.Vector3());
  const dragOffsetRef = useRef(new THREE.Vector3());
  const isDraggingRef = useRef(false);
  const initialDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);
  const rotationStartAngleRef = useRef(0);
  const initialRotationYRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const _ctx = canvas.getContext('2d');
    setCtx(_ctx);

    const resize = () => {
      alert('Resizing canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (x, y) => {
      drawing = true;
      [lastX, lastY] = [x, y];
      alert(`Started drawing at (${x}, ${y})`);
    };
    const drawLine = (x, y) => {
      if (!drawing) return;
      alert(`Drawing line to (${x}, ${y})`);
      _ctx.strokeStyle = color;
      _ctx.lineWidth = brush;
      _ctx.lineCap = 'round';
      _ctx.beginPath();
      _ctx.moveTo(lastX, lastY);
      _ctx.lineTo(x, y);
      _ctx.stroke();
      [lastX, lastY] = [x, y];
    };

    // Pointer events
    canvas.addEventListener('mousedown', e => startDrawing(e.offsetX, e.offsetY));
    canvas.addEventListener('mousemove', e => drawLine(e.offsetX, e.offsetY));
    ['mouseup', 'mouseout'].forEach(ev => canvas.addEventListener(ev, () => {
      drawing = false;
      alert('Stopped drawing');
    }));

    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      alert(`Touch start at (${t.clientX}, ${t.clientY})`);
      startDrawing(t.clientX, t.clientY);
      e.preventDefault();
    });
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0];
      drawLine(t.clientX, t.clientY);
      e.preventDefault();
    });
    canvas.addEventListener('touchend', () => {
      drawing = false;
      alert('Touch end, creating texture...');
      const dataURL = canvas.toDataURL('image/png');
      new THREE.TextureLoader().load(dataURL, texture => {
        alert('Texture loaded from canvas');
        setCurrentMaterial(new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        }));
        setNewARDrawingReady(true);
        alert('Material ready for AR');
      });
      _ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [color, brush]);

  const clearCanvas = () => {
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      alert('Canvas cleared');
    }
  };

  const prepareARTexture = () => {
    alert('Preparing AR texture...');
    const dataURL = canvasRef.current.toDataURL('image/png');
    new THREE.TextureLoader().load(dataURL, texture => {
      alert('Texture loaded for AR');
      setCurrentMaterial(new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      }));
      setNewARDrawingReady(true);
    });
  };

  const deleteAllPlanes = () => {
    alert('Deleting all planes...');
    const scene = sceneRef.current;
    if (!scene) return;
    scene.children = scene.children.filter(obj => {
      if (obj.isMesh && obj.geometry?.type === 'PlaneGeometry') {
        scene.remove(obj);
        alert('Removed a plane');
        return false;
      }
      return true;
    });
    selectedPlaneRef.current = null;
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    document.body.appendChild(arButton);
    alert('AR Button added');

    renderer.xr.addEventListener('sessionstart', () => {
      alert('AR Session started');
      setDrawingUI(true);
    });
    renderer.xr.addEventListener('sessionend', () => {
      alert('AR Session ended');
      setDrawingUI(false);
      if (ctx) ctx.clearRect(0, canvasRef.current.width, canvasRef.current.height);
      setNewARDrawingReady(false);
      setCurrentMaterial(null);
      selectedPlaneRef.current = null;
    });

    const controller = renderer.xr.getController(0);
    scene.add(controller);

    controller.addEventListener('select', () => {
      if (!isNewARDrawingReady || !currentMaterial) return;
      alert('AR select trigger - placing plane');
      const aspect = canvasRef.current.width / canvasRef.current.height;
      const geometry = new THREE.PlaneGeometry(0.4, 0.4 / aspect);
      const plane = new THREE.Mesh(geometry, currentMaterial.clone());
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      plane.position.copy(camera.position).add(dir.multiplyScalar(1.5));
      plane.quaternion.copy(camera.quaternion);
      plane.userData.scale = 1;
      scene.add(plane);
      selectedPlaneRef.current = plane;
      setNewARDrawingReady(false);
    });

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    window.addEventListener('touchstart', e => {
      const sel = selectedPlaneRef.current;
      if (!drawingUI && e.touches.length === 1) {
        const t = e.touches[0];
        const ndc = new THREE.Vector2((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1);
        raycasterRef.current.setFromCamera(ndc, camera);
        const hit = raycasterRef.current.intersectObjects(scene.children, false).find(i => i.object.isMesh && i.object.geometry?.type === 'PlaneGeometry');
        if (hit) {
          selectedPlaneRef.current = hit.object;
          alert('Plane selected');
        }
      }

      if (!sel || drawingUI) return;

      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        const t = e.touches[0];
        const ndc = new THREE.Vector2((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1);
        raycasterRef.current.setFromCamera(ndc, camera);
        dragPlaneRef.current.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).normalize(), sel.position);
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, dragIntersectionRef.current)) {
          dragOffsetRef.current.copy(dragIntersectionRef.current).sub(sel.position);
          alert('Dragging started');
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistanceRef.current = Math.hypot(dx, dy);
        initialScaleRef.current = sel.scale.x;
        rotationStartAngleRef.current = Math.atan2(dy, dx);
        initialRotationYRef.current = sel.rotation.y;
        alert('Pinch + Rotate started');
      }
    });

    window.addEventListener('touchmove', e => {
      const sel = selectedPlaneRef.current;
      if (!sel || drawingUI) return;

      if (e.touches.length === 1 && isDraggingRef.current) {
        const t = e.touches[0];
        const ndc = new THREE.Vector2((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1);
        raycasterRef.current.setFromCamera(ndc, camera);
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, dragIntersectionRef.current)) {
          sel.position.copy(dragIntersectionRef.current.sub(dragOffsetRef.current));
          alert('Plane moved to', sel.position);
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.hypot(dx, dy);
        const scale = initialScaleRef.current * (newDistance / initialDistanceRef.current);
        sel.scale.set(scale, scale, scale);
        const angle = Math.atan2(dy, dx);
        sel.rotation.y = initialRotationYRef.current + (angle - rotationStartAngleRef.current);
        alert('Plane scaled and rotated', { scale, rotationY: sel.rotation.y });
      }
    });

    window.addEventListener('touchend', () => {
      isDraggingRef.current = false;
      alert('Touch ended - drag stopped');
    });

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controllerRef.current = controller;
  }, [drawingUI, currentMaterial, isNewARDrawingReady]);

  return (
    <div ref={containerRef}>
      <canvas id="drawingCanvas" ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
      {drawingUI && (
        <div className="controls" style={{ position: 'fixed', top: 10, left: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 8 }}>
          <div className="row" style={{ display: 'flex', gap: 10 }}>
            <label>Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
            <label>Brush: <input type="range" min="1" max="50" value={brush} onChange={e => setBrush(e.target.value)} /></label>
            <button onClick={prepareARTexture}>Draw → AR</button>
          </div>
          <div className="row" style={{ display: 'flex', gap: 10 }}>
            <button onClick={clearCanvas}>Clear</button>
            <button onClick={deleteAllPlanes}>Delete All</button>
          </div>
        </div>
      )}
      {drawingUI && (
        <div className="hamburger" style={{ position: 'fixed', top: 10, right: 10, fontSize: 28, zIndex: 3, background: 'rgba(255,255,255,0.9)', padding: '5px 10px', borderRadius: 8 }} onClick={() => setDrawingUI(false)}>
          ☰
        </div>
      )}
    </div>
  );
}
