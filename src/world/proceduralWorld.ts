import * as THREE from 'three';
import { CoinPickup, MissionObjective, ThermalUpdraft, WorldLandmark } from '../types/game';

// ---------------------------------------------------------------------------
// Open-world constants
// ---------------------------------------------------------------------------

/** Side length of one streamed terrain tile (world units). */
export const TERRAIN_TILE_SIZE = 480;
const TERRAIN_TILE_SEGMENTS = 36;
/** 2 => a 5x5 ring of tiles (2400 x 2400 units) always surrounds the player. */
const TERRAIN_VIEW_RADIUS = 2;
/** Sea level shared by the endless ocean plane and the terrain shading. */
export const SEA_LEVEL = 1.2;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Continuous, unbounded terrain height field.
 *
 * It is made only of cheap trigonometric layers so it can be evaluated for
 * every vertex of every streamed tile, for tree placement and for physics
 * ground collision — one single source of truth, with no world edge.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Broad rolling hills around sea level
  let h = 3;
  h += Math.sin(x * 0.0061 + 0.8) * Math.cos(z * 0.0053 - 0.4) * 3.5;
  h += Math.sin(x * 0.0137 - 1.1) * Math.sin(z * 0.0119 + 0.6) * 2.0;
  h += Math.sin((x + z) * 0.021) * 0.8;
  h += Math.sin(x * 0.047 - z * 0.041) * 0.4;

  // Occasional mountain ranges (they fade in and out across the map).
  // The starting valley is kept clear so the nest and first missions stay readable.
  const ridgeWave = Math.sin(x * 0.0024 + 1.7) * Math.cos(z * 0.0021 - 0.8);
  const mountainMask = smoothstep(0.3, 0.82, ridgeWave);
  const valleyMask = smoothstep(180, 520, Math.hypot(x, z));
  h += mountainMask * valleyMask * (26 + Math.sin(x * 0.009) * 5 + Math.cos(z * 0.008) * 5);

  // Occasional low basins that fill with water and become lakes
  const basinWave = Math.sin(x * 0.0041 + 2.1) * Math.cos(z * 0.0037 - 1.2);
  h -= smoothstep(0.45, 0.9, basinWave) * 11;

  // --- Signature landmarks around the starting valley -----------------------
  // Mountain ridge in the northwest (Falaises)
  const cliffDist = Math.hypot(x + 50, z + 120);
  if (cliffDist < 70) {
    const factor = Math.max(0, 1 - cliffDist / 70);
    h += factor * factor * 42;
  }

  // Village hill in the northeast
  const villageDist = Math.hypot(x - 110, z + 90);
  if (villageDist < 60) {
    const factor = Math.max(0, 1 - villageDist / 60);
    h += factor * 14;
  }

  // Lighthouse promontory in the southwest
  const lighthouseDist = Math.hypot(x + 130, z - 110);
  if (lighthouseDist < 50) {
    const factor = Math.max(0, 1 - lighthouseDist / 50);
    h += factor * 24;
  }

  // Windmill mound in the southeast
  const millDist = Math.hypot(x - 75, z - 60);
  if (millDist < 45) {
    const factor = Math.max(0, 1 - millDist / 45);
    h += factor * 10;
  }

  // Emerald lake depression
  const lakeDist = Math.hypot(x + 30, z - 40);
  if (lakeDist < 32) {
    const factor = Math.max(0, 1 - lakeDist / 32);
    h -= factor * 8;
  }

  return Math.max(-12, h);
}

export interface WorldSceneRig {
  group: THREE.Group;
  windmillBlades?: THREE.Group;
  lighthouseBeam?: THREE.Mesh;
  missionRingGroup: THREE.Group;
  missionBeaconGroup: THREE.Group;
  coinMeshes: Map<string, THREE.Mesh>;
  updraftParticles: THREE.Points[];
  updateWorld: (elapsed: number, delta: number, playerPosition: THREE.Vector3) => void;
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

  // 1. Endless streamed terrain -------------------------------------------------
  // The map has no border: square tiles are (re)generated around the player as
  // they fly, using the unbounded getTerrainHeight() field. The same tiles are
  // reused while the player stays inside them, so there is no visible popping.
  const tileGroup = new THREE.Group();
  tileGroup.name = 'StreamedTerrain';
  worldGroup.add(tileGroup);

  const activeTiles = new Map<string, THREE.Group>();
  let streamedCenter: { ix: number; iz: number } | null = null;

