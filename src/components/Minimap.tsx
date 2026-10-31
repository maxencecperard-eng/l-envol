import React, { useEffect, useState } from 'react';
import { Compass, Navigation, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { MissionObjective, WorldLandmark } from '../types/game';

interface MinimapProps {
  birdPos: [number, number, number];
  headingAngle: number;
  currentObjective: MissionObjective | null;
  landmarks: WorldLandmark[];
}

const RADAR_RANGES = [220, 450, 900, 1800];

export const Minimap: React.FC<MinimapProps> = ({
  birdPos,
  headingAngle,
  currentObjective,
  landmarks,
}) => {
  const [radarRange, setRadarRange] = useState<number>(RADAR_RANGES[0]); // World units radius
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // Phones get a smaller radar that sits above the flight controls dock
  const [isNarrow, setIsNarrow] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  const [isShort, setIsShort] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-height: 520px)').matches
  );
  // Touch layouts use the taller two-row control dock
  const [isTouch, setIsTouch] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    const narrowQuery = window.matchMedia('(max-width: 639px)');
    const shortQuery = window.matchMedia('(max-height: 520px)');
    const touchQuery = window.matchMedia('(pointer: coarse)');
    const handleNarrow = (event: MediaQueryListEvent) => {
      setIsNarrow(event.matches);
      if (event.matches) setIsExpanded(false);
    };
    const handleShort = (event: MediaQueryListEvent) => setIsShort(event.matches);
    const handleTouch = (event: MediaQueryListEvent) => setIsTouch(event.matches);
    narrowQuery.addEventListener('change', handleNarrow);
    shortQuery.addEventListener('change', handleShort);
    touchQuery.addEventListener('change', handleTouch);
    return () => {
      narrowQuery.removeEventListener('change', handleNarrow);
      shortQuery.removeEventListener('change', handleShort);
      touchQuery.removeEventListener('change', handleTouch);
    };
  }, []);

  const isCompact = isNarrow || isShort;
  const mapSize = isExpanded
    ? isShort
      ? 170
      : isCompact
      ? 200
      : 240
    : isShort
    ? 112
    : isNarrow
    ? 124
    : 170;
  const halfSize = mapSize / 2;
  // Keep the radar clear of the bottom control dock on small screens
  const bottomOffset = isTouch ? (isShort ? 172 : 190) : isShort ? 124 : isNarrow ? 190 : 16;

  // Compute distance to current mission objective
  let distToObjective = 0;
  let angleToObjective = 0;
  let relObjectiveX = 0;
  let relObjectiveZ = 0;

  if (currentObjective) {
    const dx = currentObjective.position[0] - birdPos[0];
    const dz = currentObjective.position[2] - birdPos[2];
    const dy = currentObjective.position[1] - birdPos[1];
    distToObjective = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));

    // World angle
    const targetAngle = Math.atan2(dx, dz);
    // Relative angle compared to bird heading
    angleToObjective = targetAngle - headingAngle;

    // Projected position on radar
    const scale = (halfSize - 18) / radarRange;
    relObjectiveX = dx * scale;
    relObjectiveZ = dz * scale;

    // Clamp inside radar circle if farther than range
    const radarDist = Math.hypot(relObjectiveX, relObjectiveZ);
    if (radarDist > halfSize - 16) {
      const clampFactor = (halfSize - 16) / radarDist;
      relObjectiveX *= clampFactor;
      relObjectiveZ *= clampFactor;
    }
  }

  // Format distance cleanly
  const formatDist = (d: number) => {
    if (d >= 1000) {
      return `${(d / 1000).toFixed(1)} km`;
    }
    return `${d} m`;
  };

  return (
    <div
      className="fixed right-2 sm:right-4 z-30 select-none flex flex-col items-end pointer-events-auto"
      style={{
        bottom: `${bottomOffset}px`,
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
      }}
    >
      {/* Objective Distance Callout Banner */}
      {currentObjective && (
        <div className="mb-2 bg-slate-900/90 text-white border border-amber-400/50 rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-2 text-xs shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <div
            className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0"
            style={{
              transform: `rotate(${-(angleToObjective * (180 / Math.PI))}deg)`,
              transition: 'transform 0.1s linear',
            }}
          >
            <Navigation className="w-3 h-3 fill-amber-400 text-amber-400" />
          </div>
          <div className="flex flex-col">
            {!isCompact && (
              <span className="text-[10px] text-amber-300/80 font-medium tracking-wider uppercase">
                Mission Active
              </span>
            )}
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-amber-300">{formatDist(distToObjective)}</span>
              <span className="text-slate-400 text-[11px] font-normal truncate max-w-[90px] sm:max-w-[130px]">
                {currentObjective.markerLabel || currentObjective.instruction}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Radar Frame */}
      <div
        className="relative bg-slate-950/85 border-2 border-emerald-500/40 rounded-full overflow-hidden shadow-2xl backdrop-blur-md flex items-center justify-center"
        style={{ width: `${mapSize}px`, height: `${mapSize}px` }}
      >
        {/* Subtle Radar scan lines and concentric circles */}
        <div
          className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 60%, rgba(2,6,23,0.95) 100%)',
          }}
        />

        <div className="absolute inset-2 border border-emerald-500/20 rounded-full" />
        <div className="absolute inset-8 border border-emerald-500/20 rounded-full" />
        <div className="absolute inset-16 border border-emerald-500/15 rounded-full" />

        {/* Crosshair grid lines */}
        <div className="absolute w-full h-[1px] bg-emerald-500/20" />
        <div className="absolute h-full w-[1px] bg-emerald-500/20" />

        {/* Cardinal Points (N, S, E, W) */}
        <span className="absolute top-1 text-[9px] font-mono font-bold text-emerald-400/90">N</span>
        <span className="absolute bottom-1 text-[9px] font-mono font-bold text-slate-500">S</span>
        <span className="absolute right-1 text-[9px] font-mono font-bold text-slate-500">E</span>
        <span className="absolute left-1.5 text-[9px] font-mono font-bold text-slate-500">O</span>

        {/* Landmarks Markers */}
        {landmarks.map((lm) => {
          const dx = lm.position[0] - birdPos[0];
          const dz = lm.position[2] - birdPos[2];
          const scale = (halfSize - 20) / radarRange;
          let lx = dx * scale;
          let lz = dz * scale;

          // Don't render if outside radar perimeter
          if (Math.hypot(lx, lz) > halfSize - 14) return null;

          return (
            <div
              key={lm.id}
              className="absolute pointer-events-none flex flex-col items-center justify-center"
              style={{
                transform: `translate(${lx}px, ${lz}px)`,
                transition: 'transform 0.05s linear',
              }}
              title={lm.name}
            >
              <div
                className="w-2.5 h-2.5 rounded-full border border-white/60 shadow"
                style={{ backgroundColor: lm.color }}
              />
              {isExpanded && (
                <span className="text-[8px] text-white/80 font-mono tracking-tighter whitespace-nowrap bg-black/60 px-1 rounded mt-0.5">
                  {lm.name.slice(0, 8)}
                </span>
              )}
            </div>
          );
        })}

        {/* Active Mission Objective Glowing Beacon on Radar */}
        {currentObjective && (
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              transform: `translate(${relObjectiveX}px, ${relObjectiveZ}px)`,
              transition: 'transform 0.05s linear',
            }}
          >
            {/* Pulsing beacon waves */}
            <div className="absolute w-6 h-6 rounded-full bg-amber-400/30 animate-ping" />
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>
          </div>
        )}

        {/* Player Bird in Center with Heading Arrow */}
        <div className="absolute z-20 flex items-center justify-center pointer-events-none">
          <div
            className="w-6 h-6 flex items-center justify-center text-emerald-400"
            style={{
              transform: `rotate(${headingAngle * (180 / Math.PI)}deg)`,
            }}
          >
            {/* Stylized Avian Arrow Icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-emerald-400 drop-shadow">
              <path d="M12 2L4 20L12 16L20 20L12 2Z" />
            </svg>
          </div>
          {/* Subtle center dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-white absolute" />
        </div>

        {/* Radar Controls Overlay Buttons (Zoom & Expand) */}
        <div className="absolute bottom-1 right-2 flex items-center gap-1 z-30">
          <button
            onClick={() =>
              setRadarRange((prev) => {
                const index = RADAR_RANGES.indexOf(prev);
                return RADAR_RANGES[(index + 1) % RADAR_RANGES.length];
              })
            }
            className="px-1.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] transition flex items-center gap-0.5"
            title="Ajuster le zoom du radar"
          >
            {radarRange <= 220 ? <ZoomIn className="w-3 h-3" /> : <ZoomOut className="w-3 h-3" />}
            <span className="font-mono text-[8px]">{radarRange >= 1000 ? `${radarRange / 1000}k` : radarRange}</span>
          </button>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
            title={isExpanded ? 'Réduire la carte' : 'Agrandir la carte'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>

        {/* Altitude + open-world hint on top-left of radar */}
        <div className="absolute top-1.5 left-3 flex flex-col text-[9px] font-mono text-emerald-300/80">
          <span>ALT {Math.round(birdPos[1])}m</span>
          <span className="text-[8px] text-slate-400">Monde ouvert ∞</span>
        </div>
      </div>
    </div>
  );
};
