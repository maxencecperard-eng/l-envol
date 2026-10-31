import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BirdDef, CoinPickup, MissionObjective, ThermalUpdraft, WorldLandmark } from '../types/game';
import { createProceduralBird, BirdMeshRig } from '../world/birdModel';
import { buildProceduralWorld, WorldSceneRig } from '../world/proceduralWorld';
import { FlightController, FlightInputState, FlightTelemetry } from '../game/flightController';
import { sounds } from '../audio/soundManager';

interface FlightCanvasProps {
  activeBird: BirdDef;
  inputs: FlightInputState;
  currentObjective: MissionObjective | null;
  landmarks: WorldLandmark[];
  coins: CoinPickup[];
  updrafts: ThermalUpdraft[];
  onObjectiveProgress: () => void;
  onCoinCollected: (coinId: string, value: number) => void;
  onTelemetryUpdate: (telemetry: FlightTelemetry) => void;
  resetSignal: number;
}

export const FlightCanvas: React.FC<FlightCanvasProps> = ({
  activeBird,
  inputs,
  currentObjective,
  landmarks,
  coins,
  updrafts,
  onObjectiveProgress,
  onCoinCollected,
  onTelemetryUpdate,
  resetSignal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const flightControllerRef = useRef<FlightController | null>(null);
  const birdRigRef = useRef<BirdMeshRig | null>(null);
  const worldRigRef = useRef<WorldSceneRig | null>(null);

  // References to keep latest callbacks/props in loop without re-running effect
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  const currentObjRef = useRef(currentObjective);
  currentObjRef.current = currentObjective;

  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  const onObjectiveProgressRef = useRef(onObjectiveProgress);
  onObjectiveProgressRef.current = onObjectiveProgress;

  const onCoinCollectedRef = useRef(onCoinCollected);
  onCoinCollectedRef.current = onCoinCollected;

  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  onTelemetryUpdateRef.current = onTelemetryUpdate;

  // Handle bird change dynamically
  useEffect(() => {
    if (flightControllerRef.current) {
      flightControllerRef.current.setBird(activeBird);
    }
    if (birdRigRef.current) {
      birdRigRef.current.updateColors(activeBird);
    }
  }, [activeBird]);

  // Handle respawn reset signal
  useEffect(() => {
    if (flightControllerRef.current && resetSignal > 0) {
      flightControllerRef.current.resetPosition([0, 24, 0]);
    }
  }, [resetSignal]);

  // Handle objective target changes on world rings/beacons
  useEffect(() => {
    if (worldRigRef.current) {
      worldRigRef.current.setRingObjective(currentObjective);
    }
  }, [currentObjective]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Scene, Camera, Renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#90cdf4');
    // Light haze masks the streamed terrain edge and makes the world feel vast
    scene.fog = new THREE.FogExp2('#90cdf4', 0.0015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 2400);
    camera.position.set(0, 28, -12);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Map Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.8);
    sunLight.position.set(120, 160, 90);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 400;
      const d = 160;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight('#ebf8ff', '#2d3748', 0.85);
    scene.add(hemiLight);

    // 5. Build Procedural World and Bird
    const worldRig = buildProceduralWorld(landmarks, coins, updrafts);
    scene.add(worldRig.group);
    worldRigRef.current = worldRig;
    worldRig.setRingObjective(currentObjRef.current);

    const birdRig = createProceduralBird(activeBird);
    scene.add(birdRig.group);
    birdRigRef.current = birdRig;

    const flightCtrl = new FlightController(activeBird);
    flightControllerRef.current = flightCtrl;

    // 6. Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Animation Loop with Software WebGL pacing
    let frameId = 0;
    let timerId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 60);
        }
      };
      timerId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update flight physics
      const telemetry = flightCtrl.update(delta, inputsRef.current, camera, updrafts);

      // Synchronize bird 3D mesh position and rotations
      birdRig.group.position.copy(telemetry.position);
      birdRig.group.rotation.set(0, 0, 0);
      birdRig.group.rotateY(telemetry.headingAngle);
      birdRig.group.rotateX(telemetry.pitchAngle);
      birdRig.group.rotateZ(telemetry.rollAngle);

      // Animate wing flapping / diving kinematics
      const speedRatio = flightCtrl.speed / activeBird.baseSpeed;
      birdRig.updateAnimation(
        telemetry.flapPhase,
        telemetry.isDiving,
        telemetry.rollAngle,
        telemetry.pitchAngle,
        speedRatio
      );

      // Update world props (terrain streaming, ocean, clouds, coins, updrafts)
      worldRig.updateWorld(elapsed, delta, telemetry.position);

      // Move sun light along with bird so shadows stay crisp
      sunLight.position.set(
        telemetry.position.x + 80,
        telemetry.position.y + 120,
        telemetry.position.z + 60
      );
      sunLight.target.position.copy(telemetry.position);
      sunLight.target.updateMatrixWorld();

      // Check Objective Collision / Proximity
      const curObj = currentObjRef.current;
      if (curObj && !curObj.completed) {
        const dist = Math.hypot(
          telemetry.position.x - curObj.position[0],
          telemetry.position.y - curObj.position[1],
          telemetry.position.z - curObj.position[2]
        );

        if (dist <= curObj.radius) {
          if (curObj.type === 'ring') {
            sounds.playRingPass();
          } else {
            sounds.playCoin();
          }
          onObjectiveProgressRef.current();
        }
      }

      // Check Coins Pickups
      coinsRef.current.forEach((coin) => {
        if (!coin.collected) {
          const cDist = Math.hypot(
            telemetry.position.x - coin.position[0],
            telemetry.position.y - coin.position[1],
            telemetry.position.z - coin.position[2]
          );
          if (cDist < 3.2) {
            sounds.playCoin();
            worldRig.removeCoinMesh(coin.id);
            onCoinCollectedRef.current(coin.id, coin.value);
          }
        }
      });

      // Send telemetry updates to React HUD
      onTelemetryUpdateRef.current(telemetry);

      // Render
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full absolute inset-0 overflow-hidden" />;
};
