import React from 'react';
import { GoodsState } from '../types/game';
import { TreePine, Wheat, Leaf, Drumstick, Coins, ArrowRightLeft, RotateCcw, Hammer, Sword, Cuboid } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { OreIcon } from './OreIcon';
import { DonkeyIcon } from './DonkeyIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface Props {
  goods: GoodsState;
  onExchange?: (from: keyof GoodsState, to: keyof GoodsState) => void;
  onUndoExchange?: () => void;
  canUndoExchange?: boolean;
  era: 1 | 2;
}

export const GoodsTrack: React.FC<Props> = ({ goods, onExchange, onUndoExchange, canUndoExchange, era }) => {
  const iconSize = "w-[18px] h-[18px]";
  const goodIcons = {
    wood: <TreePine className={`${iconSize} text-amber-700`} />,
    stone: <StoneIcon className={`${iconSize} text-gray-400`} />,
    emmer: <Wheat className={`${iconSize} text-yellow-500`} />,
    flax: <Leaf className={`${iconSize} text-green-500`} />,
    food: <Drumstick className={`${iconSize} text-orange-500`} />,
    gold: <Coins className={`${iconSize} text-yellow-400`} />,
    donkey: <DonkeyIcon className={`${iconSize} text-orange-700`} />,
    ore: <OreIcon className={`${iconSize} text-zinc-500`} />,
    iron: <Cuboid className={`${iconSize} text-blue-300`} />,
    weapons: <Sword className={`${iconSize} text-red-400`} />,
  };

  const goodOrder: (keyof GoodsState)[] = era === 1 
    ? ['wood', 'stone', 'emmer', 'flax', 'food', 'gold']
    : ['wood', 'stone', 'emmer', 'flax', 'food', 'gold', 'donkey', 'ore', 'iron', 'weapons'];

  const exchangeable: (keyof GoodsState)[] = era === 1 
    ? ['emmer', 'flax', 'gold']
    : ['emmer', 'flax', 'gold', 'donkey'];

  const renderGoodItem = (good: keyof GoodsState) => (
    <div key={good} className="flex items-center bg-stone-900/80 px-1.5 py-0.5 rounded-md border border-stone-700/50 w-full justify-between group relative h-8">
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">{goodIcons[good]}</div>
            <span className="text-white font-mono text-[20px] font-bold leading-none">{goods[good]}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-stone-900 border-stone-700 text-stone-200 text-xs capitalize">
          {good}
        </TooltipContent>
      </Tooltip>
      
      <div className="flex items-center gap-1">
        {good === 'food' && onUndoExchange && canUndoExchange && (
          <button
            onClick={onUndoExchange}
            title="Undo last conversion"
            className="p-0.5 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600/40 text-orange-400 rounded transition-all shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}

        {onExchange && exchangeable.includes(good) && (
          <button
            onClick={() => onExchange(good, 'food')}
            disabled={goods[good] <= 0}
            className="p-0.5 bg-stone-800/50 border border-stone-700 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-all text-amber-500/70 hover:text-amber-400 hover:border-amber-500/30 shadow-sm"
            title={`Exchange 1 ${good} for 1 food`}
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delay={200}>
      <div className="bg-stone-800/95 backdrop-blur-sm p-1.5 rounded-lg shadow-xl border border-stone-700 w-24 flex flex-col gap-0.5">
        {goodOrder.map(renderGoodItem)}
      </div>
    </TooltipProvider>
  );
};
