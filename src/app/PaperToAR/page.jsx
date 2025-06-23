'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Brush, Eraser, Download, Palette, RotateCcw, Settings } from 'lucide-react';

const defaultColors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
  '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#90EE90', '#FFB6C1',
];

export default function PaintingApp() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = tool === 'brush' ? brushColor : 'rgba(0,0,0,1)';
    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveAndRedirect = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    sessionStorage.setItem('drawingImage', dataURL);
    window.location.href = '/page3';
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#color-popover')) setShowColorPopover(false);
      if (!e.target.closest('#settings-popover')) setShowSettingsPopover(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Panel */}
      <div className="h-[10vh] bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Paint App</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded border hover:bg-gray-100" onClick={clearCanvas}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <button className="p-2 rounded border hover:bg-gray-100" onClick={saveAndRedirect}>
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div className="h-[70vh] relative">
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
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <button
              className={`p-2 rounded ${tool === 'brush' ? 'bg-blue-500 text-white' : 'border hover:bg-gray-100'}`}
              onClick={() => setTool('brush')}
            >
              <Brush className="w-4 h-4" />
            </button>
            <button
              className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'border hover:bg-gray-100'}`}
              onClick={() => setTool('eraser')}
            >
              <Eraser className="w-4 h-4" />
            </button>

            {/* Color Picker */}
            <div className="relative" id="color-popover">
              <button className="p-2 rounded border hover:bg-gray-100" onClick={() => setShowColorPopover(!showColorPopover)}>
                <Palette className="w-4 h-4" />
              </button>
              {showColorPopover && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded-md shadow-lg p-4 z-10 w-64">
                  <label className="text-sm font-medium mb-2 block">Colors</label>
                  <div className="grid grid-cols-5 gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded border-2 ${brushColor === color ? 'border-black scale-110' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setBrushColor(color)}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2 items-center">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-12 h-8 border rounded"
                    />
                    <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => setBrushColor(customColor)}>
                      Use
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Settings */}
          <div className="relative" id="settings-popover">
            <button
              className="p-2 rounded border hover:bg-gray-100"
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            >
              <Settings className="w-4 h-4" />
            </button>
            {showSettingsPopover && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-md shadow-lg p-4 z-10 w-64">
                <label className="text-sm font-medium mb-2 block">Brush Size: {brushSize}px</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
