'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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

    // 👉 Create a vertical plane when user taps
    const createPlane = (position, quaternion) => {
      const geometry = new THREE.PlaneGeometry(1, 0.7);
      const material = new THREE.MeshBasicMaterial({ color: 0xff69b4, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(geometry, material);
      plane.position.copy(position);
      plane.quaternion.copy(quaternion); // So it faces the same way as the camera
      scene.add(plane);
    };

    // Handle tap in AR
    renderer.xr.addEventListener('sessionstart', () => {
      const session = renderer.xr.getSession();
      session.addEventListener('select', () => {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const viewerPose = renderer.xr.getCamera(camera).matrixWorld;

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();

        const matrix = new THREE.Matrix4().fromArray(viewerPose.elements);
        matrix.decompose(position, quaternion, new THREE.Vector3());

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
        position.add(forward.multiplyScalar(1)); // 1 meter in front

        createPlane(position, quaternion);
      });
    });

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
