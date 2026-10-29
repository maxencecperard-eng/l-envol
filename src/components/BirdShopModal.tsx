import React from 'react';
import confetti from 'canvas-confetti';
import { BirdDef } from '../types/game';
import { sounds } from '../audio/soundManager';
import { Coins, Zap, Wind, Compass, ShieldAlert, Check, ShoppingBag, ArrowUpRight } from 'lucide-react';

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
  if (!isOpen) return null;

  const handleBuy = (bird: BirdDef) => {
    if (coins < bird.price) return;
    const success = onBuyBird(bird.id);
    if (success) {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Volière & Boutique d'Oiseaux</h2>
              <p className="text-xs text-slate-400">
                Débloquez des espèces plus puissantes, véloces et aérodynamiques
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/90 border border-amber-400/40 rounded-2xl px-3.5 py-1.5 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-mono font-black text-amber-300 text-sm">{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Birds Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
          {birds.map((bird) => {
            const isEquipped = activeBirdId === bird.id;
            const canAfford = coins >= bird.price;

            return (
              <div
                key={bird.id}
                className={`relative rounded-3xl p-4 border flex flex-col justify-between transition-all duration-200 ${
                  isEquipped
                    ? 'bg-gradient-to-b from-emerald-950/50 to-slate-900 border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
                    : bird.unlocked
                    ? 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-90'
                }`}
              >
                <div>
                  {/* Top Bar with Species and Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 italic">
                        {bird.species}
                      </span>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        {bird.name}
                      </h3>
                    </div>

                    {isEquipped ? (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Équipé
                      </span>
                    ) : bird.unlocked ? (
                      <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Possédé
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {bird.price}
                      </span>
                    )}
                  </div>

                  {/* Bird Visual Silhouette Swatch */}
                  <div
                    className="h-20 rounded-2xl flex items-center justify-center relative overflow-hidden my-3 border border-white/10"
                    style={{
                      background: `radial-gradient(circle, ${bird.secondaryColor}33 0%, ${bird.color}44 70%, #090d16 100%)`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform transition group-hover:scale-110"
                      style={{
                        backgroundColor: bird.color,
                        border: `2px solid ${bird.accentColor}`,
                      }}
                    >
                      <Wind className="w-5 h-5 text-white" />
                    </div>

                    {/* Speed indicator pill inside card */}
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{Math.round(bird.maxSpeed * 3.6)} km/h</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-2">
                    {bird.description}
                  </p>

                  {/* Stats Bars */}
                  <div className="space-y-1.5 text-xs mb-4">
                    {/* Speed */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" /> Vitesse de pointe
                        </span>
                        <span className="font-mono text-white font-bold">{bird.speedStat}/10</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                          style={{ width: `${(bird.speedStat / 12) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Agility */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-emerald-400" /> Maniabilité virages
                        </span>
                        <span className="font-mono text-white font-bold">{bird.agilityStat}/10</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full transition-all duration-300"
                          style={{ width: `${(bird.agilityStat / 10) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Dive */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-400 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-cyan-400 transform rotate-90" />{' '}
                          Piqué supersonique
                        </span>
                        <span className="font-mono text-white font-bold">{bird.diveStat}/10</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-300"
                          style={{ width: `${(bird.diveStat / 11) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 border-t border-slate-800">
                  {isEquipped ? (
                    <div className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold text-center border border-emerald-500/30">
                      En vol actuellement
                    </div>
                  ) : bird.unlocked ? (
                    <button
                      onClick={() => onSelectBird(bird.id)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      Prendre son envol
                    </button>
                  ) : canAfford ? (
                    <button
                      onClick={() => handleBuy(bird)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <Coins className="w-3.5 h-3.5 fill-slate-950" /> Acheter ({bird.price} pièces)
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-slate-800/40 text-slate-500 text-xs font-medium text-center flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Il vous manque {bird.price - coins}{' '}
                      pièces
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
