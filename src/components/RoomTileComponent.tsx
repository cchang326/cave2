import React, { ReactNode } from 'react';
import { RoomTile } from '../types/game';
import { WallRequirementIcon } from './WallRequirementIcon';
import { IconicDescription } from './IconicDescription';
import { Shield, TreePine, Wheat, Leaf, Drumstick, Coins, Sword, Cuboid } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { OreIcon } from './OreIcon';
import { DonkeyIcon } from './DonkeyIcon';

interface Props {
  tile: RoomTile;
  showCost?: boolean;
  showIconicDescription?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  furnishable?: boolean;
  onClick?: () => void;
  className?: string;
  isActivated?: boolean;
  highlightFurnishable?: boolean;
}

const renderCost = (cost: RoomTile['cost']): ReactNode => {
  const parts: ReactNode[] = [];
  const iconClass = "w-3 h-3 inline-block ml-0.5";
  
  if (cost.wood) {
    parts.push(
      <span key="wood" className="flex items-center">
        {cost.wood}<TreePine className={`${iconClass} text-amber-900`} />
      </span>
    );
  }
  if (cost.stone) {
    parts.push(
      <span key="stone" className="flex items-center">
        {cost.stone}<StoneIcon className={`${iconClass} text-stone-600`} />
      </span>
    );
  }
  if (cost.emmer) {
    parts.push(
      <span key="emmer" className="flex items-center">
        {cost.emmer}<Wheat className={`${iconClass} text-yellow-800`} />
      </span>
    );
  }
  if (cost.flax) {
    parts.push(
      <span key="flax" className="flex items-center">
        {cost.flax}<Leaf className={`${iconClass} text-green-800`} />
      </span>
    );
  }
  if (cost.food) {
    parts.push(
      <span key="food" className="flex items-center">
        {cost.food}<Drumstick className={`${iconClass} text-orange-800`} />
      </span>
    );
  }
  if (cost.gold) {
    parts.push(
      <span key="gold" className="flex items-center">
        {cost.gold}<Coins className={`${iconClass} text-amber-600`} />
      </span>
    );
  }
  if (cost.donkey) {
    parts.push(
      <span key="donkey" className="flex items-center">
        {cost.donkey}<DonkeyIcon className={`${iconClass} text-orange-950`} />
      </span>
    );
  }
  if (cost.ore) {
    parts.push(
      <span key="ore" className="flex items-center">
        {cost.ore}<OreIcon className={`${iconClass} text-zinc-950`} />
      </span>
    );
  }
  if (cost.iron) {
    parts.push(
      <span key="iron" className="flex items-center">
        {cost.iron}<Cuboid className={`${iconClass} text-blue-800`} />
      </span>
    );
  }
  if (cost.weapons) {
    parts.push(
      <span key="weapons" className="flex items-center">
        {cost.weapons}<Sword className={`${iconClass} text-red-400`} />
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5">
      {parts}
    </div>
  );
};

export const RoomTileComponent: React.FC<Props> = ({ 
  tile, 
  showCost = false, 
  showIconicDescription = true,
  isSelected = false,
  isSelectable = false,
  furnishable = true,
  onClick,
  className = "",
  isActivated = false,
  highlightFurnishable = false
}) => {
  const shouldDarken = ((isSelectable || highlightFurnishable) && !furnishable) || isActivated;
  
  return (
    <div 
      onClick={onClick}
      title={tile.effectDescription}
      className={`w-32 h-32 rounded-lg p-0.5 border-2 flex flex-col items-center justify-start text-center relative shadow-md transition-all
        ${tile.color === 'orange' ? 'bg-orange-100 border-orange-400' : 'bg-blue-100 border-blue-400'}
        ${isSelectable && furnishable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${isSelected ? 'ring-8 ring-stone-100/30 border-stone-400 scale-110 z-10' : ''}
        ${shouldDarken ? 'opacity-40 grayscale-[0.5] brightness-50' : ''}
        ${className}
      `}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-lg z-20 animate-bounce">
          Selected
        </div>
      )}
      
      {/* Header */}
      <div className={`relative w-full py-1.5 px-1 rounded-t-md flex items-center justify-start -mt-0.5 -mx-0.5 ${tile.color === 'orange' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
        <span className={`${['Furniture Workshop', 'Prospecting Site', 'Equipment Room', 'Wood Storeroom'].includes(tile.name) ? 'text-[9.5px]' : 'text-[11px]'} font-bold leading-tight truncate pl-1 pr-6`}>
          {tile.name}
        </span>
        <div className="absolute right-1 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white/40 fill-amber-400" />
          <span className="absolute text-stone-900 text-[9px] font-bold pb-0.5">{tile.vp}</span>
        </div>
      </div>

      {/* Info Bar (Cost + Wall Req) */}
      <div className="flex items-center justify-center gap-1.5 w-full bg-stone-300/80 py-1 px-1 border-b border-stone-400/30">
        {showCost && Object.keys(tile.cost).length > 0 && (
          <div className="text-[10px] font-bold text-stone-900 flex items-center gap-1">
            <span className="text-[8px] uppercase tracking-tighter opacity-80">Cost:</span>
            {renderCost(tile.cost)}
          </div>
        )}
        <WallRequirementIcon req={tile.wallRequirement} className="w-4 h-4" />
      </div>

      {/* Description */}
      <div className="flex-1 w-full flex flex-col justify-center items-center pb-1">
        {showIconicDescription && tile.iconicDescription ? (
          <IconicDescription description={tile.iconicDescription} className="justify-center" />
        ) : (
          <div className="text-[10px] text-stone-900 leading-tight line-clamp-3 text-center px-1">{tile.effectDescription}</div>
        )}
      </div>

      {isActivated && (
        <div className="absolute bottom-0 left-0 right-0 bg-stone-800/95 border-t border-stone-600 py-0.5 flex items-center justify-center pointer-events-none z-20 rounded-b-lg">
          <span className="text-stone-400 text-[8px] font-bold uppercase tracking-[0.2em]">Activated</span>
        </div>
      )}
    </div>
  );
};
