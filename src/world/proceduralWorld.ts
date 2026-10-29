import * as THREE from 'three';
import { CoinPickup, MissionObjective, ThermalUpdraft, WorldLandmark } from '../types/game';

// Mathematical continuous terrain function
export function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.sqrt(x * x + z * z);
  if (distFromCenter > 220) {
    // Slopes down into ocean
    return Math.max(-6, 2 - (distFromCenter - 220) * 0.15);
  }

  // Base rolling hills
  let h = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 6;
  h += Math.sin(x * 0.045 + 1.2) * Math.sin(z * 0.038) * 4;

  // Mountain ridge in the northwest (Falaises)
  const cliffDist = Math.hypot(x - (-50), z - (-120));
  if (cliffDist < 70) {
    const factor = Math.max(0, 1 - cliffDist / 70);
    h += factor * factor * 42;
  }

  // Village hill in the northeast
  const villageDist = Math.hypot(x - 110, z - (-90));
  if (villageDist < 60) {
    const factor = Math.max(0, 1 - villageDist / 60);
    h += factor * 20;
  }

  // Lighthouse promontory in the southwest
  const lighthouseDist = Math.hypot(x - (-130), z - 110);
  if (lighthouseDist < 50) {
    const factor = Math.max(0, 1 - lighthouseDist / 50);
    h += factor * 24;
  }

  // Windmill mound in the southeast
  const millDist = Math.hypot(x - 75, z - 60);
  if (millDist < 45) {
    const factor = Math.max(0, 1 - millDist / 45);
    h += factor * 14;
  }

  // Emerald lake depression
  const lakeDist = Math.hypot(x - (-30), z - 40);
  if (lakeDist < 40) {
    const factor = Math.max(0, 1 - lakeDist / 40);
    h -= factor * 10;
  }

  return Math.max(0.5, h);
}

export interface WorldSceneRig {
  group: THREE.Group;
  windmillBlades?: THREE.Group;
  lighthouseBeam?: THREE.Mesh;
  missionRingGroup: THREE.Group;
  missionBeaconGroup: THREE.Group;
  coinMeshes: Map<string, THREE.Mesh>;
  updraftParticles: THREE.Points[];
  updateWorld: (elapsed: number, delta: number) => void;
  setRingObjective: (objective: MissionObjective | null) => void;
  removeCoinMesh: (coinId: string) => void;
}

