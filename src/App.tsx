import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { BirdDef, CoinPickup, Mission } from './types/game';
import { INITIAL_BIRDS } from './game/birdsData';
import {
  INITIAL_MISSIONS,
  WORLD_LANDMARKS,
  INITIAL_COINS,
  THERMAL_UPDRAFTS,
} from './game/missionsData';
import { FlightTelemetry, FlightInputState } from './game/flightController';
import { FlightCanvas } from './components/FlightCanvas';
import { Minimap } from './components/Minimap';
import { MissionHUD } from './components/MissionHUD';
import { BirdShopModal } from './components/BirdShopModal';
import { FlightControlsOverlay } from './components/FlightControlsOverlay';
import { sounds } from './audio/soundManager';

const STORAGE_KEYS = {
  COINS: 'lenvol_bird_coins',
  BIRDS: 'lenvol_bird_unlocked',
  ACTIVE_BIRD: 'lenvol_active_bird',
  MISSIONS: 'lenvol_missions_state',
};

export default function App() {
  // 1. Persistent State
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COINS);
    return saved !== null ? parseInt(saved, 10) : 30; // 30 starting coins
  });

  const [birds, setBirds] = useState<BirdDef[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BIRDS);
    if (!saved) return INITIAL_BIRDS;
    try {
      const unlockedIds: string[] = JSON.parse(saved);
      return INITIAL_BIRDS.map((b) => ({
        ...b,
        unlocked: b.unlocked || unlockedIds.includes(b.id),
      }));
    } catch {
      return INITIAL_BIRDS;
    }
  });

  const [activeBirdId, setActiveBirdId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BIRD);
    return saved || 'sparrow';
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MISSIONS);
    if (!saved) return INITIAL_MISSIONS;
    try {
      const parsed: Mission[] = JSON.parse(saved);
      return parsed;
    } catch {
      return INITIAL_MISSIONS;
    }
  });

  const [activeMissionId, setActiveMissionId] = useState<string>(() => {
    const firstActive = missions.find((m) => !m.completed && m.unlocked);
    return firstActive ? firstActive.id : missions[0].id;
  });

  // World Coins pick-up states
  const [worldCoins, setWorldCoins] = useState<CoinPickup[]>(INITIAL_COINS);

  // Flight Inputs & Telemetry
  const [inputs, setInputs] = useState<FlightInputState>({
    pitchUp: false,
    pitchDown: false,
    turnLeft: false,
    turnRight: false,
    flap: false,
    dive: false,
  });

  const [telemetry, setTelemetry] = useState<FlightTelemetry>({
    position: { x: 0, y: 24, z: 0 } as any,
    headingAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    speed: 14,
    altitude: 24,
    isDiving: false,
    isInUpdraft: false,
    flapPhase: 0,
  });

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [recentReward, setRecentReward] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COINS, coins.toString());
  }, [coins]);

  useEffect(() => {
    const unlockedIds = birds.filter((b) => b.unlocked).map((b) => b.id);
    localStorage.setItem(STORAGE_KEYS.BIRDS, JSON.stringify(unlockedIds));
  }, [birds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BIRD, activeBirdId);
  }, [activeBirdId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
  }, [missions]);

  // Active Bird Object
  const activeBird = birds.find((b) => b.id === activeBirdId) || birds[0];

  // Active Mission & Current Objective
  const currentMission = missions.find((m) => m.id === activeMissionId) || null;
  const currentObjective =
    currentMission && !currentMission.completed
      ? currentMission.objectives[currentMission.currentObjectiveIndex] || null
      : null;

  // Keyboard Event Listeners for smooth flight control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Audio init on first user touch/key
      sounds.init();

      // Don't intercept when modal forms are active
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setInputs((prev) => ({ ...prev, pitchDown: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setInputs((prev) => ({ ...prev, pitchUp: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setInputs((prev) => ({ ...prev, turnLeft: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setInputs((prev) => ({ ...prev, turnRight: true }));
          break;
        case 'Space':
          e.preventDefault();
          setInputs((prev) => {
            if (!prev.flap) sounds.playFlap();
            return { ...prev, flap: true };
          });
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setInputs((prev) => ({ ...prev, dive: true }));
          break;
        case 'KeyC':
          sounds.playChirp();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setInputs((prev) => ({ ...prev, pitchDown: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setInputs((prev) => ({ ...prev, pitchUp: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setInputs((prev) => ({ ...prev, turnLeft: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setInputs((prev) => ({ ...prev, turnRight: false }));
          break;
        case 'Space':
          e.preventDefault();
          setInputs((prev) => ({ ...prev, flap: false }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setInputs((prev) => ({ ...prev, dive: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update specific input state (from HUD or Touch buttons)
  const handleSetInput = useCallback((key: keyof FlightInputState, value: boolean) => {
    sounds.init();
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Telemetry callback from FlightCanvas
  const handleTelemetryUpdate = useCallback((newTelemetry: FlightTelemetry) => {
    setTelemetry(newTelemetry);
  }, []);

  // Mission Objective Progression
  const handleObjectiveProgress = useCallback(() => {
    if (!currentMission || currentMission.completed) return;

    setMissions((prevMissions) => {
      return prevMissions.map((m) => {
        if (m.id !== currentMission.id) return m;

        const updatedObjectives = m.objectives.map((obj, idx) => {
          if (idx === m.currentObjectiveIndex) {
            return { ...obj, completed: true };
          }
          return obj;
        });

        const nextIndex = m.currentObjectiveIndex + 1;
        const isAllDone = nextIndex >= m.objectives.length;

        if (isAllDone) {
          // Mission completed!
          sounds.playMissionComplete();
          const reward = m.coinReward;
          setCoins((c) => c + reward);
          setRecentReward(reward);
          setTimeout(() => setRecentReward(null), 4000);

          try {
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.5 },
              colors: ['#f6e05e', '#ecc94b', '#48bb78', '#63b3ed'],
            });
          } catch {
            // ignore
          }

          return {
            ...m,
            objectives: updatedObjectives,
            currentObjectiveIndex: nextIndex,
            completed: true,
          };
        }

        return {
          ...m,
          objectives: updatedObjectives,
          currentObjectiveIndex: nextIndex,
        };
      });
    });

    // Auto-unlock next mission if current is completed
    setMissions((prevMissions) => {
      const curIdx = prevMissions.findIndex((m) => m.id === currentMission.id);
      if (curIdx >= 0 && curIdx + 1 < prevMissions.length) {
        const nextMission = prevMissions[curIdx + 1];
        if (!nextMission.unlocked) {
          return prevMissions.map((m, idx) => (idx === curIdx + 1 ? { ...m, unlocked: true } : m));
        }
      }
      return prevMissions;
    });
  }, [currentMission]);

  // World Coins Collection
  const handleCoinCollected = useCallback((coinId: string, value: number) => {
    setWorldCoins((prev) =>
      prev.map((c) => (c.id === coinId ? { ...c, collected: true } : c))
    );
    setCoins((c) => c + value);
  }, []);

  // Select bird in Aviary
  const handleSelectBird = useCallback((birdId: string) => {
    setActiveBirdId(birdId);
    sounds.playBuy();
  }, []);

  // Purchase bird in Aviary
  const handleBuyBird = useCallback((birdId: string): boolean => {
    const targetBird = birds.find((b) => b.id === birdId);
    if (!targetBird || coins < targetBird.price) return false;

    setCoins((c) => c - targetBird.price);
    setBirds((prev) =>
      prev.map((b) => (b.id === birdId ? { ...b, unlocked: true } : b))
    );
    setActiveBirdId(birdId);
    return true;
  }, [birds, coins]);

  // Respawn bird to nest
  const handleRespawnNest = useCallback(() => {
    setResetSignal((s) => s + 1);
  }, []);

  // Bird position tuple for Minimap
  const birdPositionTuple: [number, number, number] = [
    telemetry.position.x || 0,
    telemetry.position.y || 24,
    telemetry.position.z || 0,
  ];

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
      onClick={() => sounds.init()}
    >
      {/* 3D WebGL Flight Viewport */}
      <FlightCanvas
        activeBird={activeBird}
        inputs={inputs}
        currentObjective={currentObjective}
        landmarks={WORLD_LANDMARKS}
        coins={worldCoins}
        updrafts={THERMAL_UPDRAFTS}
        onObjectiveProgress={handleObjectiveProgress}
        onCoinCollected={handleCoinCollected}
        onTelemetryUpdate={handleTelemetryUpdate}
        resetSignal={resetSignal}
      />

      {/* Top HUD: Mission Guidance, Coins, Aviary Button */}
      <MissionHUD
        currentMission={currentMission}
        allMissions={missions}
        onSelectMission={setActiveMissionId}
        coins={coins}
        recentReward={recentReward}
        onOpenAviary={() => setIsShopOpen(true)}
      />

      {/* Requested Bottom-Right Radar Minimap with Real-time Distance */}
      <Minimap
        birdPos={birdPositionTuple}
        headingAngle={telemetry.headingAngle}
        currentObjective={currentObjective}
        landmarks={WORLD_LANDMARKS}
      />

      {/* Bottom Center Dock: Flight Controls & Telemetry */}
      <FlightControlsOverlay
        telemetry={telemetry}
        inputs={inputs}
        onSetInput={handleSetInput}
        onRespawnNest={handleRespawnNest}
        birdName={activeBird.name}
      />

      {/* Bird Shop / Aviary Modal */}
      <BirdShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        birds={birds}
        activeBirdId={activeBirdId}
        coins={coins}
        onSelectBird={handleSelectBird}
        onBuyBird={handleBuyBird}
      />
    </main>
  );
}
