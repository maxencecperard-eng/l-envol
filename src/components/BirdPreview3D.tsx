import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BirdDef } from '../types/game';
import { createProceduralBird, BirdMeshRig } from '../world/birdModel';

interface BirdPreview3DProps {
  bird: BirdDef;
  className?: string;
}

/**
 * Small self-contained Three.js stage used by the aviary. It mounts exactly one
 * WebGL context and reuses it while the player browses species: only colours
 * and morphology are updated, never the renderer.
 */
export const BirdPreview3D: React.FC<BirdPreview3DProps> = ({ bird, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<BirdMeshRig | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const holderRef = useRef<THREE.Group | null>(null);
  const birdRef = useRef(bird);
  birdRef.current = bird;

  const applyBird = (def: BirdDef) => {
    const rig = rigRef.current;
    const camera = cameraRef.current;
    if (!rig || !camera) return;

    rig.updateColors(def);

    // Frame every species the same way, whatever its real wingspan
    const fit = Math.max(1, def.scale * def.wingspan);
    camera.position.set(0, 1.1 + fit * 0.55, 4.2 + fit * 2.1);
    camera.lookAt(0, 0.25 + def.scale * 0.35, 0);
    camera.updateProjectionMatrix();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lighting: warm key + cool rim to make the low-poly feathers pop
    const hemi = new THREE.HemisphereLight('#ffffff', '#0f172a', 2.0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#fff7ed', 2.6);
    key.position.set(4, 7, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight('#60a5fa', 2.2);
    rim.position.set(-6, 2, -5);
    scene.add(rim);

    const fill = new THREE.PointLight('#fbbf24', 18, 24);
    fill.position.set(0, 1.5, 3);
    scene.add(fill);

    // Pedestal glow ring
    const ringGeo = new THREE.TorusGeometry(1.75, 0.035, 8, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.55;
    scene.add(ring);

    const discGeo = new THREE.CircleGeometry(1.75, 48);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({
      color: '#0ea5e9',
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.6;
    scene.add(disc);

    // Halo particles drifting around the bird
    const particleCount = 28;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.9 + Math.random() * 0.9;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#7dd3fc',
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const holder = new THREE.Group();
    scene.add(holder);
    holderRef.current = holder;

    const rig = createProceduralBird(birdRef.current);
    holder.add(rig.group);
    rigRef.current = rig;
    applyBird(birdRef.current);

    let frameId = 0;
    const clock = new THREE.Clock();
    let flapPhase = 0;

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      flapPhase += delta * 3.2;

      // Slow showcase rotation + gentle bob
      holder.rotation.y += delta * 0.55;
      holder.position.y = Math.sin(elapsed * 0.9) * 0.08;

      rig.updateAnimation(flapPhase, false, 0, Math.sin(elapsed * 0.6) * 0.05, 1);
      ring.rotation.z += delta * 0.4;
      particles.rotation.y -= delta * 0.25;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      rigRef.current = null;
      cameraRef.current = null;
      holderRef.current = null;
    };
  }, []);

  // Live update when the player highlights another bird
  useEffect(() => {
    applyBird(bird);
  }, [bird]);

  return <div ref={mountRef} className={className} />;
};
