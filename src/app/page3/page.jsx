'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

export default function ARScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(ARButton.createButton(renderer));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    scene.add(camera);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const transform = new TransformControls(camera, renderer.domElement);
    transform.addEventListener('dragging-changed', (e) => controls.enabled = !e.value);
    scene.add(transform);

    const textureURL = sessionStorage.getItem('drawingImage');
    const loader = new THREE.TextureLoader();
    const planes = [];

    if (textureURL) {
      const img = new Image();
      img.src = textureURL;
      img.onload = () => {
        const { width, height } = img;
        const aspect = width / height;
        loader.load(textureURL, (texture) => {
          renderer.xr.addEventListener('sessionstart', () => {
            renderer.xr.getSession().addEventListener('select', () => {
              const cam = renderer.xr.getCamera(camera);
              const pos = new THREE.Vector3(), quat = new THREE.Quaternion();
              cam.matrixWorld.decompose(pos, quat, new THREE.Vector3());
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
              pos.add(forward.multiplyScalar(1));

              const h = 0.7, w = 0.7 * aspect;
              const geom = new THREE.PlaneGeometry(w, h);
              const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, alphaTest: 0.01 });
              const plane = new THREE.Mesh(geom, mat);
              plane.position.copy(pos);
              plane.quaternion.copy(quat);
              scene.add(plane);
              planes.push(plane);
            });
          });
        });
      };
    }

    function onPointerDown(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.x) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.y) / rect.height) * 2 + 1;
      pointer.set(x, y);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(planes);
      if (hits.length) {
        transform.attach(hits[0].object);
      } else {
        transform.detach();
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Touch gesture: pinch to zoom
    let prevDist = null;
    renderer.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && transform.object) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (prevDist && d) {
          const scale = d / prevDist;
          transform.object.scale.multiplyScalar(scale);
        }
        prevDist = d;
      }
    }, { passive: false });
    renderer.domElement.addEventListener('touchend', () => prevDist = null);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />;
}
