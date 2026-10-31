import * as THREE from 'three';
import { BirdDef, ThermalUpdraft } from '../types/game';
import { getTerrainHeight, SEA_LEVEL } from '../world/proceduralWorld';
import { sounds } from '../audio/soundManager';

export interface FlightInputState {
  pitchUp: boolean; // S or Down
  pitchDown: boolean; // W or Up
  turnLeft: boolean; // A or Left
  turnRight: boolean; // D or Right
  flap: boolean; // Space
  dive: boolean; // Shift
}

export interface FlightTelemetry {
  position: THREE.Vector3;
  headingAngle: number;
  pitchAngle: number;
  rollAngle: number;
  speed: number;
  altitude: number;
  isDiving: boolean;
  isInUpdraft: boolean;
  flapPhase: number;
}

export class FlightController {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public headingAngle: number = 0; // Yaw (radians)
  public pitchAngle: number = 0; // Pitch (radians)
  public rollAngle: number = 0; // Roll (radians)
  public speed: number = 14;

  private birdDef: BirdDef;
  private flapTimer: number = 0;
  private flapPhase: number = 0;
  private isDiving: boolean = false;
  private isInUpdraft: boolean = false;

  // Camera follow helpers
  private cameraTarget: THREE.Vector3;
  private cameraLookAt: THREE.Vector3;

  constructor(birdDef: BirdDef) {
    this.birdDef = birdDef;
    this.position = new THREE.Vector3(0, 24, 0); // Start near the Grand Chêne nest
    this.velocity = new THREE.Vector3(0, 0, birdDef.baseSpeed);
    this.speed = birdDef.baseSpeed;
    this.cameraTarget = new THREE.Vector3();
    this.cameraLookAt = new THREE.Vector3();
  }

  public setBird(birdDef: BirdDef) {
    this.birdDef = birdDef;
    this.speed = Math.min(this.speed, birdDef.maxSpeed);
  }

  public resetPosition(pos: [number, number, number]) {
    this.position.set(pos[0], pos[1], pos[2]);
    this.speed = this.birdDef.baseSpeed;
    this.velocity.set(0, 0, this.speed);
    this.pitchAngle = 0;
    this.rollAngle = 0;
  }

  public update(
    delta: number,
    inputs: FlightInputState,
    camera: THREE.PerspectiveCamera,
    updrafts: ThermalUpdraft[]
  ): FlightTelemetry {
    const dt = Math.min(delta, 0.1);

    // 1. Turning & Banking (Yaw & Roll)
    const turnRate = this.birdDef.turnSpeed * (this.speed / this.birdDef.baseSpeed);
    let targetRoll = 0;

    if (inputs.turnLeft) {
      this.headingAngle += turnRate * dt;
      targetRoll = 0.55;
    } else if (inputs.turnRight) {
      this.headingAngle -= turnRate * dt;
      targetRoll = -0.55;
    }

    // Smooth roll damping
    this.rollAngle = THREE.MathUtils.damp(this.rollAngle, targetRoll, 8, dt);

    // 2. Pitch Control
    const pitchRate = 2.2;
    let targetPitch = 0;

    if (inputs.pitchDown) {
      // Nose down (dive)
      targetPitch = -0.65;
    } else if (inputs.pitchUp) {
      // Nose up (climb)
      targetPitch = 0.6;
    }

    this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, targetPitch, 7, dt);

    // 3. Diving Logic
    this.isDiving = inputs.dive || this.pitchAngle < -0.3;

    // 4. Flap Action
    if (inputs.flap) {
      this.flapTimer += dt * 9;
      // Gain lift and moderate speed
      this.speed = THREE.MathUtils.damp(
        this.speed,
        Math.min(this.speed + this.birdDef.flapStrength * 0.4, this.birdDef.maxSpeed * 0.95),
        4,
        dt
      );
      this.position.y += this.birdDef.flapStrength * dt * 0.65;
    } else {
      this.flapTimer += dt * (1.5 + this.speed * 0.12);
    }
    this.flapPhase = this.flapTimer;

