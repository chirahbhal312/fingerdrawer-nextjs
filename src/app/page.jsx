"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { WebGLRenderer } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";

export default function Home() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  const planeMeshesRef = useRef([]);
  const mergedPlaneRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(0, 1.6, 0);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    canvasRef.current.appendChild(renderer.domElement);

    document.body.appendChild(ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test", "plane-detection"],
    }));

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    let hitTestSource = null;
    let hitTestSourceRequested = false;

    function onXRFrame(time, frame) {
      const session = renderer.xr.getSession();
      if (!hitTestSourceRequested) {
        session.requestReferenceSpace("viewer").then((refSpace) => {
          return session.requestHitTestSource({ space: refSpace });
        }).then((source) => {
          hitTestSource = source;
        });
        hitTestSourceRequested = true;
      }

      if (frame && hitTestSource) {
        const refSpace = renderer.xr.getReferenceSpace();
        const hits = frame.getHitTestResults(hitTestSource);
        if (hits.length) {
          const hit = hits[0];
          const pose = hit.getPose(refSpace);
          addPlaneAt(pose.transform.matrix);
        }
      }

      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(onXRFrame);

    function addPlaneAt(matrixArray) {
      const matrix = new THREE.Matrix4().fromArray(matrixArray);
      const size = 1; // fixed size; replace with size detection if available
      const geometry = new THREE.PlaneGeometry(size, size);
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
      geometry.applyMatrix4(matrix);
      const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      planeMeshesRef.current.push(mesh);
      mergePlanes();
    }

    function mergePlanes() {
      const meshes = planeMeshesRef.current;
      if (meshes.length < 2) return;
      const geoms = meshes.map((m) => {
        m.updateMatrixWorld();
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld);
        scene.remove(m);
        return g;
      });
      planeMeshesRef.current = [];
      const mergedGeom = BufferGeometryUtils.mergeBufferGeometries(geoms, false);
      if (!mergedGeom) return;
      const mat = meshes[0].material.clone();
      const mergedMesh = new THREE.Mesh(mergedGeom, mat);
      mergedPlaneRef.current?.parent?.remove(mergedPlaneRef.current);
      mergedPlaneRef.current = mergedMesh;
      scene.add(mergedMesh);
    }

    function cleanup() {
      renderer.xr.setAnimationLoop(null);
    }

    return cleanup;
  }, []);

  return (
    <div ref={canvasRef} style={{ width: "100vw", height: "100vh" }}>
      {/* AR planes will show up via WebXR */}
    </div>
  );
}
