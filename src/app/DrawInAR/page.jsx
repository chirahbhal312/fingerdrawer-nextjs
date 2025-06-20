'use client';

import { useEffect, useRef, useState } from 'react';

// Dynamic import to use import maps with Three.js
let THREE, ARButton;
(async () => {
  THREE = await import('three');
  ARButton = (await import('three/examples/jsm/webxr/ARButton.js')).ARButton;
})();

export default function HomePage() {
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.75;
    const context = canvas.getContext('2d');
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#000000';
    setCtx(context);
  }, []);

  const startDrawing = (x, y) => {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (x, y) => {
    if (!isDrawing || !ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      initAR(dataUrl);
    }
  };

  const getTouchPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  };

  const initAR = async (dataUrl) => {
    if (!THREE || !ARButton) return;

    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const texture = new THREE.TextureLoader().load(dataUrl);
    const geometry = new THREE.PlaneGeometry(1, 0.75);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(0, 0, -1);
    scene.add(plane);

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  };

  return (
    <main style={styles.main}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={(e) => startDrawing(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
        onMouseMove={(e) => draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
          const { x, y } = getTouchPos(e);
          startDrawing(x, y);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const { x, y } = getTouchPos(e);
          draw(x, y);
        }}
        onTouchEnd={stopDrawing}
      />
    </main>
  );
}

const styles = {
  main: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    overflow: 'hidden',
    background: '#f5f5f5',
  },
  canvas: {
    height: '75vh',
    width: '100%',
    background: 'transparent',
    cursor: 'crosshair',
    touchAction: 'none',
  },
};
