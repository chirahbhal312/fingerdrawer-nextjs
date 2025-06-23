'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Brush, Eraser, Palette, RotateCcw, Settings } from 'lucide-react';

const defaultColors = [/* same as before */];

export default function PaintingApp() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [isClearActive, setIsClearActive] = useState(false);
  const [isViewArActive, setIsViewArActive] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveAndRedirect = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    sessionStorage.setItem('drawingImage', dataURL);
    window.location.href = '/page3';
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#color-popover')) setShowColorPopover(false);
      if (!e.target.closest('#settings-popover')) setShowSettingsPopover(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buttonClass = (active) =>
    `p-2 rounded text-white ${active ? 'bg-green-600' : 'bg-blue-500'} hover:opacity-90 active:bg-green-700`;

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Panel */}
      <div className="h-[10vh] bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Paint App</h1>
        <button
          className={buttonClass(isClearActive)}
          onClick={clearCanvas}
          onMouseDown={() => setIsClearActive(true)}
          onMouseUp={() => setIsClearActive(false)}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <div className="h-[70vh] relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Bottom Panel */}
      <div className="h-[10vh] bg-white border-t shadow-lg p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          {/* Left */}
          <div className="flex items-center gap-2">
            <button
              className={buttonClass(tool === 'brush')}
              onClick={() => setTool('brush')}
            >
              <Brush className="w-4 h-4" />
            </button>

            <div className="relative" id="color-popover">
              <button
                className={buttonClass(showColorPopover)}
                onClick={() => setShowColorPopover(!showColorPopover)}
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center */}
          <button
            className={buttonClass(isViewArActive)}
            onClick={saveAndRedirect}
            onMouseDown={() => setIsViewArActive(true)}
            onMouseUp={() => setIsViewArActive(false)}
          >
            View in AR
          </button>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              className={buttonClass(tool === 'eraser')}
              onClick={() => setTool('eraser')}
            >
              <Eraser className="w-4 h-4" />
            </button>

            <div className="relative" id="settings-popover">
              <button
                className={buttonClass(showSettingsPopover)}
                onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
