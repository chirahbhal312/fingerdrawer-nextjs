"use client";
import { useRef, useEffect, useState } from "react";

export default function PaintApp() {
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [lineThickness, setLineThickness] = useState(5);
  const [tool, setTool] = useState("pencil");
  const [isFilled, setIsFilled] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const points = useRef([]);
  const startPoint = useRef(null);
  const polygonPoints = useRef([]);
  const savedImage = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.8;

    const draw = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!isDrawing) return;

      if (tool === "pencil") {
        points.current.push({ x, y });
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = color;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.beginPath();
        const last = points.current.at(-2);
        ctx.moveTo(last?.x ?? x, last?.y ?? y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      if (tool === "eraser") {
        ctx.clearRect(x - lineThickness / 2, y - lineThickness / 2, lineThickness, lineThickness);
      }

      if ((tool === "rectangle" || tool === "circle") && startPoint.current) {
        const w = x - startPoint.current.x;
        const h = y - startPoint.current.y;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(savedImage.current, 0, 0); // restore previous state
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = color;

        if (tool === "rectangle") {
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(startPoint.current.x, startPoint.current.y, w, h);
          }
          ctx.strokeRect(startPoint.current.x, startPoint.current.y, w, h);
        }

        if (tool === "circle") {
          const radius = Math.sqrt(w * w + h * h);
          ctx.beginPath();
          ctx.arc(startPoint.current.x, startPoint.current.y, radius, 0, Math.PI * 2);
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fill();
          }
          ctx.stroke();
        }
      }
    };

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      savedImage.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (tool === "rectangle" || tool === "circle") {
        startPoint.current = { x, y };
      }

      if (tool === "text") {
        const text = prompt("Enter text:");
        if (text) {
          ctx.fillStyle = color;
          ctx.font = "30px Arial";
          ctx.fillText(text, x, y);
        }
        setIsDrawing(false);
      }

      if (tool === "triangle") {
        polygonPoints.current.push({ x, y });
        if (polygonPoints.current.length === 3) {
          ctx.beginPath();
          ctx.moveTo(polygonPoints.current[0].x, polygonPoints.current[0].y);
          ctx.lineTo(polygonPoints.current[1].x, polygonPoints.current[1].y);
          ctx.lineTo(polygonPoints.current[2].x, polygonPoints.current[2].y);
          ctx.closePath();
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fill();
          }
          ctx.stroke();
          polygonPoints.current = [];
          setIsDrawing(false);
        }
      }

      if (tool === "polygon") {
        polygonPoints.current.push({ x, y });
        if (polygonPoints.current.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(polygonPoints.current[0].x, polygonPoints.current[0].y);
          polygonPoints.current.forEach((pt) => ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fill();
          }
          ctx.stroke();
        }
      }
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      startPoint.current = null;
      points.current = [];
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [tool, color, fillColor, lineThickness, isFilled, isDrawing]);

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    points.current = [];
    polygonPoints.current = [];
  };

  return (
    <div>
      <canvas ref={canvasRef} className="w-full" style={{ height: "80vh" }} />
      <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-lg max-w-xs z-10">
        <h2 className="text-xl font-bold mb-3">Paint Controls</h2>
        <div className="mb-2">
          <label className="block">Stroke Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full" />
        </div>
        <div className="mb-2">
          <label className="block">Fill Color</label>
          <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-full" />
        </div>
        <div className="mb-2">
          <label className="block">Thickness</label>
          <input type="range" min="1" max="30" value={lineThickness} onChange={(e) => setLineThickness(parseInt(e.target.value))} className="w-full" />
        </div>
        <div className="mb-2">
          <label className="block">Tool</label>
          <select value={tool} onChange={(e) => setTool(e.target.value)} className="w-full">
            <option value="pencil">Pencil</option>
            <option value="eraser">Eraser</option>
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
            <option value="polygon">Polygon</option>
            <option value="text">Text</option>
          </select>
        </div>
        <div className="mb-2">
          <label>
            <input type="checkbox" checked={isFilled} onChange={(e) => setIsFilled(e.target.checked)} className="mr-2" />
            Fill Shape
          </label>
        </div>
        <button onClick={clearCanvas} className="mt-2 w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
          Clear Canvas
        </button>
      </div>
    </div>
  );
}
