import React from 'react';
import { GoodsState } from '../types/game';
import { TreePine, Wheat, Leaf, Drumstick, Coins, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { StoneIcon } from './StoneIcon';

interface Props {
  goods: GoodsState;
  onExchange?: (from: keyof GoodsState, to: keyof GoodsState) => void;
  onUndoExchange?: () => void;
  canUndoExchange?: boolean;
}

export const GoodsTrack: React.FC<Props> = ({ goods, onExchange, onUndoExchange, canUndoExchange }) => {
  const goodIcons = {
    wood: <TreePine className="w-5 h-5 text-amber-700" />,
    stone: <StoneIcon className="w-5 h-5 text-gray-400" />,
    emmer: <Wheat className="w-5 h-5 text-yellow-500" />,
    flax: <Leaf className="w-5 h-5 text-green-500" />,
    food: <Drumstick className="w-5 h-5 text-orange-500" />,
    gold: <Coins className="w-5 h-5 text-yellow-400" />,
  };

  const goodOrder: (keyof GoodsState)[] = ['wood', 'stone', 'emmer', 'flax', 'food', 'gold'];
  const exchangeable: (keyof GoodsState)[] = ['emmer', 'flax', 'gold'];

  return (
    <div className="bg-stone-800/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-stone-700 w-full">
      <div className="flex items-center gap-4 overflow-x-auto">
        <div className="flex gap-2 flex-1">
          {goodOrder.map((good) => (
            <div key={good} className="flex items-center bg-stone-900/80 px-3 py-2 rounded-lg border border-stone-700 min-w-[100px] justify-between group relative">
              <div className="flex items-center gap-2">
                {goodIcons[good]}
                <div className="flex flex-col">
                  <span className="text-stone-500 text-[9px] uppercase tracking-tighter leading-none mb-0.5">{good}</span>
                  <span className="text-white font-mono text-lg font-bold leading-none">{goods[good]}</span>
                </div>
              </div>
              
              {onExchange && exchangeable.includes(good) && (
                <button
                  onClick={() => onExchange(good, 'food')}
                  disabled={goods[good] <= 0}
                  className="ml-2 p-1.5 bg-stone-800/50 border border-stone-700 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-all text-amber-500/70 hover:text-amber-400 hover:border-amber-500/30 shadow-sm"
                  title={`Exchange 1 ${good} for 1 food`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
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
            className={`flex items-center justify-center p-2 rounded-lg border transition-all shadow-md flex-shrink-0
              ${canUndoExchange 
                ? 'bg-orange-600/20 border-orange-500 text-orange-400 hover:bg-orange-600/30 active:bg-orange-600/40' 
                : 'bg-stone-800 border-stone-700 text-stone-600 opacity-50 cursor-not-allowed'}
            `}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
