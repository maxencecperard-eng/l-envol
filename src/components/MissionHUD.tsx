import React, { useState } from 'react';
import { Mission } from '../types/game';
import { CheckCircle2, Circle, Coins, Compass, Sparkles, BookOpen, ChevronRight, Trophy } from 'lucide-react';

interface MissionHUDProps {
  currentMission: Mission | null;
  allMissions: Mission[];
  onSelectMission: (missionId: string) => void;
  coins: number;
  recentReward: number | null;
  onOpenAviary: () => void;
}

export const MissionHUD: React.FC<MissionHUDProps> = ({
  currentMission,
  allMissions,
  onSelectMission,
  coins,
  recentReward,
  onOpenAviary,
}) => {
  const [isOpenList, setIsOpenList] = useState(false);

  const activeObj =
    currentMission && currentMission.objectives[currentMission.currentObjectiveIndex];

  return (
    <>
      {/* Top Header Bar: Coins Balance + Mission Title + Aviary Button */}
      <header className="fixed top-3 inset-x-3 md:inset-x-6 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Active Mission Card & Didacticiel Guide */}
        <div className="flex flex-col gap-2 max-w-md pointer-events-auto">
          {currentMission ? (
            <div className="bg-slate-950/85 border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-white">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      currentMission.category === 'didacticiel'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : currentMission.category === 'defi'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {currentMission.category}
                  </span>
                  <h2 className="text-sm font-bold text-slate-100 truncate max-w-[200px]">
                    {currentMission.title}
                  </h2>
                </div>

                <button
                  onClick={() => setIsOpenList(!isOpenList)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg transition"
                  title="Voir toutes les missions"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Journal</span>
                </button>
              </div>

              {/* Current Objective Guidance */}
              {activeObj ? (
                <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 mt-2">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 text-amber-400 shrink-0">
                      <Sparkles className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-200">
                        {activeObj.instruction}
                      </div>
                      {activeObj.additionalInfo && (
                        <div className="text-[11px] text-amber-300/80 mt-1 italic">
                          💡 {activeObj.additionalInfo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Objective Step Indicators */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      {currentMission.objectives.map((obj, idx) => (
                        <span key={obj.id} className="flex items-center">
                          {obj.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : idx === currentMission.currentObjectiveIndex ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-400/20" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </span>
                      ))}
                      <span className="ml-1 font-mono text-[10px]">
                        {currentMission.currentObjectiveIndex + 1}/{currentMission.objectives.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Coins className="w-3.5 h-3.5" />
                      <span>+{currentMission.coinReward}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-emerald-400 font-medium py-1">
                  🎉 Mission accomplie avec succès !
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/85 border border-slate-700/50 rounded-2xl p-3 text-white backdrop-blur-md">
              <span className="text-xs text-slate-300">Aucune mission en cours.</span>
              <button
                onClick={() => setIsOpenList(true)}
                className="ml-2 text-xs text-emerald-400 underline font-bold"
              >
                Choisir une mission
              </button>
            </div>
          )}
        </div>

        {/* Right: Coins Balance + Aviary Shop Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Animated Coin Pop Reward if any */}
          {recentReward && (
            <div className="bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full text-xs shadow-lg animate-bounce flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              +{recentReward} Pièces !
            </div>
          )}

          {/* Current Coins Counter */}
          <div className="bg-slate-950/85 border border-amber-400/40 rounded-2xl px-3.5 py-2 text-white shadow-xl backdrop-blur-md flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-inner">
              <Coins className="w-3.5 h-3.5 fill-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-300/80 font-medium leading-none">Pièces</span>
              <span className="text-base font-black text-amber-300 leading-tight font-mono">
                {coins}
              </span>
            </div>
          </div>

          {/* Aviary / Bird Shop Button */}
          <button
            onClick={onOpenAviary}
            className="group bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 transition transform hover:scale-105 active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span className="text-xs hidden sm:inline">Boutique Oiseaux</span>
            <span className="text-xs sm:hidden">Oiseaux</span>
          </button>
        </div>
      </header>

      {/* Mission Log Modal / Drawer */}
      {isOpenList && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Journal des Missions</h3>
                  <p className="text-xs text-slate-400">
                    Accomplis les missions proposées pour remporter des pièces
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenList(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {allMissions.map((m) => {
                const isCurrent = currentMission?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      isCurrent
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
                        : m.completed
                        ? 'bg-slate-800/40 border-slate-800 opacity-80'
                        : m.unlocked
                        ? 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-900/40 border-slate-800/40 opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            m.category === 'didacticiel'
                              ? 'bg-amber-500/20 text-amber-300'
                              : m.category === 'defi'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {m.category}
                        </span>
                        <h4 className="text-sm font-bold text-white">{m.title}</h4>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{m.coinReward}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{m.description}</p>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        {m.objectives.length} étapes
                      </span>

                      {m.completed ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terminé
                        </span>
                      ) : isCurrent ? (
                        <span className="text-amber-400 font-bold text-xs">En cours</span>
                      ) : m.unlocked ? (
                        <button
                          onClick={() => {
                            onSelectMission(m.id);
                            setIsOpenList(false);
                          }}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
                        >
                          Lancer <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">Verrouillé</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
