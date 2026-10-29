import React, { useState } from 'react';
import { FlightTelemetry, FlightInputState } from '../game/flightController';
import { sounds } from '../audio/soundManager';
import {
  Volume2,
  VolumeX,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Wind,
  Zap,
  RotateCcw,
  Music,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FlightControlsOverlayProps {
  telemetry: FlightTelemetry;
  inputs: FlightInputState;
  onSetInput: (key: keyof FlightInputState, value: boolean) => void;
  onRespawnNest: () => void;
  birdName: string;
}

export const FlightControlsOverlay: React.FC<FlightControlsOverlayProps> = ({
  telemetry,
  inputs,
  onSetInput,
  onRespawnNest,
  birdName,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleChirp = () => {
    sounds.playChirp();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none select-none flex flex-col items-center">
      {/* Collapse / Expand Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="pointer-events-auto mb-1 bg-slate-950/80 hover:bg-slate-900 border border-slate-700/60 rounded-full px-3 py-1 text-[11px] text-slate-300 flex items-center gap-1 shadow-lg backdrop-blur-md transition"
        title="Masquer ou afficher les commandes de vol"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" /> Afficher Commandes
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" /> Masquer Commandes
          </>
        )}
      </button>

      {/* Main Glassmorphic Control Dock */}
      {!isCollapsed && (
        <div className="pointer-events-auto w-full bg-slate-950/85 border border-slate-700/60 rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-md text-white flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
          {/* Left: Flight Telemetry Gauges */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Speed Gauge */}
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition ${
                  telemetry.isDiving
                    ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  Vitesse
                </span>
                <span className="text-sm sm:text-base font-black font-mono leading-none">
                  {telemetry.speed}{' '}
                  <span className="text-[10px] font-normal text-slate-400">km/h</span>
                </span>
              </div>
            </div>

            {/* Altitude Gauge */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  Altitude
                </span>
                <span className="text-sm sm:text-base font-black font-mono leading-none">
                  {telemetry.altitude}{' '}
                  <span className="text-[10px] font-normal text-slate-400">m</span>
                </span>
              </div>
            </div>

            {/* Updraft Thermal Lift Pill (when riding a thermal column) */}
            {telemetry.isInUpdraft && (
              <div className="bg-amber-400/20 border border-amber-400/50 rounded-xl px-2.5 py-1 text-amber-300 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                <Wind className="w-3.5 h-3.5" />
                <span>Courant Chaud +</span>
              </div>
            )}
          </div>

          {/* Center: Controls Keyboard / Touch Quick Buttons */}
          <div className="flex items-center gap-2">
            {/* Flap Action Button */}
            <button
              onMouseDown={() => {
                onSetInput('flap', true);
                sounds.playFlap();
              }}
              onMouseUp={() => onSetInput('flap', false)}
              onTouchStart={() => {
                onSetInput('flap', true);
                sounds.playFlap();
              }}
              onTouchEnd={() => onSetInput('flap', false)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                inputs.flap
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg scale-95'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700'
              }`}
              title="Battre des ailes (Espace)"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Battre [ESPACE]</span>
            </button>

            {/* Dive Button */}
            <button
              onMouseDown={() => onSetInput('dive', true)}
              onMouseUp={() => onSetInput('dive', false)}
              onTouchStart={() => onSetInput('dive', true)}
              onTouchEnd={() => onSetInput('dive', false)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                inputs.dive || telemetry.isDiving
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-95'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700'
              }`}
              title="Piqué rapide (Maj / S)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Piqué [S / MAJ]</span>
            </button>

            {/* Chirp / Sing Button */}
            <button
              onClick={handleChirp}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
              title="Gazouiller / Chanter (C)"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chanter [C]</span>
            </button>
          </div>

          {/* Right: Sound toggle and Nest Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={onRespawnNest}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title="Retourner au Nid central"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* On-Screen Mobile D-Pad Virtual Controls (Shown on Touch Devices) */}
      <div className="sm:hidden fixed bottom-28 left-4 pointer-events-auto flex flex-col items-center gap-1 bg-slate-950/70 p-2 rounded-2xl border border-slate-800">
        <button
          onTouchStart={() => onSetInput('pitchDown', true)}
          onTouchEnd={() => onSetInput('pitchDown', false)}
          className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onTouchStart={() => onSetInput('turnLeft', true)}
            onTouchEnd={() => onSetInput('turnLeft', false)}
            className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onTouchStart={() => onSetInput('pitchUp', true)}
            onTouchEnd={() => onSetInput('pitchUp', false)}
            className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onTouchStart={() => onSetInput('turnRight', true)}
            onTouchEnd={() => onSetInput('turnRight', false)}
            className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