export function buildProceduralWorld(
  landmarks: WorldLandmark[],
  coins: CoinPickup[],
  updrafts: ThermalUpdraft[]
): WorldSceneRig {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'ProceduralWorld';

  // 1. Terrain Mesh (Segmented grid with custom vertex displacement based on getTerrainHeight)
  const terrainSize = 520;
  const segments = 120;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colorAttr = new Float32Array(posAttr.count * 3);

  const colorGrass = new THREE.Color('#4a7c36');
  const colorHill = new THREE.Color('#386629');
  const colorRock = new THREE.Color('#6c757d');
  const colorPeak = new THREE.Color('#94a3b8');
  const colorSand = new THREE.Color('#e2c88f');
  const tmpColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getTerrainHeight(x, z);
    posAttr.setY(i, y);

    // Vertex coloring based on elevation and terrain features
    if (y < 2.5) {
      tmpColor.copy(colorSand);
    } else if (y < 18) {
      tmpColor.lerpColors(colorGrass, colorHill, y / 18);
    } else if (y < 35) {
      tmpColor.lerpColors(colorHill, colorRock, (y - 18) / 17);
    } else {
      tmpColor.lerpColors(colorRock, colorPeak, Math.min(1, (y - 35) / 20));
    }

    colorAttr[i * 3] = tmpColor.r;
    colorAttr[i * 3 + 1] = tmpColor.g;
    colorAttr[i * 3 + 2] = tmpColor.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  worldGroup.add(terrainMesh);

  // 2. Surrounding Ocean & Lake
  const oceanGeo = new THREE.PlaneGeometry(1200, 1200, 32, 32);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: '#2b6cb0',
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = 1.2;
  worldGroup.add(oceanMesh);

  // Lake emerald water disk
  const lakeGeo = new THREE.CircleGeometry(36, 24);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMat = new THREE.MeshStandardMaterial({
    color: '#319795',
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
  });
  const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
  lakeMesh.position.set(-30, 2.2, 40);
  worldGroup.add(lakeMesh);

  // 3. Ancient Oak & Royal Nest at (0, y, 0)
  const oakGroup = new THREE.Group();
  const oakY = getTerrainHeight(0, 0);
  oakGroup.position.set(0, oakY, 0);

  // Massive trunk
  const trunkGeo = new THREE.CylinderGeometry(2.4, 4.2, 22, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#543d2b', roughness: 0.9 });
  const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
  trunkMesh.position.y = 11;
  trunkMesh.castShadow = true;
  oakGroup.add(trunkMesh);

  // Giant branches
  for (let b = 0; b < 5; b++) {
    const angle = (b / 5) * Math.PI * 2;
    const branchGeo = new THREE.CylinderGeometry(0.8, 1.4, 14, 5);
    const branch = new THREE.Mesh(branchGeo, trunkMat);
    branch.position.set(Math.cos(angle) * 3, 17, Math.sin(angle) * 3);
    branch.rotation.z = Math.cos(angle) * 0.65;
    branch.rotation.x = Math.sin(angle) * 0.65;
    oakGroup.add(branch);
  }

  // Foliage crown (clusters)
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#276749', roughness: 0.8, flatShading: true });
  for (let c = 0; c < 9; c++) {
    const fAngle = (c / 9) * Math.PI * 2;
    const fDist = 7 + (c % 2) * 3;
    const fGeo = new THREE.DodecahedronGeometry(5.5 + (c % 3) * 1.5);
    const foliage = new THREE.Mesh(fGeo, foliageMat);
    foliage.position.set(Math.cos(fAngle) * fDist, 22 + (c % 3) * 2.5, Math.sin(fAngle) * fDist);
    foliage.castShadow = true;
    oakGroup.add(foliage);
  }

  // Central Giant Bird Nest
  const nestGeo = new THREE.TorusGeometry(4.5, 1.2, 8, 20);
  nestGeo.rotateX(Math.PI / 2);
  const nestMat = new THREE.MeshStandardMaterial({ color: '#975a16', roughness: 0.95 });
  const nestMesh = new THREE.Mesh(nestGeo, nestMat);
  nestMesh.position.y = 22;
  oakGroup.add(nestMesh);

  // Nest interior bed
  const bedGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.4, 12);
  const bedMat = new THREE.MeshStandardMaterial({ color: '#b7791f', roughness: 0.9 });
  const bedMesh = new THREE.Mesh(bedGeo, bedMat);
  bedMesh.position.y = 21.6;
  oakGroup.add(bedMesh);

  worldGroup.add(oakGroup);

  // 4. Windmill with Turning Blades at (75, y, 60)
  const millGroup = new THREE.Group();
  const millY = getTerrainHeight(75, 60);
  millGroup.position.set(75, millY, 60);

  const millBodyGeo = new THREE.CylinderGeometry(3.5, 5.0, 16, 8);
  const millBodyMat = new THREE.MeshStandardMaterial({ color: '#f7fafc', roughness: 0.7 });
  const millBody = new THREE.Mesh(millBodyGeo, millBodyMat);
  millBody.position.y = 8;
  millBody.castShadow = true;
  millGroup.add(millBody);

  const millRoofGeo = new THREE.ConeGeometry(4.2, 5.5, 8);
  const millRoofMat = new THREE.MeshStandardMaterial({ color: '#9b2c2c', roughness: 0.6 });
  const millRoof = new THREE.Mesh(millRoofGeo, millRoofMat);
  millRoof.position.y = 18.7;
  millRoof.castShadow = true;
  millGroup.add(millRoof);

  // Windmill Blades Group
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 16, 4.0);

  const bladeHubGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 8);
  bladeHubGeo.rotateX(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: '#4a5568' });
  const bladeHub = new THREE.Mesh(bladeHubGeo, hubMat);
  bladesGroup.add(bladeHub);

  const bladeWoodMat = new THREE.MeshStandardMaterial({ color: '#cbd5e0', roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const bAngle = (i * Math.PI) / 2;
    const bladeArm = new THREE.Group();
    bladeArm.rotation.z = bAngle;

    const sparGeo = new THREE.BoxGeometry(0.3, 11, 0.3);
    sparGeo.translate(0, 5.5, 0);
    const spar = new THREE.Mesh(sparGeo, trunkMat);

    const sailGeo = new THREE.BoxGeometry(1.6, 9.5, 0.1);
    sailGeo.translate(0.9, 6, 0.1);
    const sail = new THREE.Mesh(sailGeo, bladeWoodMat);
    sail.castShadow = true;

    bladeArm.add(spar, sail);
    bladesGroup.add(bladeArm);
  }
  millGroup.add(bladesGroup);
  worldGroup.add(millGroup);

  // 5. The Grand Lighthouse at (-130, y, 110)
  const lighthouseGroup = new THREE.Group();
  const lhY = getTerrainHeight(-130, 110);
  lighthouseGroup.position.set(-130, lhY, 110);

  // Tower body (striped effect with stacked cylinders)
  const towerSegs = 6;
  const towerHeight = 24;
  for (let s = 0; s < towerSegs; s++) {
    const bottomR = 4.2 - s * 0.3;
    const topR = 4.2 - (s + 1) * 0.3;
    const segGeo = new THREE.CylinderGeometry(topR, bottomR, towerHeight / towerSegs, 10);
    const segMat = new THREE.MeshStandardMaterial({
      color: s % 2 === 0 ? '#e53e3e' : '#f7fafc',
      roughness: 0.6,
    });
    const seg = new THREE.Mesh(segGeo, segMat);
    seg.position.y = (s + 0.5) * (towerHeight / towerSegs);
    seg.castShadow = true;
    lighthouseGroup.add(seg);
  }

  // Lantern Gallery & Dome
  const galleryGeo = new THREE.CylinderGeometry(3.6, 3.6, 1.2, 12);
  const gallery = new THREE.Mesh(galleryGeo, hubMat);
  gallery.position.y = towerHeight + 0.6;
  lighthouseGroup.add(gallery);

  const lanternGlassGeo = new THREE.CylinderGeometry(2.4, 2.4, 3.0, 10);
  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: '#ffeb3b',
    emissive: '#f6ad55',
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.75,
  });
  const lanternGlass = new THREE.Mesh(lanternGlassGeo, lanternGlassMat);
  lanternGlass.position.y = towerHeight + 2.6;
  lighthouseGroup.add(lanternGlass);

  const domeGeo = new THREE.ConeGeometry(3.0, 2.5, 10);
  const domeMat = new THREE.MeshStandardMaterial({ color: '#2d3748' });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = towerHeight + 5.2;
  lighthouseGroup.add(dome);

  // Rotating light beam
  const beamGeo = new THREE.ConeGeometry(12, 60, 12, 1, true);
  beamGeo.rotateX(-Math.PI / 2);
  beamGeo.translate(0, 0, 30);
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lighthouseBeam = new THREE.Mesh(beamGeo, beamMat);
  lighthouseBeam.position.y = towerHeight + 2.6;
  lighthouseGroup.add(lighthouseBeam);

  worldGroup.add(lighthouseGroup);

  // 6. Le Village Perché & Clocher at (110, y, -90)
  const villageGroup = new THREE.Group();
  const vY = getTerrainHeight(110, -90);
  villageGroup.position.set(110, vY, -90);

  // Church Bell Tower
  const towerGeo = new THREE.BoxGeometry(6, 22, 6);
  const churchMat = new THREE.MeshStandardMaterial({ color: '#edf2f7', roughness: 0.8 });
  const churchTower = new THREE.Mesh(towerGeo, churchMat);
  churchTower.position.set(0, 11, 0);
  churchTower.castShadow = true;
  villageGroup.add(churchTower);

  const spireGeo = new THREE.ConeGeometry(4.5, 10, 4);
  spireGeo.rotateY(Math.PI / 4);
  const spireMat = new THREE.MeshStandardMaterial({ color: '#2b6cb0' });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 27, 0);
  spire.castShadow = true;
  villageGroup.add(spire);

  // Village Houses
  const houseOffsets = [
    { x: -14, z: -10, rot: 0.2, h: 6, color: '#dd6b20' },
    { x: -12, z: 12, rot: -0.4, h: 5.5, color: '#c53030' },
    { x: 12, z: -15, rot: 0.6, h: 5, color: '#975a16' },
    { x: 16, z: 8, rot: -0.2, h: 6, color: '#b7791f' },
    { x: 0, z: -20, rot: 0.1, h: 5, color: '#c53030' },
  ];

  houseOffsets.forEach((ho) => {
    const house = new THREE.Group();
    house.position.set(ho.x, 0, ho.z);
    house.rotation.y = ho.rot;

    const wallsGeo = new THREE.BoxGeometry(7, ho.h, 6);
    const walls = new THREE.Mesh(wallsGeo, churchMat);
    walls.position.y = ho.h / 2;
    walls.castShadow = true;
    house.add(walls);

    const roofGeo = new THREE.ConeGeometry(5.5, 4.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: ho.color, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = ho.h + 2.2;
    roof.castShadow = true;
    house.add(roof);

    villageGroup.add(house);
  });

  worldGroup.add(villageGroup);

  // 7. Instanced Forest of Trees
  const treeCount = 140;
  const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 5);
  treeTrunkGeo.translate(0, 2, 0);
  const treeFoliageGeo = new THREE.ConeGeometry(2.4, 6, 5);
  treeFoliageGeo.translate(0, 6, 0);

  const instTrunk = new THREE.InstancedMesh(treeTrunkGeo, trunkMat, treeCount);
  const instFoliage = new THREE.InstancedMesh(treeFoliageGeo, foliageMat, treeCount);
  instTrunk.castShadow = true;
  instFoliage.castShadow = true;

  const dummy = new THREE.Object3D();
  let planted = 0;
  for (let i = 0; i < treeCount * 3 && planted < treeCount; i++) {
    const rx = (Math.random() - 0.5) * 360;
    const rz = (Math.random() - 0.5) * 360;
    const distCenter = Math.hypot(rx, rz);

    // Keep clearings around main oak, lake, and buildings
    if (distCenter < 18) continue;
    if (Math.hypot(rx - (-30), rz - 40) < 32) continue; // lake
    if (Math.hypot(rx - 75, rz - 60) < 18) continue; // mill
    if (Math.hypot(rx - (-130), rz - 110) < 22) continue; // lighthouse
    if (Math.hypot(rx - 110, rz - (-90)) < 24) continue; // village

    const ry = getTerrainHeight(rx, rz);
    if (ry < 2.5 || ry > 40) continue; // don't grow in ocean or high bare peaks

    const s = 0.75 + Math.random() * 0.6;
    dummy.position.set(rx, ry, rz);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();

    instTrunk.setMatrixAt(planted, dummy.matrix);
    instFoliage.setMatrixAt(planted, dummy.matrix);
    planted++;
  }

  instTrunk.count = planted;
  instFoliage.count = planted;
  instTrunk.instanceMatrix.needsUpdate = true;
  instFoliage.instanceMatrix.needsUpdate = true;
  instTrunk.computeBoundingSphere();
  instFoliage.computeBoundingSphere();

  worldGroup.add(instTrunk);
  worldGroup.add(instFoliage);

  // 8. Procedural Clouds in Sky (Fluffy clusters)
  const cloudCount = 28;
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });

  for (let c = 0; c < cloudCount; c++) {
    const cloud = new THREE.Group();
    const cx = (Math.random() - 0.5) * 440;
    const cy = 55 + Math.random() * 45;
    const cz = (Math.random() - 0.5) * 440;
    cloud.position.set(cx, cy, cz);

    const puffs = 4 + Math.floor(Math.random() * 4);
    for (let p = 0; p < puffs; p++) {
      const pGeo = new THREE.DodecahedronGeometry(5 + Math.random() * 6);
      const puff = new THREE.Mesh(pGeo, cloudMat);
      puff.position.set((p - puffs / 2) * 5 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5);
      cloud.add(puff);
    }
    worldGroup.add(cloud);
  }

  // 9. Floating Spinning Coins
  const coinMeshes = new Map<string, THREE.Mesh>();
  const coinGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 12);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: '#ecc94b',
    emissive: '#d69e2e',
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.2,
  });

  coins.forEach((c) => {
    const mesh = new THREE.Mesh(coinGeo, coinMat);
    mesh.position.set(...c.position);
    mesh.castShadow = true;
    worldGroup.add(mesh);
    coinMeshes.set(c.id, mesh);
  });

  // 10. Thermal Updrafts Visual Vortices
  const updraftParticles: THREE.Points[] = [];
  updrafts.forEach((u) => {
    const pCount = 60;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const radius = Math.random() * u.radius;
      const angle = Math.random() * Math.PI * 2;
      pPositions[i * 3] = u.position[0] + Math.cos(angle) * radius;
      pPositions[i * 3 + 1] = u.position[1] - 10 + Math.random() * 50;
      pPositions[i * 3 + 2] = u.position[2] + Math.sin(angle) * radius;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: '#f6e05e',
      size: 0.8,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    worldGroup.add(points);
    updraftParticles.push(points);
  });

  // 11. Mission Dynamic Ring & Beacon
  const missionRingGroup = new THREE.Group();
  missionRingGroup.name = 'MissionRingGroup';

  const ringGeo = new THREE.TorusGeometry(5.0, 0.45, 12, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#ecc94b',
    emissive: '#f6ad55',
    emissiveIntensity: 0.9,
    metalness: 0.7,
    roughness: 0.2,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  missionRingGroup.add(ringMesh);

  // Inner pulsing glow disc
  const discGeo = new THREE.CircleGeometry(4.6, 24);
  const discMat = new THREE.MeshBasicMaterial({
    color: '#fbbf24',
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const discMesh = new THREE.Mesh(discGeo, discMat);
  missionRingGroup.add(discMesh);
  missionRingGroup.visible = false;
  worldGroup.add(missionRingGroup);

  // Mission Beacon Pillar of Light (Shoots upward to the heavens)
  const missionBeaconGroup = new THREE.Group();
  const beaconGeo = new THREE.CylinderGeometry(1.4, 2.5, 120, 16, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.y = 60;
  missionBeaconGroup.add(beaconMesh);

  // Beacon ground target rings
  const targetRingGeo = new THREE.RingGeometry(2.0, 5.0, 24);
  targetRingGeo.rotateX(-Math.PI / 2);
  const targetRingMat = new THREE.MeshBasicMaterial({
    color: '#0284c7',
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const targetRingMesh = new THREE.Mesh(targetRingGeo, targetRingMat);
  targetRingMesh.position.y = 0.2;
  missionBeaconGroup.add(targetRingMesh);

  missionBeaconGroup.visible = false;
  worldGroup.add(missionBeaconGroup);

  // Function to configure ring or beacon based on active mission objective
  const setRingObjective = (objective: MissionObjective | null) => {
    if (!objective) {
      missionRingGroup.visible = false;
      missionBeaconGroup.visible = false;
      return;
    }

    const pos = objective.position;
    if (objective.type === 'ring') {
      missionRingGroup.visible = true;
      missionBeaconGroup.visible = true;
      missionRingGroup.position.set(...pos);
      missionBeaconGroup.position.set(pos[0], 0, pos[2]);
    } else {
      missionRingGroup.visible = false;
      missionBeaconGroup.visible = true;
      missionBeaconGroup.position.set(pos[0], 0, pos[2]);
    }
  };

  const removeCoinMesh = (coinId: string) => {
    const mesh = coinMeshes.get(coinId);
    if (mesh) {
      mesh.visible = false;
    }
  };

  const updateWorld = (elapsed: number, delta: number) => {
    // Spin windmill blades smoothly
    if (bladesGroup) {
      bladesGroup.rotation.z += delta * 0.8;
    }

    // Rotate lighthouse light beam
    if (lighthouseBeam) {
      lighthouseBeam.rotation.y += delta * 1.2;
    }

    // Spin floating coins
    coinMeshes.forEach((mesh) => {
      if (mesh.visible) {
        mesh.rotation.y += delta * 2.2;
      }
    });

    // Animate mission ring & beacon
    if (missionRingGroup.visible) {
      ringMesh.rotation.z += delta * 1.5;
      discMesh.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.08);
    }
    if (missionBeaconGroup.visible) {
      beaconMesh.rotation.y += delta * 0.5;
      targetRingMesh.rotation.z += delta * 1.0;
    }

    // Animate updraft particles rising
    updraftParticles.forEach((points) => {
      const pos = points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let py = pos.getY(i) + delta * 18;
        if (py > 90) py = 10;
        pos.setY(i, py);
      }
      pos.needsUpdate = true;
    });
  };

  return {
    group: worldGroup,
    windmillBlades: bladesGroup,
    lighthouseBeam,
    missionRingGroup,
    missionBeaconGroup,
    coinMeshes,
    updraftParticles,
    updateWorld,
    setRingObjective,
    removeCoinMesh,
  };
}
