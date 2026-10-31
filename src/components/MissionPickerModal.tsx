import React from 'react';
import { Mission } from '../types/game';
import {
  Coins,
  MapPin,
  Navigation,
  CheckCircle2,
  RotateCcw,
  X,
  ListChecks,
  Route,
} from 'lucide-react';

interface MissionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: Mission[];
  activeMissionId: string;
  onSelectMission: (missionId: string) => void;
  birdPos: [number, number, number];
  coins: number;
}

const formatDistance = (distance: number) => {
  if (distance >= 1000) return `${(distance / 1000).toFixed(distance >= 10000 ? 0 : 1)} km`;
  return `${Math.round(distance)} m`;
};

export const MissionPickerModal: React.FC<MissionPickerModalProps> = ({
  isOpen,
  onClose,
  missions,
  activeMissionId,
  onSelectMission,
  birdPos,
  coins,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30 shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white leading-tight">
                Choisir une mission
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2">
                Gains, distance et étapes — toutes les missions sont jouables et rejouables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="bg-slate-800/90 border border-amber-400/40 rounded-2xl px-2.5 sm:px-3 py-1.5 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-mono font-black text-amber-300 text-sm">{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mission list */}
        <div className="p-3 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 flex-1">
          {missions.map((mission) => {
            const isActive = activeMissionId === mission.id;
            const nextIndex = Math.min(
              mission.currentObjectiveIndex,
              mission.objectives.length - 1
            );
            const nextObjective = mission.objectives[nextIndex] ?? mission.objectives[0];

            const distance = nextObjective
              ? Math.hypot(
                  nextObjective.position[0] - birdPos[0],
                  nextObjective.position[1] - birdPos[1],
                  nextObjective.position[2] - birdPos[2]
                )
              : 0;

            let routeLength = 0;
            for (let i = 1; i < mission.objectives.length; i++) {
              const a = mission.objectives[i - 1].position;
              const b = mission.objectives[i].position;
              routeLength += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
            }

            return (
              <div
                key={mission.id}
                className={`relative rounded-2xl border p-3.5 flex flex-col justify-between transition ${
                  isActive
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
                    : mission.completed
                    ? 'bg-slate-800/40 border-slate-800'
                    : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          mission.category === 'didacticiel'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : mission.category === 'defi'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {mission.category}
                      </span>
                      {mission.completed && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Terminée
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-black text-amber-400 shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                      <span>+{mission.coinReward}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1.5">{mission.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-2">
                    {mission.description}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 bg-slate-950/50 border border-slate-700/60 rounded-lg px-2 py-1 text-sky-300 font-mono font-bold">
                      <Navigation className="w-3 h-3" />
                      {formatDistance(distance)}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950/50 border border-slate-700/60 rounded-lg px-2 py-1 text-slate-300 font-mono">
                      <Route className="w-3 h-3" />
                      {formatDistance(routeLength)}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950/50 border border-slate-700/60 rounded-lg px-2 py-1 text-slate-300 font-mono">
                      <MapPin className="w-3 h-3" />
                      {mission.objectives.length} étapes
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">
                    {isActive ? 'Mission en cours' : mission.completed ? 'Rejouable' : 'Disponible'}
                  </span>

                  <button
                    onClick={() => onSelectMission(mission.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                      isActive
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gradient-to-r from-sky-600 to-indigo-500 hover:from-sky-500 hover:to-indigo-400 text-white shadow-md shadow-sky-500/20'
                    }`}
                  >
                    {mission.completed ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" /> Rejouer
                      </>
                    ) : isActive ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" /> Recommencer
                      </>
                    ) : (
                      <>Lancer</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/50 text-[10px] text-slate-500 text-center">
          Astuce : les distances sont calculées depuis votre position actuelle. Le monde n’a pas de
          limite — explorez !
        </div>
      </div>
    </div>
  );
};
