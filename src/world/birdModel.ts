import * as THREE from 'three';
import { BirdDef } from '../types/game';

export interface BirdMeshRig {
  group: THREE.Group;
  leftWingInner: THREE.Group;
  leftWingOuter: THREE.Group;
  rightWingInner: THREE.Group;
  rightWingOuter: THREE.Group;
  tail: THREE.Group;
  head: THREE.Group;
  bodyMesh: THREE.Mesh;
  wingspan: number;
  trailPointsLeft: THREE.Vector3[];
  trailPointsRight: THREE.Vector3[];
  trailMeshLeft?: THREE.Line;
  trailMeshRight?: THREE.Line;
  updateAnimation: (flapPhase: number, isDiving: boolean, rollAngle: number, pitchAngle: number, speedRatio: number) => void;
  updateColors: (birdDef: BirdDef) => void;
}

export function createProceduralBird(birdDef: BirdDef): BirdMeshRig {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'BirdRoot';

  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: birdDef.color,
    roughness: 0.65,
    metalness: 0.1,
    flatShading: true,
  });

  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: birdDef.secondaryColor,
    roughness: 0.7,
    metalness: 0.05,
    flatShading: true,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: birdDef.accentColor,
    roughness: 0.4,
    metalness: 0.2,
    flatShading: true,
  });

  const beakMaterial = new THREE.MeshStandardMaterial({
    color: '#e28743',
    roughness: 0.35,
    metalness: 0.1,
    flatShading: true,
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.1,
    metalness: 0.8,
  });

  // 1. Torso / Body (Aerodynamic teardrop)
  const bodyGeo = new THREE.ConeGeometry(0.55, 2.2, 7);
  bodyGeo.rotateX(Math.PI / 2);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  rootGroup.add(bodyMesh);

  // Breast belly (softer under-layer)
  const bellyGeo = new THREE.SphereGeometry(0.52, 6, 6);
  bellyGeo.scale(0.8, 0.7, 1.2);
  const bellyMesh = new THREE.Mesh(bellyGeo, secondaryMaterial);
  bellyMesh.position.set(0, -0.15, 0.2);
  rootGroup.add(bellyMesh);

  // 2. Head & Neck
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.3, 1.1);

  const headGeo = new THREE.SphereGeometry(0.42, 6, 6);
  headGeo.scale(0.85, 0.95, 1.05);
  const headMesh = new THREE.Mesh(headGeo, bodyMaterial);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Beak
  const beakGeo = new THREE.ConeGeometry(0.18, 0.65, 4);
  beakGeo.rotateX(Math.PI / 2);
  const beakMesh = new THREE.Mesh(beakGeo, beakMaterial);
  beakMesh.position.set(0, -0.05, 0.6);
  headGroup.add(beakMesh);

  // Eyes (Left & Right)
  const eyeGeo = new THREE.SphereGeometry(0.08, 5, 5);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  leftEye.position.set(-0.25, 0.1, 0.22);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  rightEye.position.set(0.25, 0.1, 0.22);
  headGroup.add(leftEye, rightEye);

  // Optional crest / plume (owls, phoenix...)
  const crestGeo = new THREE.ConeGeometry(0.13, 0.62, 4);
  const crestMesh = new THREE.Mesh(crestGeo, accentMaterial);
  crestMesh.position.set(0, 0.42, -0.08);
  crestMesh.rotation.x = -0.25;
  headGroup.add(crestMesh);

  rootGroup.add(headGroup);

  // 3. Tail Group (Fan feathers)
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.05, -1.05);

  const tailGeo = new THREE.ConeGeometry(0.55, 1.3, 4);
  tailGeo.rotateX(-Math.PI / 2);
  tailGeo.scale(1.4, 0.12, 1.0);
  const tailMesh = new THREE.Mesh(tailGeo, secondaryMaterial);
  tailMesh.position.set(0, 0.02, -0.55);
  tailMesh.castShadow = true;
  tailGroup.add(tailMesh);

  // Tail tips accent
  const tailTipGeo = new THREE.BoxGeometry(0.65, 0.05, 0.3);
  const tailTipMesh = new THREE.Mesh(tailTipGeo, accentMaterial);
  tailTipMesh.position.set(0, 0.02, -1.1);
  tailGroup.add(tailTipMesh);

  rootGroup.add(tailGroup);

  // 4. Wings (Articulated Left & Right)
  const wingspanRatio = birdDef.wingspan;

  // --- LEFT WING ---
  const leftWingInner = new THREE.Group();
  leftWingInner.position.set(-0.4, 0.15, 0.25);

  const innerWingGeo = new THREE.BoxGeometry(1.2 * wingspanRatio, 0.08, 0.85);
  innerWingGeo.translate(-0.6 * wingspanRatio, 0, -0.1);
  const leftInnerMesh = new THREE.Mesh(innerWingGeo, bodyMaterial);
  leftInnerMesh.castShadow = true;
  leftWingInner.add(leftInnerMesh);

  const leftWingOuter = new THREE.Group();
  leftWingOuter.position.set(-1.2 * wingspanRatio, 0, 0);

  const outerWingGeo = new THREE.BoxGeometry(1.0 * wingspanRatio, 0.06, 0.65);
  outerWingGeo.translate(-0.5 * wingspanRatio, 0, -0.15);
  const leftOuterMesh = new THREE.Mesh(outerWingGeo, secondaryMaterial);
  leftOuterMesh.castShadow = true;
  leftWingOuter.add(leftOuterMesh);

  // Wing feather tips
  const featherTipGeo = new THREE.ConeGeometry(0.25, 0.8 * wingspanRatio, 3);
  featherTipGeo.rotateZ(Math.PI / 2);
  const leftFeatherTip = new THREE.Mesh(featherTipGeo, accentMaterial);
  leftFeatherTip.position.set(-1.0 * wingspanRatio, 0, -0.2);
  leftWingOuter.add(leftFeatherTip);

  leftWingInner.add(leftWingOuter);
  rootGroup.add(leftWingInner);

  // --- RIGHT WING ---
  const rightWingInner = new THREE.Group();
  rightWingInner.position.set(0.4, 0.15, 0.25);

  const rightInnerMesh = new THREE.Mesh(innerWingGeo, bodyMaterial);
  rightInnerMesh.scale.set(-1, 1, 1);
  rightInnerMesh.castShadow = true;
  rightWingInner.add(rightInnerMesh);

  const rightWingOuter = new THREE.Group();
  rightWingOuter.position.set(1.2 * wingspanRatio, 0, 0);

  const rightOuterMesh = new THREE.Mesh(outerWingGeo, secondaryMaterial);
  rightOuterMesh.scale.set(-1, 1, 1);
  rightOuterMesh.castShadow = true;
  rightWingOuter.add(rightOuterMesh);

  const rightFeatherTip = new THREE.Mesh(featherTipGeo, accentMaterial);
  rightFeatherTip.position.set(1.0 * wingspanRatio, 0, -0.2);
  rightFeatherTip.rotation.z = Math.PI;
  rightWingOuter.add(rightFeatherTip);

  rightWingInner.add(rightWingOuter);
  rootGroup.add(rightWingInner);

  // Initial scaling from birdDef
  rootGroup.scale.setScalar(birdDef.scale);

  // Trail Points for Wingtip Wind Ribbons
  const trailPointsLeft: THREE.Vector3[] = [];
  const trailPointsRight: THREE.Vector3[] = [];

  // Applies colors *and* the per-species silhouette (body, tail, beak, crest).
  const applyBirdDef = (newDef: BirdDef) => {
    bodyMaterial.color.set(newDef.color);
    secondaryMaterial.color.set(newDef.secondaryColor);
    accentMaterial.color.set(newDef.accentColor);
    rootGroup.scale.setScalar(newDef.scale);

    const bodyWidth = newDef.bodyWidth ?? 1;
    bodyMesh.scale.x = bodyWidth;
    bellyMesh.scale.x = bodyWidth;

    tailGroup.scale.z = newDef.tailLength ?? 1;
    beakMesh.scale.z = newDef.beakLength ?? 1;

    const crest = newDef.crestSize ?? 0;
    crestMesh.visible = crest > 0.02;
    crestMesh.scale.set(1, Math.max(0.2, crest), 1);
  };

  applyBirdDef(birdDef);

  const updateColors = (newDef: BirdDef) => {
    applyBirdDef(newDef);
  };

  const updateAnimation = (
    flapPhase: number,
    isDiving: boolean,
    rollAngle: number,
    pitchAngle: number,
    speedRatio: number
  ) => {
    if (isDiving) {
      // Aerodynamic swept-back dive tuck
      const diveTuck = 0.85;
      leftWingInner.rotation.z = THREE.MathUtils.damp(leftWingInner.rotation.z, 0.5, 10, 0.016);
      leftWingInner.rotation.y = THREE.MathUtils.damp(leftWingInner.rotation.y, -diveTuck, 10, 0.016);
      leftWingOuter.rotation.z = THREE.MathUtils.damp(leftWingOuter.rotation.z, -0.6, 10, 0.016);

      rightWingInner.rotation.z = THREE.MathUtils.damp(rightWingInner.rotation.z, -0.5, 10, 0.016);
      rightWingInner.rotation.y = THREE.MathUtils.damp(rightWingInner.rotation.y, diveTuck, 10, 0.016);
      rightWingOuter.rotation.z = THREE.MathUtils.damp(rightWingOuter.rotation.z, 0.6, 10, 0.016);

      tailGroup.rotation.x = -0.35;
      headGroup.rotation.x = 0.2;
    } else {
      // Natural organic wing flap oscillation
      const sinFlap = Math.sin(flapPhase);
      const cosFlap = Math.cos(flapPhase);

      // Inner wing primary flap
      leftWingInner.rotation.z = sinFlap * 0.55;
      leftWingInner.rotation.y = cosFlap * 0.12;
      leftWingInner.rotation.x = -pitchAngle * 0.2;

      // Outer wing secondary wave for organic feathery snap
      leftWingOuter.rotation.z = sinFlap * 0.42;

      // Symmetrical right wing
      rightWingInner.rotation.z = -sinFlap * 0.55;
      rightWingInner.rotation.y = -cosFlap * 0.12;
      rightWingInner.rotation.x = -pitchAngle * 0.2;

      rightWingOuter.rotation.z = -sinFlap * 0.42;

      // Tail compensates for balance
      tailGroup.rotation.x = -pitchAngle * 0.4 + Math.abs(sinFlap) * 0.08;
      tailGroup.rotation.y = -rollAngle * 0.35;

      // Head looks into velocity vector
      headGroup.rotation.x = pitchAngle * 0.3;
      headGroup.rotation.y = -rollAngle * 0.2;
    }
  };

  return {
    group: rootGroup,
    leftWingInner,
    leftWingOuter,
    rightWingInner,
    rightWingOuter,
    tail: tailGroup,
    head: headGroup,
    bodyMesh,
    wingspan: birdDef.wingspan,
    trailPointsLeft,
    trailPointsRight,
    updateAnimation,
    updateColors,
  };
}