    // 5. Speed & Gravity Dynamics
    if (this.isDiving) {
      // Accelerate rapidly downward
      const maxDiveSpeed = this.birdDef.maxSpeed * this.birdDef.diveMultiplier;
      this.speed = THREE.MathUtils.damp(this.speed, maxDiveSpeed, 2.5, dt);
      this.position.y -= (10 + (this.speed / maxDiveSpeed) * 18) * dt;
    } else if (this.pitchAngle > 0.2) {
      // Climbing loses speed
      this.speed = THREE.MathUtils.damp(this.speed, this.birdDef.baseSpeed * 0.7, 1.8, dt);
      this.position.y += this.speed * Math.sin(this.pitchAngle) * 0.8 * dt;
    } else {
      // Natural gentle glide back to cruising speed with slight descent
      this.speed = THREE.MathUtils.damp(this.speed, this.birdDef.baseSpeed, 1.2, dt);
      this.position.y -= (1.5 - (this.birdDef.glideStat / 10) * 0.9) * dt;
    }

    // 6. Thermal Updrafts Detection
    this.isInUpdraft = false;
    for (const u of updrafts) {
      const dist = Math.hypot(this.position.x - u.position[0], this.position.z - u.position[2]);
      if (dist < u.radius && this.position.y < 110) {
        this.isInUpdraft = true;
        const liftBonus = (1 - dist / u.radius) * u.strength * dt;
        this.position.y += liftBonus;
        this.speed = THREE.MathUtils.damp(this.speed, this.birdDef.maxSpeed * 0.85, 3, dt);
        break;
      }
    }

    // 7. Forward Translation
    const forwardX = Math.sin(this.headingAngle) * this.speed * dt;
    const forwardZ = Math.cos(this.headingAngle) * this.speed * dt;
    this.position.x += forwardX;
    this.position.z += forwardZ;

    // 8. Ground / Ocean Collision Soft Buffer (terrain and sea are infinite)
    const terrainY = getTerrainHeight(this.position.x, this.position.z);
    const groundY = Math.max(terrainY, SEA_LEVEL);
    const minAltitude = groundY + 1.6;
    if (this.position.y < minAltitude) {
      this.position.y = THREE.MathUtils.damp(this.position.y, minAltitude + 1.2, 12, dt);
      // Lift nose when skimming the terrain
      this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, 0.2, 10, dt);
    }

    // Ceiling clamp (stay below the upper troposphere)
    if (this.position.y > 150) {
      this.position.y = 150;
    }

    // Sound feedback for wind speed
    sounds.setSpeed(this.speed / this.birdDef.baseSpeed);

    // 9. Camera Cinematic Chase Follow
    // Camera is positioned behind and slightly above the bird
    const camDist = 6.8 + (this.speed / this.birdDef.maxSpeed) * 2.2;
    const camHeight = 2.4 - this.pitchAngle * 1.5;

    const camX = this.position.x - Math.sin(this.headingAngle) * camDist;
    const camZ = this.position.z - Math.cos(this.headingAngle) * camDist;
    const camY = Math.max(groundY + 1.8, this.position.y + camHeight);

    this.cameraTarget.set(camX, camY, camZ);
    camera.position.lerp(this.cameraTarget, 0.12);

    // Look slightly ahead of the bird
    const lookAheadDist = 8;
    this.cameraLookAt.set(
      this.position.x + Math.sin(this.headingAngle) * lookAheadDist,
      this.position.y + 0.6 + Math.sin(this.pitchAngle) * 4,
      this.position.z + Math.cos(this.headingAngle) * lookAheadDist
    );
    camera.lookAt(this.cameraLookAt);

    // Dynamic FOV widening with speed
    const baseFov = 60;
    const targetFov = baseFov + (this.speed / this.birdDef.maxSpeed) * 16;
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 4, dt);
    camera.updateProjectionMatrix();

    return {
      position: this.position,
      headingAngle: this.headingAngle,
      pitchAngle: this.pitchAngle,
      rollAngle: this.rollAngle,
      speed: Math.round(this.speed * 3.6), // Convert to km/h for display
      altitude: Math.round(this.position.y),
      isDiving: this.isDiving,
      isInUpdraft: this.isInUpdraft,
      flapPhase: this.flapPhase,
    };
  }
}
