import React, { ReactNode } from 'react';
import { RoomTile, GoodsState, CaveSpace } from '../types/game';
import { WallRequirementIcon } from './WallRequirementIcon';
import { IconicDescription } from './IconicDescription';
import { RoomTileComponent } from './RoomTileComponent';
import { TreePine, Wheat, Leaf, Drumstick, Coins, Shield, Lock, LockOpen, ListChecks, Undo2, Layers } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { isValidRoomPlacement } from '../utils/walls';

interface Props {
  tiles: (RoomTile | null)[];
  goods: GoodsState;
  cave: CaveSpace[];
  walls: string[];
  isSelectable?: boolean;
  isDrafting?: boolean;
  selectedRoomId?: string;
  showIconicDescription?: boolean;
  highlightFurnishable: boolean;
  fixTileLocations: boolean;
  isChecklistCollapsed: boolean;
  checklistLength: number;
  fdp1Count: number;
  fdp2Count: number;
  era: 1 | 2;
  onRoomClick?: (id: string) => void;
  onToggleHighlight: () => void;
  onToggleFixTileLocations: () => void;
  onToggleChecklist: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  children?: React.ReactNode;
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

const PileIcon: React.FC<{ era: 1 | 2 }> = ({ era }) => (
  <div className="relative w-4 h-4 flex items-center justify-center">
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
      <Layers className="w-4 h-4 text-stone-500 scale-y-50 origin-bottom opacity-60" />
    </div>
    <span className="relative text-[11px] font-bold font-serif text-stone-400 leading-none select-none z-10 translate-y-[-1px]">
      {era === 1 ? 'I' : 'II'}
    </span>
  </div>
);

export const CentralDisplay: React.FC<Props> = ({ 
  tiles, 
  goods,
  cave,
  walls,
  isSelectable = false, 
  isDrafting = false,
  selectedRoomId, 
  showIconicDescription = true,
  highlightFurnishable,
  fixTileLocations,
  isChecklistCollapsed,
  checklistLength,
  fdp1Count,
  fdp2Count,
  era,
  onRoomClick,
  onToggleHighlight,
  onToggleFixTileLocations,
  onToggleChecklist,
  onUndo,
  canUndo,
  children
}) => {
  const isFurnishable = (tile: RoomTile): boolean => {
    // Rule: You must always have more orange Rooms than blue Rooms.
    if (tile.color === 'blue') {
      const orangeRooms = cave.filter(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE') && s.tile?.color === 'orange').length;
      const blueRooms = cave.filter(s => s.state === 'FURNISHED' && s.tile?.color === 'blue').length;
      
      if (blueRooms + 1 >= orangeRooms) {
        return false;
      }
    }

    if (isDrafting) {
      return cave.some(space => 
        (space.state === 'EMPTY' || space.state === 'CROSSED_PICKAXES') && 
        isValidRoomPlacement(space, walls, tile.wallRequirement)
      );
    }

    // Basic affordance and space checks
    const canAfford = Object.entries(tile.cost).every(([good, amount]) => {
      return (goods[good as keyof GoodsState] || 0) >= (amount as number);
    });

    const hasCompatibleSpace = cave.some(space => 
      (space.state === 'EMPTY' || space.state === 'CROSSED_PICKAXES') && 
      isValidRoomPlacement(space, walls, tile.wallRequirement)
    );

    return canAfford && hasCompatibleSpace;
  };

  return (
    <div className="bg-stone-800 p-4 rounded-xl shadow-lg border border-stone-700 min-h-[32rem] relative flex flex-col">
      {children}
      
      {/* Background Title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-stone-700/20 text-6xl font-black uppercase tracking-[0.2em] text-center px-4">
          Central Display
        </span>
      </div>

      <div className="flex justify-between items-center mb-4 relative z-[110]">
        <div className="w-24 flex items-center justify-start gap-1">
          <button 
            onClick={onToggleChecklist}
            title={isChecklistCollapsed ? "Show Action Checklist" : "Hide Action Checklist"}
            className={`flex items-center p-1 rounded hover:bg-stone-700/50 transition-colors group relative z-[110] ${
              isChecklistCollapsed && checklistLength > 0 ? 'animate-checklist-flash ring-1 ring-orange-500/30' : ''
            }`}
          >
            <ListChecks className={`w-4 h-4 transition-colors ${!isChecklistCollapsed ? 'text-stone-200 group-hover:text-white' : 'text-stone-500/70 group-hover:text-stone-400'}`} />
            {isChecklistCollapsed && checklistLength > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center shadow-sm">
                {checklistLength}
              </span>
            )}
          </button>
          
          {isChecklistCollapsed && canUndo && onUndo && (
            <button
              onClick={onUndo}
              title="Undo Action"
              className="flex items-center p-1 rounded bg-red-900/30 hover:bg-red-800/50 text-red-300 transition-colors group ml-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <div className="flex-1 flex justify-center items-center gap-4">
          <div className="flex items-center gap-1.5" title="Era I Draw Pile">
            <PileIcon era={1} />
            <span className="text-stone-400 font-mono text-sm leading-none tabular-nums font-bold">
              {fdp1Count}
            </span>
          </div>
          {era === 2 && (
            <div className="flex items-center gap-1.5" title="Era II Draw Pile">
              <PileIcon era={2} />
              <span className="text-stone-400 font-mono text-sm leading-none tabular-nums font-bold">
                {fdp2Count}
              </span>
            </div>
          )}
        </div>

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
      <div className="grid grid-cols-4 gap-3 justify-items-center relative z-10">
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
          const shouldBlink = isSelectable && furnishable && !isSelected;

          return (
            <RoomTileComponent
              key={tile.id}
              tile={tile}
              showCost={true}
              showIconicDescription={showIconicDescription}
              isSelected={isSelected}
              isSelectable={isSelectable}
              furnishable={furnishable}
              highlightFurnishable={highlightFurnishable}
              onClick={() => isActuallySelectable && onRoomClick && onRoomClick(tile.id)}
              className={shouldBlink ? 'ring-4 ring-orange-400/50 animate-game-pulse' : ''}
            />
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
