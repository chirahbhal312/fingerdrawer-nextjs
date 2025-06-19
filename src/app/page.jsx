"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WebGLRenderer } from "three";

export default function PaintingApp() {
  const threeCanvasWrapper = useRef(null);
  const drawCanvasRef = useRef(null);
  
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#FFFFFF");
  const [thickness, setThickness] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  
  const pointsRef = useRef([]);
  const startPoint = useRef(null);
  const polygonPoints = useRef([]);

  useEffect(() => {
    // three.js blank background setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 5;
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    threeCanvasWrapper.current.appendChild(renderer.domElement);
    const renderLoop = () => { renderer.render(scene, camera); requestAnimationFrame(renderLoop); };
    renderLoop();

    // resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      drawCanvasRef.current.width = window.innerWidth;
      drawCanvasRef.current.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // drawing canvas init
    drawCanvasRef.current.width = window.innerWidth;
    drawCanvasRef.current.height = window.innerHeight;
    const ctx = drawCanvasRef.current.getContext("2d");

    // core drawing routine
    function redrawPreview(x, y) {
      if (tool === "pencil" || tool === "eraser") return;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.fillStyle = fillColor;
      ctx.lineJoin = ctx.lineCap = "round";
      const dx = x - startPoint.current.x;
      const dy = y - startPoint.current.y;

      if (tool === "rectangle") {
        if (isFilled) ctx.fillRect(startPoint.current.x, startPoint.current.y, dx, dy);
        ctx.strokeRect(startPoint.current.x, startPoint.current.y, dx, dy);
      }
      else if (tool === "circle") {
        const r = Math.hypot(dx, dy);
        ctx.beginPath();
        ctx.arc(startPoint.current.x, startPoint.current.y, r, 0, 2*Math.PI);
        if (isFilled) ctx.fill();
        ctx.stroke();
      }
      else if (tool === "triangle" && polygonPoints.current.length === 1) {
        ctx.beginPath();
        ctx.moveTo(startPoint.current.x, startPoint.current.y);
        ctx.lineTo(x, y);
        ctx.lineTo(polygonPoints.current[0].x, polygonPoints.current[0].y);
        ctx.closePath();
        if (isFilled) ctx.fill();
        ctx.stroke();
      }
    }

    // event handlers
    function onDown(e) {
      setIsDrawing(true);
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;
      if (tool === "pencil" || tool === "eraser") {
        pointsRef.current = [{ x, y }];
      } else if (["rectangle","circle"].includes(tool)) {
        startPoint.current = { x, y };
      }
    }
    function onMove(e) {
      if (!isDrawing) return;
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;
      if (tool === "pencil" || tool === "eraser") {
        pointsRef.current.push({ x, y });
        ctx.lineWidth = thickness;
        ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.beginPath();
        const p0 = pointsRef.current[pointsRef.current.length-2];
        ctx.moveTo(p0?.x ?? x, p0?.y ?? y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        redrawPreview(x, y);
      }
    }
    function onUp(e) {
      setIsDrawing(false);
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const x = t.clientX, y = t.clientY;
      if (["rectangle","circle"].includes(tool)) redrawPreview(x, y);
      if (tool === "triangle") {
        if (polygonPoints.current.length === 0) {
          startPoint.current = { x, y };
          polygonPoints.current.push({ x, y });
        } else {
          redrawPreview(x, y);
          polygonPoints.current = [];
        }
      }
    }

    ["mousedown","touchstart"].forEach(evt => drawCanvasRef.current.addEventListener(evt, onDown));
    ["mousemove","touchmove"].forEach(evt => drawCanvasRef.current.addEventListener(evt, onMove));
    ["mouseup","touchend"].forEach(evt => drawCanvasRef.current.addEventListener(evt, onUp));

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [color, thickness, tool, isFilled]);

  const clearCanvas = () => {
    const ctx = drawCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={threeCanvasWrapper} style={{ position: "absolute", inset: 0 }} />
      <canvas ref={drawCanvasRef} style={{ position: "absolute", inset: 0, zIndex: 10 }} />

      <div style={{
        position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,0.8)",
        padding: "10px", borderRadius: "8px", display:"grid", gap:"8px", fontFamily:"sans-serif"
      }}>
        <div>
          <button onClick={() => setTool(tool==="pencil"?"eraser":"pencil")}>
            {tool==="pencil"?"Switch to Eraser":"Switch to Pencil"}
          </button>
        </div>
        <label>Color: <input type="color" value={color} onChange={e=>setColor(e.target.value)} /></label>
        <label>Fill Color: <input type="color" value={fillColor} onChange={e=>setFillColor(e.target.value)} /></label>
        <label>Thickness:
           <input type="range" min="1" max="30"
             value={thickness} onChange={e=>setThickness(+e.target.value)} />
           {thickness}
        </label>
        <div>
          Tool:
          {["pencil","rectangle","circle","triangle"].map(t => (
            <button key={t} disabled={tool===t} onClick={()=>setTool(t)} style={{ margin: "0 4px" }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <label><input type="checkbox" checked={isFilled} onChange={e=>setIsFilled(e.target.checked)} /> Fill?</label>
        <button onClick={clearCanvas} style={{ marginTop: "8px", background:"#f66", color:"#fff" }}>Clear Canvas</button>
      </div>
    </div>
  );
}
