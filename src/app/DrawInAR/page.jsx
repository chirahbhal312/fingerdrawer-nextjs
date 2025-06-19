'use client';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

export default function Page() {
  const canvasRef = useRef();
  const isDrawing = useRef(false);
  const lastPos = useRef([0, 0]);
  const colorRef = useRef('#000000');
  const brushRef = useRef(5);

  const [material, setMaterial] = useState(null);
  const [ready, setReady] = useState(false);

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const hitTestSourceRef = useRef(null);
  const localSpaceRef = useRef(null);
  const reticleRef = useRef();

  // Drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const start = (x, y) => {
      isDrawing.current = true;
      lastPos.current = [x, y];
    };
    const draw = (x, y) => {
      if (!isDrawing.current) return;
      const [lx, ly] = lastPos.current;
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = brushRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPos.current = [x, y];
    };
    const end = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const url = canvas.toDataURL('image/png');
      new THREE.TextureLoader().load(url, tex => {
        setMaterial(new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
        }));
        setReady(true);
      });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Mouse events
    canvas.addEventListener('mousedown', e => start(e.offsetX, e.offsetY));
    canvas.addEventListener('mousemove', e => draw(e.offsetX, e.offsetY));
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseout', end);

    // Touch events
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
      e.preventDefault();
    });
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0];
      draw(t.clientX, t.clientY);
      e.preventDefault();
    });
    canvas.addEventListener('touchend', end);

    return () => window.removeEventListener('resize', resize);
  }, []);

  // AR + Hit-Test setup
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const button = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    document.body.appendChild(button);

    // Reticle tells where objects will be placed
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.11, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    renderer.xr.addEventListener('sessionstart', () => {
      const session = renderer.xr.getSession();
      session.requestReferenceSpace('viewer').then(ref => {
        session.requestHitTestSource({ space: ref }).then(source => {
          hitTestSourceRef.current = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRef.current = null;
      });
    });

    renderer.xr.addEventListener('sessionend', () => {
      reticle.visible = false;
    });

    const controller = renderer.xr.getController(0);
    scene.add(controller);
    controller.addEventListener('select', () => {
      if (!ready || !material || !reticle.visible) return;
      const geometry = new THREE.PlaneGeometry(
        0.4, 0.4 * (canvasRef.current.width / canvasRef.current.height)
      );
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.setFromMatrixPosition(reticle.matrix);
      mesh.quaternion.setFromRotationMatrix(reticle.matrix);
      scene.add(mesh);
      setReady(false);
    });

    renderer.setAnimationLoop((time, frame) => {
      if (frame && hitTestSourceRef.current) {
        const refSpace = renderer.xr.getReferenceSpace();
        const hits = frame.getHitTestResults(hitTestSourceRef.current);
        if (hits.length > 0) {
          const hit = hits[0];
          const pose = hit.getPose(refSpace);
          reticle.matrix.fromArray(pose.transform.matrix);
          reticle.visible = true;
        } else {
          reticle.visible = false;
        }
      }
      renderer.render(scene, camera);
    });

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
  }, [ready, material]);

  return (
    <>
      <div id="hamburger" className="hamburger hidden" onClick={() => document.getElementById('drawingUI')?.classList.toggle('hidden')}>☰</div>
      <div id="drawingUI" className="controls hidden">
        <div className="row">
          <label>Color: <input type="color" defaultValue="#000000" onChange={e => colorRef.current = e.target.value} /></label>
          <label>Brush: <input type="range" min="1" max="50" defaultValue="5" onChange={e => brushRef.current = e.target.value} /></label>
          <button onClick={() => {
            const url = canvasRef.current.toDataURL('image/png');
            new THREE.TextureLoader().load(url, tex => {
              setMaterial(new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                side: THREE.DoubleSide,
              }));
              setReady(true);
            });
          }}>Draw → AR</button>
        </div>
        <div className="row">
          <button onClick={() => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }}>Clear</button>
          <button onClick={() => {
            sceneRef.current.children
              .filter(o => o.isMesh && o.geometry.type === 'PlaneGeometry')
              .forEach(o => sceneRef.current.remove(o));
          }}>Delete All</button>
        </div>
      </div>
      <canvas ref={canvasRef} className="drawing-canvas"></canvas>

      <style jsx global>{`
        html, body {
          margin: 0; overflow: hidden; height: 100%; background: black;
        }
        .hamburger {
          position: fixed; top:10px; right:10px; font-size:28px; z-index:3;
          background:rgba(255,255,255,0.9); padding:5px 10px; border-radius:8px; cursor:pointer;
        }
        .controls {
          position: fixed; top:10px; left:10px; z-index:2;
          background:rgba(255,255,255,0.9); padding:10px; border-radius:8px;
          display:flex; flex-direction:column; gap:10px;
        }
        .row {
          display:flex; gap:10px;
        }
        canvas.drawing-canvas {
          position:absolute; top:0; left:0; z-index:1; touch-action:none;
        }
      `}</style>
    </>
  );
}
