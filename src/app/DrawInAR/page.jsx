'use client';

import { useEffect, useRef, useState } from 'react';

let THREE, ARButton;
(async () => {
  THREE = await import('three');
  ARButton = (await import('three/examples/jsm/webxr/ARButton.js')).ARButton;
})();

export default function HomePage() {
  const canvasRef = useRef(null);
  const webglRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [inAR, setInAR] = useState(false);

  const arSession = useRef({
    initialized: false,
    scene: null,
    camera: null,
    renderer: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const context = canvas.getContext('2d');
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#000';
    setCtx(context);

    (async () => {
      const THREE = await import('three');
      const { ARButton } = await import('three/examples/jsm/webxr/ARButton.js');
      arSession.current.THREE = THREE;
      arSession.current.ARButton = ARButton;
      if (webglRef.current) initARSession();
    })();
  }, []);

  const initARSession = () => {
    const { THREE, ARButton } = arSession.current;
    if (!THREE || !ARButton || !webglRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: webglRef.current,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    arSession.current = { ...arSession.current, initialized: true, renderer, scene, camera };

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['local'],
      optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
      domOverlay: { root: document.getElementById('ar-overlay-container') }
    });
    document.body.appendChild(arButton);

    renderer.xr.addEventListener('sessionstart', () => setInAR(true));
    renderer.xr.addEventListener('sessionend', () => setInAR(false));

    renderer.setAnimationLoop(() => renderer.render(scene, camera));
  };

  const placeDrawingInFront = (dataUrl) => {
    const { THREE, scene, renderer } = arSession.current;
    const texture = new THREE.TextureLoader().load(dataUrl, () => {
      const aspect = texture.image.width / texture.image.height;
      const height = 0.75;
      const width = height * aspect;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true })
      );
      mesh.position.set(0, 0, -1);
      mesh.quaternion.set(0, 0, 0, 1);

      const group = new THREE.Group();
      group.add(mesh);

      const xrCam = renderer.xr.getCamera();
      group.position.copy(xrCam.position);
      group.quaternion.copy(xrCam.quaternion);

      scene.add(group);
      setDrawings(prev => [...prev, group]);
    });
  };

  const clearAllDrawings = () => {
    const { scene } = arSession.current;
    drawings.forEach(group => scene.remove(group));
    setDrawings([]);
  };

  const startDrawing = (x, y) => {
    if (!inAR || !ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const draw = (x, y) => { if (isDrawing && ctx) ctx.lineTo(x, y), ctx.stroke(); };
  const stopDrawing = () => {
    if (!inAR || !ctx || !canvasRef.current) return;
    setIsDrawing(false);
    const dataUrl = canvasRef.current.toDataURL();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    placeDrawingInFront(dataUrl);
  };
  const getTouchPos = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  };

  return (
    <>
      <div id="ar-overlay-container" style={overlayStyle}>
        {inAR && (
          <>
            <div style={styles.ui}>
              <button onClick={clearAllDrawings} style={styles.button}>Clear All</button>
            </div>
            <canvas
              ref={canvasRef}
              style={styles.canvas}
              onMouseDown={e => startDrawing(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
              onMouseMove={e => draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={e => { const { x, y } = getTouchPos(e); startDrawing(x, y); }}
              onTouchMove={e => { e.preventDefault(); const { x, y } = getTouchPos(e); draw(x, y); }}
              onTouchEnd={stopDrawing}
            />
          </>
        )}
      </div>

      <canvas ref={webglRef} style={styles.webglCanvas} />
    </>
  );
}

const overlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  zIndex: 10,
  pointerEvents: 'auto', // allow the overlay to receive input
};

const styles = {
  canvas: {
    width: '100%',
    height: '100%',
    background: 'transparent',
    touchAction: 'none',
    cursor: 'crosshair',
    zIndex: 15,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  webglCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1,
  },
  ui: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 20,
  },
  button: {
    padding: '10px 15px',
    fontSize: '16px',
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  },
};
