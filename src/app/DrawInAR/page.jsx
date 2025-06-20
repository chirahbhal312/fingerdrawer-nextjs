"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

export default function HomePage() {
  const canvasRef = useRef(null);
  const drawingUIRef = useRef(null);
  const hamburgerRef = useRef(null);
  const colorPickerRef = useRef(null);
  const brushSizeRef = useRef(null);
  const clearButtonRef = useRef(null);
  const enterARButtonRef = useRef(null);
  const deleteAllPlanesButtonRef = useRef(null);
  const overlayRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState([0, 0]);
  const [isNewARDrawingReady, setIsNewARDrawingReady] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);

  const [sceneState, setSceneState] = useState({
    scene: null,
    camera: null,
    renderer: null,
    controller: null,
    selectedPlane: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function startDrawing(x, y) {
      setDrawing(true);
      setLastPos([x, y]);
    }

    function drawLine(x, y) {
      if (!drawing) return;
      ctx.strokeStyle = colorPickerRef.current.value;
      ctx.lineWidth = brushSizeRef.current.value;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(...lastPos);
      ctx.lineTo(x, y);
      ctx.stroke();
      setLastPos([x, y]);
    }

    const updateTexture = () => {
      const dataURL = canvas.toDataURL("image/png");
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(dataURL, (texture) => {
        setCurrentMaterial(
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          })
        );
        setIsNewARDrawingReady(true);
      });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    canvas.addEventListener("mousedown", (e) => startDrawing(e.offsetX, e.offsetY));
    canvas.addEventListener("mousemove", (e) => drawLine(e.offsetX, e.offsetY));
    canvas.addEventListener("mouseup", () => setDrawing(false));
    canvas.addEventListener("mouseout", () => setDrawing(false));

    canvas.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      startDrawing(touch.clientX, touch.clientY);
      e.preventDefault();
    });

    canvas.addEventListener("touchmove", (e) => {
      const touch = e.touches[0];
      drawLine(touch.clientX, touch.clientY);
      e.preventDefault();
    });

    canvas.addEventListener("touchend", updateTexture);

    clearButtonRef.current.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    enterARButtonRef.current.addEventListener("click", updateTexture);

    hamburgerRef.current.addEventListener("click", () => {
      drawingUIRef.current.classList.toggle("hidden");
    });

    const initAR = () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      document.body.appendChild(renderer.domElement);

      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: overlayRef.current },
      });
      document.body.appendChild(arButton);

      const controller = renderer.xr.getController(0);
      scene.add(controller);

      controller.addEventListener("select", () => {
        if (!isNewARDrawingReady || !currentMaterial) return;
        const aspect = canvas.width / canvas.height;
        const geometry = new THREE.PlaneGeometry(0.4, 0.4 / aspect);
        const plane = new THREE.Mesh(geometry, currentMaterial.clone());
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        plane.position.copy(camera.position).add(dir.multiplyScalar(1.5));
        plane.quaternion.copy(camera.quaternion);
        plane.userData.scale = 1;
        scene.add(plane);
        setSceneState((prev) => ({ ...prev, selectedPlane: plane }));
        setIsNewARDrawingReady(false);
      });

      renderer.setAnimationLoop(() => renderer.render(scene, camera));

      setSceneState({ scene, camera, renderer, controller, selectedPlane: null });
    };

    deleteAllPlanesButtonRef.current.addEventListener("click", () => {
      const { scene } = sceneState;
      if (!scene) return;
      scene.children = scene.children.filter((obj) => {
        if (obj.isMesh && obj.geometry?.type === "PlaneGeometry") {
          scene.remove(obj);
          return false;
        }
        return true;
      });
      setSceneState((prev) => ({ ...prev, selectedPlane: null }));
    });

    initAR();

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [drawing, lastPos, isNewARDrawingReady, currentMaterial, sceneState]);

  return (
    <div ref={overlayRef} id="overlay-root">
      <div ref={hamburgerRef} className="hamburger hidden">☰</div>
      <div ref={drawingUIRef} id="drawingUI" className="hidden">
        <div className="controls">
          <div className="row">
            <label>Color: <input ref={colorPickerRef} type="color" defaultValue="#000000" /></label>
            <label>Brush: <input ref={brushSizeRef} type="range" min="1" max="50" defaultValue="5" /></label>
            <button ref={enterARButtonRef}>Draw → AR</button>
          </div>
          <div className="row">
            <button ref={clearButtonRef}>Clear</button>
            <button ref={deleteAllPlanesButtonRef}>Delete All</button>
          </div>
        </div>
        <canvas id="drawingCanvas" ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1, touchAction: "none" }} />
      </div>
      <style jsx>{`
        html, body {
          margin: 0;
          overflow: hidden;
          height: 100%;
          background-color: black;
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
        .hidden {
          display: none;
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
        .controls .row {
          display: flex;
          gap: 10px;
        }
        button {
          padding: 5px 10px;
        }
      `}</style>
    </div>
  );
}
