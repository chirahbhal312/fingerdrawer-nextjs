'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

export default function ARScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    document.body.appendChild(ARButton.createButton(renderer));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(0, 1.6, 3);
    scene.add(camera);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);

    // ✅ Vertical plane (like a poster)
    const geometry = new THREE.PlaneGeometry(1, 0.7); // width, height
    const material = new THREE.MeshBasicMaterial({ color: 0xff69b4, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);

    plane.position.set(0, 1.5, -1); // 1.5 meters up, 1 meter in front
    plane.rotation.y = 0; // Facing camera (no rotation needed for vertical)
    scene.add(plane);

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
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />;
}