  const colorGrass = new THREE.Color('#4a7c36');
  const colorHill = new THREE.Color('#386629');
  const colorRock = new THREE.Color('#6c757d');
  const colorPeak = new THREE.Color('#94a3b8');
  const colorSand = new THREE.Color('#e2c88f');
  const tmpColor = new THREE.Color();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  // Shared forest assets (one geometry/material for every tile)
  const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 5);
  treeTrunkGeo.translate(0, 2, 0);
  const treeFoliageGeo = new THREE.ConeGeometry(2.4, 6, 5);
  treeFoliageGeo.translate(0, 6, 0);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: '#543d2b', roughness: 0.9 });
  const treeFoliageMat = new THREE.MeshStandardMaterial({
    color: '#276749',
    roughness: 0.8,
    flatShading: true,
  });

  const LANDMARK_CLEARINGS = [
    { x: 0, z: 0, r: 26 }, // Grand Chêne
    { x: 75, z: 60, r: 18 }, // Moulin
    { x: -130, z: 110, r: 22 }, // Phare
    { x: 110, z: -90, r: 24 }, // Village
    { x: -50, z: -120, r: 20 }, // Falaises
    { x: -30, z: 40, r: 36 }, // Lac
  ];

  const mulberry32 = (seed: number) => {
    let t = seed;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  const tileSeed = (ix: number, iz: number) =>
    (Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663) ^ 0x9e3779b9) | 0;

  const createTerrainTile = (ix: number, iz: number): THREE.Group => {
    const group = new THREE.Group();
    group.name = `Tile_${ix}_${iz}`;
    group.position.set(ix * TERRAIN_TILE_SIZE, 0, iz * TERRAIN_TILE_SIZE);

    const geo = new THREE.PlaneGeometry(
      TERRAIN_TILE_SIZE,
      TERRAIN_TILE_SIZE,
      TERRAIN_TILE_SEGMENTS,
      TERRAIN_TILE_SEGMENTS
    );
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const localX = posAttr.getX(i);
      const localZ = posAttr.getZ(i);
      const worldX = ix * TERRAIN_TILE_SIZE + localX;
      const worldZ = iz * TERRAIN_TILE_SIZE + localZ;
      const y = getTerrainHeight(worldX, worldZ);
      posAttr.setY(i, y);

      if (y < 2.8) {
        tmpColor.copy(colorSand);
      } else if (y < 18) {
        tmpColor.lerpColors(colorGrass, colorHill, y / 18);
      } else if (y < 35) {
        tmpColor.lerpColors(colorHill, colorRock, (y - 18) / 17);
      } else {
        tmpColor.lerpColors(colorRock, colorPeak, Math.min(1, (y - 35) / 20));
      }

      // Subtle patchwork so huge meadows never look like one flat colour
      const patch = 1 + Math.sin(worldX * 0.041 + worldZ * 0.017) * 0.07
        + Math.cos(worldZ * 0.035 - worldX * 0.012) * 0.05;
      tmpColor.multiplyScalar(patch);

      colorAttr[i * 3] = tmpColor.r;
      colorAttr[i * 3 + 1] = tmpColor.g;
      colorAttr[i * 3 + 2] = tmpColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, terrainMat);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Deterministic instanced forest for this tile
    const rand = mulberry32(tileSeed(ix, iz));
    const targetTrees = 34 + Math.floor(rand() * 34);
    const trees: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];

    for (let attempt = 0; attempt < targetTrees * 5 && trees.length < targetTrees; attempt++) {
      const worldX = ix * TERRAIN_TILE_SIZE + rand() * TERRAIN_TILE_SIZE;
      const worldZ = iz * TERRAIN_TILE_SIZE + rand() * TERRAIN_TILE_SIZE;
      if (LANDMARK_CLEARINGS.some((c) => Math.hypot(worldX - c.x, worldZ - c.z) < c.r)) continue;

      const y = getTerrainHeight(worldX, worldZ);
      if (y < 2.6 || y > 44) continue;

      trees.push({
        x: worldX - ix * TERRAIN_TILE_SIZE,
        y,
        z: worldZ - iz * TERRAIN_TILE_SIZE,
        s: 0.75 + rand() * 0.6,
        rot: rand() * Math.PI * 2,
      });
    }

    if (trees.length > 0) {
      const instTrunk = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, trees.length);
      const instFoliage = new THREE.InstancedMesh(treeFoliageGeo, treeFoliageMat, trees.length);
      instTrunk.castShadow = true;
      instFoliage.castShadow = true;

      const dummy = new THREE.Object3D();
      trees.forEach((tree, index) => {
        dummy.position.set(tree.x, tree.y, tree.z);
        dummy.scale.setScalar(tree.s);
        dummy.rotation.set(0, tree.rot, 0);
        dummy.updateMatrix();
        instTrunk.setMatrixAt(index, dummy.matrix);
        instFoliage.setMatrixAt(index, dummy.matrix);
      });
      instTrunk.instanceMatrix.needsUpdate = true;
      instFoliage.instanceMatrix.needsUpdate = true;
      instTrunk.computeBoundingSphere();
      instFoliage.computeBoundingSphere();
      group.add(instTrunk, instFoliage);
    }

    group.userData.terrainGeo = geo;
    return group;
  };

  const disposeTile = (tile: THREE.Group) => {
    tile.traverse((child) => {
      if (child instanceof THREE.InstancedMesh) {
        // Frees the per-tile instance matrix; shared geometry stays alive.
        child.dispose();
      }
    });
    const geo = tile.userData.terrainGeo as THREE.BufferGeometry | undefined;
    geo?.dispose();
  };

  const updateStreaming = (playerX: number, playerZ: number) => {
    const centerX = Math.floor(playerX / TERRAIN_TILE_SIZE);
    const centerZ = Math.floor(playerZ / TERRAIN_TILE_SIZE);
    if (streamedCenter && streamedCenter.ix === centerX && streamedCenter.iz === centerZ) {
      return;
    }
    streamedCenter = { ix: centerX, iz: centerZ };

    const wantedKeys = new Set<string>();
    for (let dx = -TERRAIN_VIEW_RADIUS; dx <= TERRAIN_VIEW_RADIUS; dx++) {
      for (let dz = -TERRAIN_VIEW_RADIUS; dz <= TERRAIN_VIEW_RADIUS; dz++) {
        wantedKeys.add(`${centerX + dx}:${centerZ + dz}`);
      }
    }

    // Drop tiles that left the ring
    activeTiles.forEach((tile, key) => {
      if (!wantedKeys.has(key)) {
        tileGroup.remove(tile);
        disposeTile(tile);
        activeTiles.delete(key);
      }
    });

    // Build tiles that entered the ring
    wantedKeys.forEach((key) => {
      if (activeTiles.has(key)) return;
      const [ix, iz] = key.split(':').map(Number);
      const tile = createTerrainTile(ix, iz);
      tileGroup.add(tile);
      activeTiles.set(key, tile);
    });
  };

  // 2. Surrounding Ocean (follows the player so it also feels endless)
  const oceanGeo = new THREE.PlaneGeometry(4600, 4600, 12, 12);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: '#2b6cb0',
    roughness: 0.62,
    metalness: 0.04,
    transparent: true,
    opacity: 0.9,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = SEA_LEVEL;
  worldGroup.add(oceanMesh);

  // Lake emerald water disk
  const lakeGeo = new THREE.CircleGeometry(29, 24);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMat = new THREE.MeshStandardMaterial({
    color: '#2c9f9b',
    roughness: 0.55,
    metalness: 0.04,
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

  // 7. Forest — instanced trees are generated with each terrain tile (see above)

  // 8. Procedural Clouds in Sky (Fluffy clusters, wrapped around the player)
  const cloudCount = 22;
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });

  const clouds: THREE.Group[] = [];
  for (let c = 0; c < cloudCount; c++) {
    const cloud = new THREE.Group();
    const cx = (Math.random() - 0.5) * 1200;
    const cy = 55 + Math.random() * 50;
    const cz = (Math.random() - 0.5) * 1200;
    cloud.position.set(cx, cy, cz);

    const puffs = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffs; p++) {
      const pGeo = new THREE.DodecahedronGeometry(5 + Math.random() * 6);
      const puff = new THREE.Mesh(pGeo, cloudMat);
      puff.position.set((p - puffs / 2) * 5 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5);
      cloud.add(puff);
    }
    worldGroup.add(cloud);
    clouds.push(cloud);
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
      size: 0.55,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
    const groundY = Math.max(getTerrainHeight(pos[0], pos[2]), SEA_LEVEL);
    if (objective.type === 'ring') {
      missionRingGroup.visible = true;
      missionBeaconGroup.visible = true;
      missionRingGroup.position.set(...pos);
      missionBeaconGroup.position.set(pos[0], groundY, pos[2]);
    } else {
      missionRingGroup.visible = false;
      missionBeaconGroup.visible = true;
      missionBeaconGroup.position.set(pos[0], groundY, pos[2]);
    }
  };

  const removeCoinMesh = (coinId: string) => {
    const mesh = coinMeshes.get(coinId);
    if (mesh) {
      mesh.visible = false;
    }
  };

  const updateWorld = (elapsed: number, delta: number, playerPosition: THREE.Vector3) => {
    // Stream new terrain tiles when the player crosses a tile boundary
    updateStreaming(playerPosition.x, playerPosition.z);

    // Endless ocean follows the player
    oceanMesh.position.x = playerPosition.x;
    oceanMesh.position.z = playerPosition.z;
    oceanMesh.position.y = SEA_LEVEL;

    // Clouds drift and wrap around the player, so the sky never runs out
    clouds.forEach((cloud) => {
      cloud.position.x += delta * 0.7;
      const dx = cloud.position.x - playerPosition.x;
      const dz = cloud.position.z - playerPosition.z;
      if (dx > 900) cloud.position.x -= 1800;
      else if (dx < -900) cloud.position.x += 1800;
      if (dz > 900) cloud.position.z -= 1800;
      else if (dz < -900) cloud.position.z += 1800;
    });

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

  // Generate the first 5x5 ring of tiles around the starting nest
  updateStreaming(0, 0);

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
