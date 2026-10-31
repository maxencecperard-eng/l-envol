import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BirdDef } from '../types/game';
import { sounds } from '../audio/soundManager';
import { BirdPreview3D } from './BirdPreview3D';
import {
  Coins,
  Zap,
  Wind,
  Compass,
  ShieldAlert,
  Check,
  ShoppingBag,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface BirdShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  birds: BirdDef[];
  activeBirdId: string;
  coins: number;
  onSelectBird: (birdId: string) => void;
  onBuyBird: (birdId: string) => boolean;
}

export const BirdShopModal: React.FC<BirdShopModalProps> = ({
  isOpen,
  onClose,
  birds,
  activeBirdId,
  coins,
  onSelectBird,
  onBuyBird,
}) => {
  const [previewBirdId, setPreviewBirdId] = useState(activeBirdId);

  // Always showcase the bird currently in flight when the shop opens
  useEffect(() => {
    if (isOpen) setPreviewBirdId(activeBirdId);
  }, [isOpen, activeBirdId]);

  if (!isOpen) return null;

  const previewIndex = Math.max(
    0,
    birds.findIndex((b) => b.id === previewBirdId)
  );
  const previewBird = birds[previewIndex] ?? birds[0];
  const equipped = previewBird.id === activeBirdId;

  const cyclePreview = (direction: number) => {
    const nextIndex = (previewIndex + direction + birds.length) % birds.length;
    setPreviewBirdId(birds[nextIndex].id);
  };

  const handleBuy = (bird: BirdDef) => {
    if (coins < bird.price) return;
    const success = onBuyBird(bird.id);
    if (success) {
      setPreviewBirdId(bird.id);
      sounds.playBuy();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ecc94b', '#f6ad55', '#48bb78', '#38bdf8'],
        });
      } catch {
        // ignore
      }
    }
  };

  const StatBar = ({
    icon,
    label,
    value,
    max,
    gradient,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    max: number;
    gradient: string;
  }) => (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-slate-400 flex items-center gap-1">
          {icon} {label}
        </span>
        <span className="font-mono text-white font-bold">{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 select-none animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white truncate">
                Volière & Boutique d'Oiseaux
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {birds.length} espèces — aperçu 3D en direct, cliquez pour comparer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-800/90 border border-amber-400/40 rounded-2xl px-3 py-1.5 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-mono font-black text-amber-300 text-sm">{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition"
              title="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,400px)_1fr] overflow-y-auto md:overflow-hidden">
          {/* 3D showcase */}
          <div className="border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-2.5 md:overflow-y-auto">
            <div className="relative">
              <BirdPreview3D
                bird={previewBird}
                className="w-full h-[150px] sm:h-[240px] rounded-2xl overflow-hidden bg-gradient-to-b from-sky-950/60 via-slate-900 to-slate-950 border border-slate-800"
              />

              <button
                onClick={() => cyclePreview(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center transition"
                title="Oiseau précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => cyclePreview(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center transition"
                title="Oiseau suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="absolute top-2 left-3 flex items-center gap-1 text-[10px] font-mono text-sky-300/90 bg-slate-950/60 px-2 py-0.5 rounded-full border border-sky-500/20">
                <Sparkles className="w-3 h-3" />
                Aperçu 3D {previewIndex + 1}/{birds.length}
              </div>

              {equipped && (
                <span className="absolute top-2 right-3 bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Équipé
                </span>
              )}
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-slate-400 italic">
                  {previewBird.species}
                </span>
                <h3 className="text-lg font-black text-white leading-tight">{previewBird.name}</h3>
              </div>
              {previewBird.unlocked ? (
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  Possédé
                </span>
              ) : (
                <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <Coins className="w-3 h-3" /> {previewBird.price}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {previewBird.description}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-sky-400" /> Envergure
              </span>
              <span className="font-mono text-white font-bold">
                {previewBird.wingspan.toFixed(1)} m
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Pointe
              </span>
              <span className="font-mono text-white font-bold">
                {Math.round(previewBird.maxSpeed * 3.6)} km/h
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <StatBar
                icon={<Zap className="w-3 h-3 text-amber-400" />}
                label="Vitesse de pointe"
                value={previewBird.speedStat}
                max={12}
                gradient="from-amber-500 to-amber-300"
              />
              <StatBar
                icon={<Compass className="w-3 h-3 text-emerald-400" />}
                label="Maniabilité virages"
                value={previewBird.agilityStat}
                max={12}
                gradient="from-emerald-500 to-emerald-300"
              />
              <StatBar
                icon={<ArrowUpRight className="w-3 h-3 text-cyan-400 rotate-90" />}
                label="Piqué supersonique"
                value={previewBird.diveStat}
                max={11}
                gradient="from-cyan-500 to-cyan-300"
              />
              <StatBar
                icon={<Wind className="w-3 h-3 text-sky-400" />}
                label="Glisse / portance"
                value={previewBird.glideStat}
                max={12}
                gradient="from-sky-500 to-sky-300"
              />
            </div>

            {/* Primary action */}
            <div className="sticky bottom-0 z-10 mt-auto pt-2 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
              {equipped ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-bold text-center border border-emerald-500/30">
                  En vol actuellement
                </div>
              ) : previewBird.unlocked ? (
                <button
                  onClick={() => onSelectBird(previewBird.id)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-black transition flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" /> Prendre son envol
                </button>
              ) : coins >= previewBird.price ? (
                <button
                  onClick={() => handleBuy(previewBird)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-sm font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Coins className="w-4 h-4 fill-slate-950" /> Acheter ({previewBird.price}{' '}
                  pièces)
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-slate-800/60 text-slate-400 text-xs font-medium text-center flex items-center justify-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Il vous manque{' '}
                  {previewBird.price - coins} pièces
                </div>
              )}
            </div>
          </div>

          {/* All species */}
          <div className="p-2.5 sm:p-4 md:overflow-y-auto">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Toutes les espèces
              </h3>
              <span className="text-[10px] text-slate-500">
                {birds.filter((b) => b.unlocked).length}/{birds.length} débloquées
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {birds.map((bird) => {
                const isEquipped = activeBirdId === bird.id;
                const isPreviewed = previewBird.id === bird.id;
                const canAfford = coins >= bird.price;

                return (
                  <button
                    key={bird.id}
                    onClick={() => setPreviewBirdId(bird.id)}
                    className={`text-left rounded-2xl border p-2.5 transition-all duration-200 flex flex-col ${
                      isPreviewed
                        ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                        : bird.unlocked
                        ? 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 border border-white/10 flex items-center justify-center"
                        style={{
                          background: `radial-gradient(circle at 30% 25%, ${bird.secondaryColor}, ${bird.color} 65%, #020617)`,
                        }}
                      >
                        <Wind className="w-4 h-4 text-white/90" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{bird.name}</h4>
                          {isEquipped && (
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3] shrink-0" />
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 italic truncate block">
                          {bird.species}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        {Math.round(bird.maxSpeed * 3.6)} km/h
                      </span>

                      {isEquipped ? (
                        <span className="text-emerald-400 font-bold">Équipé</span>
                      ) : bird.unlocked ? (
                        <span className="text-slate-300 font-bold">Possédé</span>
                      ) : (
                        <span
                          className={`font-black flex items-center gap-0.5 ${
                            canAfford ? 'text-amber-300' : 'text-slate-500'
                          }`}
                        >
                          <Coins className="w-3 h-3" /> {bird.price}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
