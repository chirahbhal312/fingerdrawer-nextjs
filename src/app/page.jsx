"use client";
import { useEffect, useRef, useState } from "react";

export default function CanvasDrawingApp() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#FFFFFF");
  const [thickness, setThickness] = useState(5);
  const [isFilled, setIsFilled] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef([]);
  const startPoint = useRef(null);
  const polygonPoints = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.style.overflow = "hidden";

    const draw = (x, y) => {
      if (tool === "pencil" || tool === "eraser") {
        const points = pointsRef.current;
        points.push({ x, y });
        if (points.length < 2) return;
        ctx.lineWidth = thickness;
        ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = color;
        ctx.fillStyle = fillColor;
        ctx.lineJoin = ctx.lineCap = "round";

        if (startPoint.current) {
          const dx = x - startPoint.current.x;
          const dy = y - startPoint.current.y;

          if (tool === "rectangle") {
            if (isFilled) ctx.fillRect(startPoint.current.x, startPoint.current.y, dx, dy);
            ctx.strokeRect(startPoint.current.x, startPoint.current.y, dx, dy);
          } else if (tool === "circle") {
            const radius = Math.hypot(dx, dy);
            ctx.beginPath();
            ctx.arc(startPoint.current.x, startPoint.current.y, radius, 0, Math.PI * 2);
            if (isFilled) ctx.fill();
            ctx.stroke();
          } else if (tool === "triangle") {
            const [p1] = polygonPoints.current;
            ctx.beginPath();
            ctx.moveTo(startPoint.current.x, startPoint.current.y);
            ctx.lineTo(x, y);
            ctx.lineTo(p1?.x || x, p1?.y || y);
            ctx.closePath();
            if (isFilled) ctx.fill();
            ctx.stroke();
          }
        }
      }
    };

    const handleDown = (e) => {
      setIsDrawing(true);
      const t = e.touches?.[0] || e;
      const x = t.clientX;
      const y = t.clientY;

      if (tool === "pencil" || tool === "eraser") {
        pointsRef.current = [{ x, y }];
      } else if (tool === "rectangle" || tool === "circle") {
        startPoint.current = { x, y };
      } else if (tool === "triangle") {
        polygonPoints.current.push({ x, y });
        startPoint.current = { x, y };
      }
    };

    const handleMove = (e) => {
      if (!isDrawing) return;
      const t = e.touches?.[0] || e;
      draw(t.clientX, t.clientY);
    };

    const handleUp = () => {
      setIsDrawing(false);
      pointsRef.current = [];
      startPoint.current = null;
      if (tool !== "triangle") polygonPoints.current = [];
    };

    canvas.addEventListener("mousedown", handleDown);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleUp);
    canvas.addEventListener("touchstart", handleDown);
    canvas.addEventListener("touchmove", handleMove);
    canvas.addEventListener("touchend", handleUp);

    return () => {
      canvas.removeEventListener("mousedown", handleDown);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleUp);
      canvas.removeEventListener("touchstart", handleDown);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleUp);
    };
  }, [tool, color, thickness, fillColor, isFilled]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />

      <div style={{
        position: "absolute", top: 10, left: 10, background: "#fff",
        padding: "10px", borderRadius: "8px", display: "grid", gap: "10px",
        fontFamily: "sans-serif", zIndex: 10
      }}>
        <div>
          <button onClick={() => setTool(tool === "pencil" ? "eraser" : "pencil")}>
            {tool === "pencil" ? "Switch to Eraser" : "Switch to Pencil"}
          </button>
        </div>
        <label>Stroke Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
        <label>Fill Color: <input type="color" value={fillColor} onChange={e => setFillColor(e.target.value)} /></label>
        <label>
          Thickness:
          <input type="range" min="1" max="30" value={thickness} onChange={e => setThickness(+e.target.value)} />
          {thickness}
        </label>
        <div>
          Tool:
          {["pencil", "rectangle", "circle", "triangle"].map(t => (
            <button key={t} disabled={tool === t} onClick={() => setTool(t)} style={{ margin: "0 4px" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <label><input type="checkbox" checked={isFilled} onChange={e => setIsFilled(e.target.checked)} /> Fill?</label>
        <button onClick={clearCanvas} style={{ background: "#f66", color: "#fff" }}>Clear Canvas</button>
      </div>
    </div>
  );
}
