'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { WebGLRenderer } from 'three';

export default function Home() {
  const canvasRef = useRef(null);
  const arContainerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const toolbar = document.getElementById('toolbar')!;
    const colorPicker = document.getElementById('colorPicker')!;
    const brushSize = document.getElementById('brushSize')!;
    const brushType = document.getElementById('brushType')!;
    const shapeLine = document.getElementById('shapeLine')!;
    const shapeRect = document.getElementById('shapeRect')!;
    const shapeCircle = document.getElementById('shapeCircle')!;
    const eraserBtn = document.getElementById('eraser')!;
    const undoBtn = document.getElementById('undo')!;
    const clearBtn = document.getElementById('clear')!;
    const saveBtn = document.getElementById('save')!;
    const viewAR = document.getElementById('viewAR')!;

    // White page background
    document.body.style.backgroundColor = '#fff';

    let currentTool = 'brush';
    let drawing = false;
    let startX = 0, startY = 0;
    const actions: ImageData[] = [];

    // Resize canvas to fit window minus toolbar
    function resizeCanvas() {
      const prev = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - toolbar.clientHeight;
      ctx.putImageData(prev, 0, 0);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Make canvas background transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    function applySettings() {
      ctx.strokeStyle =
        currentTool === 'eraser' ? 'rgba(0,0,0,0)' : colorPicker.value;
      ctx.lineWidth = Number(brushSize.value);
      ctx.lineCap = brushType.value === 'round' ? 'round' : 'butt';
      ctx.lineJoin = 'round';
    }

    colorPicker.onchange = applySettings;
    brushSize.onchange = applySettings;
    brushType.onchange = applySettings;

    function setActive(btn: HTMLElement) {
      document
        .querySelectorAll('#toolbar button')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }

    shapeLine.onclick = () => { currentTool = 'line'; setActive(shapeLine); };
    shapeRect.onclick = () => { currentTool = 'rect'; setActive(shapeRect); };
    shapeCircle.onclick = () => { currentTool = 'circle'; setActive(shapeCircle); };
    eraserBtn.onclick = () => { currentTool = 'eraser'; setActive(eraserBtn); };
    clearBtn.onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      actions.length = 0;
    };
    undoBtn.onclick = () => {
      if (!actions.length) return;
      actions.pop();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      actions.forEach((img) => ctx.putImageData(img, 0, 0));
    };
    saveBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    function saveState() {
      actions.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (actions.length > 20) actions.shift();
    }

    function getPos(e: TouchEvent | MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const pt = (e as TouchEvent).touches
        ? (e as TouchEvent).touches[0]
        : (e as MouseEvent)e;
      return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
    }

    function start(e: TouchEvent | MouseEvent) {
      e.preventDefault();
      saveState();
      drawing = true;
      const p = getPos(e);
      startX = p.x; startY = p.y;
      if (currentTool === 'brush' || currentTool === 'eraser') {
        applySettings();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }
    }

    function draw(e: TouchEvent | MouseEvent) {
      if (!drawing) return;
      const p = getPos(e);
      if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.putImageData(actions[actions.length - 1], 0, 0);
        applySettings();
        ctx.beginPath();
        if (currentTool === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(p.x, p.y);
        }
        if (currentTool === 'rect') {
          ctx.rect(startX, startY, p.x - startX, p.y - startY);
        }
        if (currentTool === 'circle') {
          const r = Math.hypot(p.x - startX, p.y - startY);
          ctx.arc(startX, startY, r, 0, Math.PI * 2);
        }
        ctx.stroke();
      }
    }

    function end(e: TouchEvent | MouseEvent) {
      if (!drawing) return;
      drawing = false;
      if (currentTool !== 'brush' && currentTool !== 'eraser') draw(e);
      ctx.closePath();
    }

    ['mousedown','touchstart'].forEach((evt) => canvas.addEventListener(evt, start));
    ['mousemove','touchmove'].forEach((evt) => canvas.addEventListener(evt, draw));
    ['mouseup','mouseleave','touchend'].forEach((evt) => canvas.addEventListener(evt, end));

    viewAR.onclick = () => {
      // Create renderer and AR
      const renderer = new WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      arContainerRef.current!.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      scene.add(camera);

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Create plane with transparent texture
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.01,
        side: THREE.FrontSide,
      });
      const geo = new THREE.PlaneGeometry(0.6, 0.4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, -1); // place 1m ahead
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);

      document.body.appendChild(
        ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
      );

      renderer.setAnimationLoop(() => {
        tex.needsUpdate = true;
        renderer.render(scene, camera);
      });
    };
  }, []);

  return (
    <>
      <div
        id="toolbar"
        style={{
          background: '#444',
          padding: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          color: 'white',
        }}
      >
        <input type="color" id="colorPicker" defaultValue="#000000" />
        <select id="brushSize">{[4, 8, 12, 20, 30, 50].map((s) => (
          <option key={s}>{s}</option>
        ))}</select>
        <select id="brushType">
          <option value="round">Round</option>
          <option value="square">Square</option>
          <option value="calligraphy">Calligraphy</option>
        </select>
        <button id="shapeLine">Line</button>
        <button id="shapeRect">Rect</button>
        <button id="shapeCircle">Circle</button>
        <button id="eraser">Eraser</button>
        <button id="undo">Undo</button>
        <button id="clear">Clear</button>
        <button id="save">Save</button>
        <button id="viewAR">View in AR</button>
      </div>
      <canvas
        ref={canvasRef}
        id="canvas"
        style={{ flex: 1, touchAction: 'none', backgroundColor: 'transparent' }}
      />
      <div ref={arContainerRef} style={{ position: 'absolute', top: 0, left: 0 }} />
    </>
  );
}
