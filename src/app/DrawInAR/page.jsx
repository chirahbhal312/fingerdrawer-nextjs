'use client';

import { useEffect, useRef, useState } from 'react';

export default function Page() {
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [color, setColor] = useState('#000000');
  const [brush, setBrush] = useState(5);
  const [showUI, setShowUI] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const _ctx = canvas.getContext('2d');
    setCtx(_ctx);
    console.log('Canvas context initialized');

    const resize = () => {
      console.log('Resizing canvas...');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (x, y) => {
      drawing = true;
      [lastX, lastY] = [x, y];
      console.log(`Started drawing at (${x}, ${y})`);
    };

    const drawLine = (x, y) => {
      if (!drawing) return;
      console.log(`Drawing line to (${x}, ${y})`);
      _ctx.strokeStyle = color;
      _ctx.lineWidth = brush;
      _ctx.lineCap = 'round';
      _ctx.beginPath();
      _ctx.moveTo(lastX, lastY);
      _ctx.lineTo(x, y);
      _ctx.stroke();
      [lastX, lastY] = [x, y];
    };

    const stopDrawing = () => {
      drawing = false;
      console.log('Stopped drawing');
    };

    // Mouse
    canvas.addEventListener('mousedown', e => startDrawing(e.offsetX, e.offsetY));
    canvas.addEventListener('mousemove', e => drawLine(e.offsetX, e.offsetY));
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      console.log(`Touch start at (${t.clientX}, ${t.clientY})`);
      startDrawing(t.clientX, t.clientY);
      e.preventDefault();
    });
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0];
      drawLine(t.clientX, t.clientY);
      e.preventDefault();
    });
    canvas.addEventListener('touchend', () => {
      drawing = false;
      console.log('Touch end, stopped drawing');
    });

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [color, brush]);

  const clearCanvas = () => {
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      console.log('Canvas cleared');
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        id="drawingCanvas"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, touchAction: 'none' }}
      />

      {showUI && (
        <div className="controls" style={{
          position: 'fixed', top: 10, left: 10, zIndex: 2,
          background: 'rgba(255,255,255,0.9)', padding: 10,
          borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <label>Color: <input type="color" value={color} onChange={e => {
              console.log(`Color changed to ${e.target.value}`);
              setColor(e.target.value);
            }} /></label>
            <label>Brush: <input type="range" min="1" max="50" value={brush} onChange={e => {
              console.log(`Brush size changed to ${e.target.value}`);
              setBrush(e.target.value);
            }} /></label>
            <button onClick={clearCanvas}>Clear</button>
          </div>
        </div>
      )}

      <div
        className="hamburger"
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 3,
          fontSize: 28, background: 'rgba(255,255,255,0.9)',
          padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
        }}
        onClick={() => {
          setShowUI(!showUI);
          console.log(`Toggled UI: now ${!showUI ? 'shown' : 'hidden'}`);
        }}
      >
        ☰
      </div>
    </div>
  );
}
