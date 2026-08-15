"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

/**
 * <Signal3DCanvas /> – Interactive Three.js particle signal visualiser.
 *
 * Left half (x < 0): Chaotic, scattered feedback particles funnelling in.
 * Right half (x >= 0): Fully CONVERGED, pulsating, coherent single data stream
 * representing actionable customer signal.
 */

const PARTICLE_COUNT = 2400;
const SPREAD_Y = 3.6;          // max vertical scatter on noise side
const SPREAD_Z = 2.2;          // max depth scatter on noise side

export function Signal3DCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  const handleMouse = useCallback((e: MouseEvent) => {
    if (!mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = (e.clientX - rect.left) / rect.width;
    mouseRef.current.y = (e.clientY - rect.top) / rect.height;
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    /* ── Scene ── */
    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* ── Particles ── */
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const basePositions = new Float32Array(PARTICLE_COUNT * 3);
    const colours = new Float32Array(PARTICLE_COUNT * 3);

    const colNoise = new THREE.Color("#2B313D");
    const colMid = new THREE.Color("#8A6018");
    const colSignal = new THREE.Color("#E8A33D");
    const colBright = new THREE.Color("#FFD07A");

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Distribute evenly across X from -7 to +7
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * SPREAD_Y * 2;
      const z = (Math.random() - 0.5) * SPREAD_Z;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;

      // xNorm: 0 (far left) -> 0.5 (center) -> 1.0 (far right)
      const t = (x + 7) / 14;
      let col: THREE.Color;
      if (t < 0.45) {
        // Left scattered side: muted grey to warm bronze
        col = colNoise.clone().lerp(colMid, t / 0.45);
      } else if (t < 0.55) {
        // Midpoint transition zone
        col = colMid.clone().lerp(colSignal, (t - 0.45) / 0.1);
      } else {
        // Right half (single line): vibrant amber to glowing golden highlight
        col = colSignal.clone().lerp(colBright, (t - 0.55) / 0.45);
      }

      colours[i3] = col.r;
      colours[i3 + 1] = col.g;
      colours[i3 + 2] = col.b;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      size: 0.06,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* ── Animate ── */
    const clock = new THREE.Clock();

    function animate() {
      animRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const mx = mouseRef.current.x;

      // Transition midpoint dynamically shifts slightly with mouse
      const midPoint = 0.48 + (mx - 0.5) * 0.08;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];
        const bz = basePositions[i3 + 2];

        // xNorm: 0 at x=-7, 0.5 at center, 1.0 at x=+7
        const xNorm = (bx + 7) / 14;

        let convergeFactor: number;
        if (xNorm < midPoint) {
          // Left half: smooth cubic funneling down toward y=0
          const ratio = xNorm / midPoint;
          convergeFactor = Math.pow(ratio, 2.2);
        } else {
          // Right half: FULLY CONVERGED (1.0) into single crisp laser-line
          convergeFactor = 1.0;
        }

        // ── Y: noise scatter -> tight signal line ──
        const noise =
          Math.sin(bx * 2.2 + t * 2.5) * 0.6 +
          Math.sin(bx * 3.7 + t * 1.8) * 0.35 +
          Math.cos(by * 2.9 + t * 2.1) * 0.25;

        const scatteredY = by + noise * (1 - convergeFactor) * SPREAD_Y * 0.45;

        // Data flow harmonic ripple along the signal line (right half)
        const dataPulse = Math.sin(bx * 1.4 - t * 3.8) * 0.035;
        const breathingWave = Math.sin(bx * 0.4 + t * 0.8) * 0.02;
        const lineY = dataPulse + breathingWave;

        pos.array[i3 + 1] = scatteredY * (1 - convergeFactor) + lineY * convergeFactor;

        // ── Z: depth scatter -> flat 2D line ──
        const scatteredZ = bz + Math.sin(bx * 1.1 + t * 0.8) * 0.35 * (1 - convergeFactor);
        pos.array[i3 + 2] = scatteredZ * (1 - convergeFactor);
      }
      pos.needsUpdate = true;

      // Gentle interactive tilt on mouse
      points.rotation.y = (mx - 0.5) * 0.1;
      points.rotation.x = (mouseRef.current.y - 0.5) * 0.05;

      renderer.render(scene, camera);
    }
    animate();

    /* ── Resize ── */
    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);
    container.addEventListener("mousemove", handleMouse);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", handleMouse);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleMouse]);

  return (
    <div
      ref={mountRef}
      className="w-full h-[260px] md:h-[340px] rounded-xl overflow-hidden"
      style={{ background: "transparent" }}
      aria-hidden="true"
    />
  );
}
