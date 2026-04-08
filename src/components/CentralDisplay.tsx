import React, { ReactNode } from 'react';
import { RoomTile, GoodsState, CaveSpace } from '../types/game';
import { WallRequirementIcon } from './WallRequirementIcon';
import { IconicDescription } from './IconicDescription';
import { TreePine, Wheat, Leaf, Drumstick, Coins, Shield, Lock, LockOpen } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { isValidRoomPlacement } from '../utils/walls';

interface Props {
  tiles: (RoomTile | null)[];
  goods: GoodsState;
  cave: CaveSpace[];
  walls: string[];
  isSelectable?: boolean;
  selectedRoomId?: string;
  showIconicDescription?: boolean;
  highlightFurnishable: boolean;
  fixTileLocations: boolean;
  onRoomClick?: (id: string) => void;
  onToggleHighlight: () => void;
  onToggleFixTileLocations: () => void;
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
  
  return (
    <div className="flex items-center gap-2">
      {parts}
    </div>
  );
};

export const CentralDisplay: React.FC<Props> = ({ 
  tiles, 
  goods,
  cave,
  walls,
  isSelectable = false, 
  selectedRoomId, 
  showIconicDescription = true,
  highlightFurnishable,
  fixTileLocations,
  onRoomClick,
  onToggleHighlight,
  onToggleFixTileLocations
}) => {
  const canAfford = (tile: RoomTile): boolean => {
    return Object.entries(tile.cost).every(([good, amount]) => {
      return (goods[good as keyof GoodsState] || 0) >= (amount as number);
    });
  };

  const hasCompatibleSpace = (tile: RoomTile): boolean => {
    return cave.some(space => 
      (space.state === 'EMPTY' || space.state === 'CROSSED_PICKAXES') && 
      isValidRoomPlacement(space, walls, tile.wallRequirement)
    );
  };

  const isFurnishable = (tile: RoomTile): boolean => {
    // Basic affordance and space checks
    if (!canAfford(tile) || !hasCompatibleSpace(tile)) return false;

    // Rule: You must always have more orange Rooms than blue Rooms.
    // You may not build a blue Room if you would have an equal number of orange and blue Rooms.
    if (tile.color === 'blue') {
      const orangeRooms = cave.filter(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE') && s.tile?.color === 'orange').length;
      const blueRooms = cave.filter(s => s.state === 'FURNISHED' && s.tile?.color === 'blue').length;
      
      if (blueRooms + 1 >= orangeRooms) {
        return false;
      }
    }

    return true;
  };

  return (
    <div className="bg-stone-800 p-4 rounded-xl shadow-lg border border-stone-700 min-h-full relative">
      <div className="flex justify-between items-center mb-4">
        <div className="w-24" /> {/* Spacer */}
        <h2 className="text-stone-300 text-[10px] font-bold uppercase tracking-widest text-center">Central Display</h2>
        <div className="w-24 flex items-center justify-end gap-1">
          <button 
            onClick={onToggleFixTileLocations}
            title="Lock tile locations"
            className="flex items-center p-1 rounded hover:bg-stone-700/50 transition-colors group"
          >
            {fixTileLocations ? (
              <Lock className="w-3.5 h-3.5 text-stone-200 group-hover:text-white" />
            ) : (
              <LockOpen className="w-3.5 h-3.5 text-stone-500/70 group-hover:text-stone-400" />
            )}
          </button>
          <button 
            onClick={onToggleHighlight}
            title="Highlight furnishable rooms"
            className="flex items-center p-1 rounded hover:bg-stone-700/50 transition-colors group"
          >
            <div className="grid grid-cols-2 gap-[1.5px] w-3.5 h-3.5">
              <div className={`rounded-[1px] transition-colors ${highlightFurnishable ? 'bg-stone-200 shadow-[0_0_4px_rgba(231,229,228,0.4)]' : 'bg-stone-600 group-hover:bg-stone-500'}`} />
              <div className={`rounded-[1px] transition-colors ${highlightFurnishable ? 'bg-stone-200/20' : 'bg-stone-600 group-hover:bg-stone-500'}`} />
              <div className={`rounded-[1px] transition-colors ${highlightFurnishable ? 'bg-stone-200/20' : 'bg-stone-600 group-hover:bg-stone-500'}`} />
              <div className={`rounded-[1px] transition-colors ${highlightFurnishable ? 'bg-stone-200 shadow-[0_0_4px_rgba(231,229,228,0.4)]' : 'bg-stone-600 group-hover:bg-stone-500'}`} />
            </div>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 justify-items-center">
        {tiles.map((tile, index) => {
          if (!tile) {
            return (
              <div 
                key={`empty-${index}`}
                className="w-32 h-32 rounded-lg border-2 border-dashed border-stone-700/50 flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-stone-700/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-700/40" />
                </div>
              </div>
            );
          }

          const isSelected = selectedRoomId === tile.id;
          const furnishable = isFurnishable(tile);
          const isActuallySelectable = isSelectable && furnishable;
          const shouldDarken = (highlightFurnishable || isSelectable) && !furnishable;
          const shouldBlink = isActuallySelectable;

          return (
            <div 
              key={tile.id} 
              onClick={() => isActuallySelectable && onRoomClick && onRoomClick(tile.id)}
              title={tile.effectDescription}
              className={`w-32 h-32 rounded-lg p-0.5 border-2 flex flex-col items-center justify-start text-center relative shadow-md transition-all
                ${tile.color === 'orange' ? 'bg-orange-100 border-orange-400' : 'bg-blue-100 border-blue-400'}
                ${isActuallySelectable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                ${shouldBlink ? 'ring-4 ring-stone-200/40 animate-pulse' : ''}
                ${isSelected ? 'ring-8 ring-stone-100/30 border-stone-400 scale-110 z-10' : ''}
                ${shouldDarken ? 'opacity-40 grayscale-[0.5] brightness-50' : ''}
              `}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-lg z-20 animate-bounce">
                  Selected
                </div>
              )}
              <div className={`relative w-full py-1.5 px-1 rounded-t-md flex items-center justify-start -mt-0.5 -mx-0.5 ${tile.color === 'orange' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                <span className={`${['Furniture Workshop', 'Prospecting Site', 'Equipment Room', 'Wood Storeroom'].includes(tile.name) ? 'text-[9.5px]' : 'text-[11px]'} font-bold leading-tight truncate pl-1 pr-6`}>
                  {tile.name}
                </span>
                <div className="absolute right-1 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white/40 fill-amber-400" />
                  <span className="absolute text-stone-900 text-[9px] font-bold pb-0.5">{tile.vp}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 w-full bg-stone-300/80 py-0.5 px-1 border-b border-stone-400/30">
                {Object.keys(tile.cost).length > 0 && (
                  <div className="text-[10px] font-bold text-stone-900 flex items-center gap-1">
                    <span className="text-[8px] uppercase tracking-tighter opacity-80">Cost:</span>
                    {renderCost(tile.cost)}
                  </div>
                )}
                <WallRequirementIcon req={tile.wallRequirement} className="w-4 h-4" />
              </div>
              <div className="flex-1 w-full flex flex-col justify-center items-center pb-1">
                {showIconicDescription && tile.iconicDescription ? (
                  <IconicDescription description={tile.iconicDescription} className="justify-center" />
                ) : (
                  <div className="text-[10px] text-stone-900 leading-tight line-clamp-3 text-center px-1">{tile.effectDescription}</div>
                )}
              </div>
            </div>
          );
        })}
        {tiles.length === 0 && (
          <div className="text-stone-500 text-sm italic w-full text-center py-12 border-2 border-dashed border-stone-700 rounded-lg">
            No rooms excavated yet.
          </div>
        )}
      </div>
    </div>
  );
};
