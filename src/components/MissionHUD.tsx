import React from 'react';
import { Mission } from '../types/game';
import { CheckCircle2, Circle, Coins, Sparkles, BookOpen, Trophy, ListChecks } from 'lucide-react';

interface MissionHUDProps {
  currentMission: Mission | null;
  coins: number;
  recentReward: number | null;
  onOpenAviary: () => void;
  onOpenMissionPicker: () => void;
}

export const MissionHUD: React.FC<MissionHUDProps> = ({
  currentMission,
  coins,
  recentReward,
  onOpenAviary,
  onOpenMissionPicker,
}) => {
  const activeObj =
    currentMission && currentMission.objectives[currentMission.currentObjectiveIndex];

  return (
    <header className="fixed top-2 inset-x-2 sm:top-3 sm:inset-x-3 md:inset-x-6 z-30 flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-2 md:gap-3 pointer-events-none">
      {/* Left: Active Mission Card & Objective Guidance */}
      <div className="flex flex-col gap-2 w-full min-w-0 md:max-w-md pointer-events-auto">
        {currentMission ? (
          <div className="bg-slate-950/85 border border-emerald-500/30 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-md text-white">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    currentMission.category === 'didacticiel'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : currentMission.category === 'defi'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {currentMission.category}
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                  {currentMission.title}
                </h2>
              </div>

              <button
                onClick={onOpenMissionPicker}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg transition shrink-0"
                title="Choisir une mission"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Changer</span>
              </button>
            </div>

            {/* Current Objective Guidance */}
            {activeObj ? (
              <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 mt-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 text-amber-400 shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div className="flex-1 min-w-0">
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
                🎉 Mission accomplie ! Choisissez-en une autre.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-950/85 border border-slate-700/50 rounded-2xl p-3 text-white backdrop-blur-md">
            <span className="text-xs text-slate-300">Aucune mission en cours.</span>
            <button
              onClick={onOpenMissionPicker}
              className="ml-2 text-xs text-emerald-400 underline font-bold"
            >
              Choisir une mission
            </button>
          </div>
        )}
      </div>

      {/* Right: Coins Balance + Missions + Aviary Shop */}
      <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end flex-wrap pointer-events-auto">
        {recentReward && (
          <div className="bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full text-xs shadow-lg animate-bounce flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            +{recentReward} Pièces !
          </div>
        )}

        <div className="bg-slate-950/85 border border-amber-400/40 rounded-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-white shadow-xl backdrop-blur-md flex items-center gap-2">
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

        <button
          onClick={onOpenMissionPicker}
          className="group bg-gradient-to-r from-sky-600 to-indigo-500 hover:from-sky-500 hover:to-indigo-400 text-white font-bold px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 transition transform hover:scale-105 active:scale-95"
          title="Choisir une mission, voir les gains et la distance"
        >
          <ListChecks className="w-4 h-4 text-amber-300" />
          <span className="text-xs hidden sm:inline">Missions</span>
        </button>

        <button
          onClick={onOpenAviary}
          className="group bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-3 sm:px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 transition transform hover:scale-105 active:scale-95"
        >
          <Trophy className="w-4 h-4 text-amber-300" />
          <span className="text-xs hidden lg:inline">Boutique Oiseaux</span>
          <span className="text-xs lg:hidden">Oiseaux</span>
        </button>
      </div>
    </header>
  );
};
