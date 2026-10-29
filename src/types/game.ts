export interface BirdDef {
  id: string;
  name: string;
  species: string;
  description: string;
  price: number;
  unlocked: boolean;
  color: string;
  secondaryColor: string;
  accentColor: string;
  scale: number;
  wingspan: number;
  // Flying characteristics (1-10 scale for display, mapped to multipliers in physics)
  speedStat: number; // 1-10
  agilityStat: number; // 1-10
  glideStat: number; // 1-10
  diveStat: number; // 1-10
  baseSpeed: number; // Actual world units/sec
  maxSpeed: number;
  diveMultiplier: number;
  turnSpeed: number;
  flapStrength: number;
  trailColor: string;
}

export type MissionType = 'tutorial' | 'ring_course' | 'collect' | 'reach' | 'speed_run';

export interface MissionObjective {
  id: string;
  instruction: string;
  position: [number, number, number]; // x, y, z
  radius: number;
  type: 'reach' | 'ring' | 'collect' | 'land';
  completed: boolean;
  markerLabel?: string;
  additionalInfo?: string;
}

export interface Mission {
  id: string;
  title: string;
  category: 'didacticiel' | 'aventure' | 'defi';
  description: string;
  dialogue?: string;
  coinReward: number;
  objectives: MissionObjective[];
  currentObjectiveIndex: number;
  completed: boolean;
  unlocked: boolean;
}

export interface WorldLandmark {
  id: string;
  name: string;
  position: [number, number, number];
  icon: string;
  color: string;
}

export interface CoinPickup {
  id: string;
  position: [number, number, number];
  collected: boolean;
  respawnTime?: number;
  value: number;
}

export interface ThermalUpdraft {
  id: string;
  position: [number, number, number];
  radius: number;
  strength: number;
}
