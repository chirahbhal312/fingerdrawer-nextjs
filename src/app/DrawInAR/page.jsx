// App.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { WebGLRenderer } from "three";

export default function Home() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  // Drawing state
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#FFFFFF");
  const [lineThickness, setLineThickness] = useState(5);
  const [tool, setTool] = useState("pencil");
  const [isFilled, setIsFilled] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const points = useRef([]);
  const startPoint = useRef(null);
  const polygonPoints = useRef([]);

  useEffect(() => {
    // Setup Three.js scene, renderer, and camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    canvasRef.current.appendChild(renderer.domElement);

    // Add ambient light
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // Setup 2D drawing canvas
    const ctx = drawingCanvasRef.current.getContext("2d");
    drawingCanvasRef.current.width = window.innerWidth;
    drawingCanvasRef.current.height = window.innerHeight;

    const draw = (event) => {
      const rect = drawingCanvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (isDrawing && tool === "pencil") {
        points.current.push({ x, y });
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = color;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(points.current.at(-2)?.x ?? x, points.current.at(-2)?.y ?? y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (isDrawing && tool === "eraser") {
        ctx.clearRect(x - lineThickness / 2, y - lineThickness / 2, lineThickness, lineThickness);
      } else if (tool === "rectangle" || tool === "circle") {
        if (startPoint.current) {
          ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
          // ... rectangle/circle logic same as before ...
        }
      } else if (tool === "triangle" || tool === "polygon") {
        // ... triangle/polygon logic same as before ...
      }
    };

    const handleMouseDown = (event) => {
      const rect = drawingCanvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setIsDrawing(true);

      if (tool === "rectangle" || tool === "circle") {
        startPoint.current = { x, y };
      } else if (tool === "text") {
        const text = prompt("Enter text:");
        if (text) {
          ctx.fillStyle = color;
          ctx.font = "30px Arial";
          ctx.fillText(text, x, y);
        }
      } else if (tool === "triangle") {
        // ...
      }
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      startPoint.current = null;
    };

    drawingCanvasRef.current.addEventListener("mousedown", handleMouseDown);
    drawingCanvasRef.current.addEventListener("mouseup", handleMouseUp);
    drawingCanvasRef.current.addEventListener("mousemove", draw);

    const animate = () => {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      drawingCanvasRef.current.removeEventListener("mousedown", handleMouseDown);
      drawingCanvasRef.current.removeEventListener("mouseup", handleMouseUp);
      drawingCanvasRef.current.removeEventListener("mousemove", draw);
    };
  }, [color, fillColor, lineThickness, tool, isDrawing, isFilled]);

  // Clear function
  const clearCanvas = () => {
    const ctx = drawingCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    points.current = [];
    polygonPoints.current = [];
  };

  // Start AR function
  const startAR = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Texture from 2D canvas
    const canvasTexture = new THREE.CanvasTexture(drawingCanvasRef.current);
    canvasTexture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({ map: canvasTexture, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    plane.position.set(0, 0, -1); // 1m in front
    scene.add(plane);

    const arBtn = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
    });
    if (!document.getElementById("ar-button")) {
      arBtn.id = "ar-button";
      document.body.appendChild(arBtn);
    }

    navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"] })
      .then((session) => {
        renderer.xr.setSession(session);
      });
  };

  return (
    <div className="relative w-full h-screen">
      <h1 className="text-4xl font-bold text-center mb-6">AR Painting App</h1>

      <div ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
      <canvas
        ref={drawingCanvasRef}
        className="absolute top-0 left-0 z-10 w-full h-full"
      />

      <div className="absolute top-4 left-4 z-20 p-4 bg-white bg-opacity-75 rounded shadow-md">
        <div className="mb-3">
          <label className="block text-lg font-medium">Stroke Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full mt-2"
          />
        </div>
        <div className="mb-3">
          <label className="block text-lg font-medium">Fill Color:</label>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-full mt-2"
          />
        </div>
        <div className="mb-3">
          <label className="block text-lg font-medium">Fill Shapes:</label>
          <input
            type="checkbox"
            checked={isFilled}
            onChange={(e) => setIsFilled(e.target.checked)}
            className="mr-2"
          />
          <span>Enable filling shapes</span>
        </div>
        <div className="mb-3">
          <button
            onClick={() => setTool(tool === "pencil" ? "eraser" : "pencil")}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-700"
          >
            Switch to {tool === "pencil" ? "Eraser" : "Pencil"}
          </button>
        </div>
        <div>
          <button
            onClick={clearCanvas}
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-700"
          >
            Clear Canvas
          </button>
        </div>
        <div className="mt-2">
          <button
            onClick={startAR}
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-700"
          >
            Start AR
          </button>
        </div>
      </div>
    </div>
  );
}
