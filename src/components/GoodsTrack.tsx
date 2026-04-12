import React from 'react';
import { GoodsState } from '../types/game';
import { TreePine, Wheat, Leaf, Drumstick, Coins, ArrowRightLeft, RotateCcw, PawPrint, Mountain, Hammer, Sword } from 'lucide-react';
import { StoneIcon } from './StoneIcon';

interface Props {
  goods: GoodsState;
  onExchange?: (from: keyof GoodsState, to: keyof GoodsState) => void;
  onUndoExchange?: () => void;
  canUndoExchange?: boolean;
  era: 1 | 2;
}

export const GoodsTrack: React.FC<Props> = ({ goods, onExchange, onUndoExchange, canUndoExchange, era }) => {
  const goodIcons = {
    wood: <TreePine className="w-5 h-5 text-amber-700" />,
    stone: <StoneIcon className="w-5 h-5 text-gray-400" />,
    emmer: <Wheat className="w-5 h-5 text-yellow-500" />,
    flax: <Leaf className="w-5 h-5 text-green-500" />,
    food: <Drumstick className="w-5 h-5 text-orange-500" />,
    gold: <Coins className="w-5 h-5 text-yellow-400" />,
    donkey: <PawPrint className="w-5 h-5 text-stone-400" />,
    ore: <Mountain className="w-5 h-5 text-stone-500" />,
    iron: <Hammer className="w-5 h-5 text-blue-300" />,
    weapons: <Sword className="w-5 h-5 text-red-400" />,
  };

  const goodOrder: (keyof GoodsState)[] = era === 1 
    ? ['wood', 'stone', 'emmer', 'flax', 'food', 'gold']
    : ['wood', 'stone', 'emmer', 'flax', 'food', 'gold', 'donkey', 'ore', 'iron', 'weapons'];

  const exchangeable: (keyof GoodsState)[] = era === 1 
    ? ['emmer', 'flax', 'gold']
    : ['emmer', 'flax', 'gold', 'donkey'];

  return (
    <div className="bg-stone-800/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-stone-700 w-32 flex flex-col gap-2">
      <div className="flex flex-col gap-1.5 pr-1">
        {goodOrder.map((good) => (
          <div key={good} className="flex items-center bg-stone-900/80 px-2 py-1.5 rounded-lg border border-stone-700 w-full justify-between group relative">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">{goodIcons[good]}</div>
              <div className="flex flex-col min-w-0">
                <span className="text-stone-500 text-[8px] uppercase tracking-tighter leading-none mb-0.5 truncate">{good}</span>
                <span className="text-white font-mono text-base font-bold leading-none">{goods[good]}</span>
              </div>
            </div>
            
            {onExchange && exchangeable.includes(good) && (
              <button
                onClick={() => onExchange(good, 'food')}
                disabled={goods[good] <= 0}
                className="p-1 bg-stone-800/50 border border-stone-700 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-all text-amber-500/70 hover:text-amber-400 hover:border-amber-500/30 shadow-sm"
                title={`Exchange 1 ${good} for 1 food`}
              >
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {onUndoExchange && (
        <button
          onClick={onUndoExchange}
          disabled={!canUndoExchange}
          title="Undo last conversion"
          className={`flex items-center justify-center py-2 rounded-lg border transition-all shadow-md w-full
            ${canUndoExchange 
              ? 'bg-orange-600/20 border-orange-500 text-orange-400 hover:bg-orange-600/30 active:bg-orange-600/40' 
              : 'bg-stone-800 border-stone-700 text-stone-600 opacity-50 cursor-not-allowed'}
          `}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
