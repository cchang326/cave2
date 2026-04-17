import React from 'react';
import { CaveSpace, RoomTile } from '../types/game';
import { Pickaxe, Ban, Drumstick, Shield } from 'lucide-react';
import { OreIcon } from './OreIcon';
import { isValidRoomPlacement } from '../utils/walls';
import { WallRequirementIcon } from './WallRequirementIcon';
import { IconicDescription } from './IconicDescription';
import { RoomTileComponent } from './RoomTileComponent';

interface Props {
  cave: CaveSpace[];
  walls: string[];
  isExcavating: boolean;
  isFurnishing: boolean;
  isRoomAction?: boolean;
  isBuildingWall?: boolean;
  isRemovingWall?: boolean;
  accessibleSpaces: string[];
  selectedRoomTile?: RoomTile;
  activatedRoomsThisTurn?: string[];
  showIconicDescription?: boolean;
  onSpaceClick: (id: string) => void;
  onWallClick?: (wallId: string) => void;
  children?: React.ReactNode;
}

export const CaveBoard: React.FC<Props> = ({ 
  cave, 
  walls,
  isExcavating, 
  isFurnishing, 
  isRoomAction = false, 
  isBuildingWall = false,
  isRemovingWall = false,
  accessibleSpaces, 
  selectedRoomTile,
  activatedRoomsThisTurn = [],
  showIconicDescription = true,
  onSpaceClick,
  onWallClick,
  children
}) => {
  // Group into a dynamic grid for display
  const minRow = Math.min(...cave.map(s => s.row), 0);
  const maxRow = Math.max(...cave.map(s => s.row), 4);
  const minCol = Math.min(...cave.map(s => s.col), 0);
  const maxCol = Math.max(...cave.map(s => s.col), 2);
  
  const rowCount = maxRow - minRow + 1;
  const colCount = maxCol - minCol + 1;

  const grid = Array.from({ length: rowCount }, (_, rIdx) => 
    Array.from({ length: colCount }, (_, cIdx) => {
      const row = rIdx + minRow;
      const col = cIdx + minCol;
      return cave.find(c => c.row === row && c.col === col) || null;
    })
  );

  return (
    <div className="bg-stone-700 p-4 rounded-xl shadow-2xl border-4 border-stone-800 relative min-w-full w-fit flex flex-col">
      <h2 className="text-stone-300 text-[10px] font-bold uppercase tracking-widest mb-4 text-center">Your Cave</h2>
      <div className="flex justify-center items-start">
        <div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: `repeat(${colCount}, 8rem)`,
            gridTemplateRows: `repeat(${rowCount}, 8rem)`
          }}
        >
        {cave.map((space) => {
          const isActivated = activatedRoomsThisTurn.includes(space.id);
          const isExcavatable = isExcavating && space.state === 'FACE_DOWN' && accessibleSpaces.includes(space.id);
          const isFurnishable = isFurnishing && 
            (space.state === 'EMPTY' || space.state === 'CROSSED_PICKAXES') &&
            (!selectedRoomTile || isValidRoomPlacement(space, walls, selectedRoomTile.wallRequirement));
          const isActionable = isRoomAction && (space.state === 'FURNISHED' || space.state === 'ENTRANCE') && space.tile?.trigger === 'action' && !isActivated;
          const isClickable = isExcavatable || isFurnishable || isActionable;

          const rightWallId = `${space.row},${space.col}-${space.row},${space.col + 1}`;
          const bottomWallId = `${space.row},${space.col}-${space.row + 1},${space.col}`;
          
          const gridRow = space.row - minRow;
          const gridCol = space.col - minCol;

          const hasTopNeighbor = space.row > minRow && grid[gridRow - 1][gridCol] !== null;
          const hasBottomNeighbor = space.row < maxRow && grid[gridRow + 1][gridCol] !== null;
          
          const hasLeftNeighbor = space.col > minCol && grid[gridRow][gridCol - 1] !== null;
          const hasRightNeighbor = space.col < maxCol && grid[gridRow][gridCol + 1] !== null;

          const hasRightWall = walls.includes(rightWallId);
          const hasBottomWall = walls.includes(bottomWallId);

          const isTopPerimeter = space.openSides ? !space.openSides.includes('top') : !hasTopNeighbor;
          const isBottomPerimeter = space.openSides ? !space.openSides.includes('bottom') : !hasBottomNeighbor;
          const isLeftPerimeter = space.openSides ? !space.openSides.includes('left') : !hasLeftNeighbor;
          const isRightPerimeter = space.openSides ? !space.openSides.includes('right') : !hasRightNeighbor;

          return (
            <div 
              key={space.id} 
              className="relative w-32 h-32 z-10"
              style={{ gridRow: gridRow + 1, gridColumn: gridCol + 1 }}
            >
              {/* Perimeter Walls */}
              {isTopPerimeter && <div className="absolute -top-2 left-0 right-0 h-2 bg-stone-950 rounded-full shadow-md z-20" />}
              {isBottomPerimeter && <div className="absolute -bottom-2 left-0 right-0 h-2 bg-stone-950 rounded-full shadow-md z-20" />}
              {isLeftPerimeter && <div className="absolute -left-2 top-0 bottom-0 w-2 bg-stone-950 rounded-full shadow-md z-20" />}
              {isRightPerimeter && <div className="absolute -right-2 top-0 bottom-0 w-2 bg-stone-950 rounded-full shadow-md z-20" />}

              <div 
                onClick={() => isClickable && onSpaceClick(space.id)}
                className={`w-full h-full rounded-lg flex flex-col items-center justify-center text-center transition-all relative
                  ${space.state === 'FACE_DOWN' && !isExcavatable ? 'bg-stone-600 border-stone-500 border-2 p-0.5 shadow-inner' : ''}
                  ${space.state === 'FACE_DOWN' && isExcavatable ? 'bg-stone-500 border-orange-400 border-2 p-0.5 shadow-inner cursor-pointer hover:bg-stone-400 ring-4 ring-orange-400/50 animate-game-pulse' : ''}
                  ${space.state === 'ENTRANCE' ? 'justify-start' : ''}
                  ${space.state === 'FURNISHED' ? 'justify-start' : ''}
                  ${space.state === 'CROSSED_PICKAXES' && !isFurnishable ? 'bg-stone-800 border-stone-900 border-2 p-0.5' : ''}
                  ${space.state === 'CROSSED_PICKAXES' && isFurnishable ? 'bg-stone-800/80 border-dashed border-orange-400 border-2 p-0.5 cursor-pointer hover:bg-stone-700 ring-4 ring-orange-400/50 animate-game-pulse' : ''}
                  ${space.state === 'EMPTY' && !isFurnishable ? 'bg-stone-800/50 border-dashed border-stone-600 border-2 p-0.5' : ''}
                  ${space.state === 'EMPTY' && isFurnishable ? 'bg-stone-800/80 border-dashed border-orange-400 border-2 p-0.5 cursor-pointer hover:bg-stone-700 ring-4 ring-orange-400/50 animate-game-pulse' : ''}
                  ${isActionable ? 'ring-4 ring-green-400/50 cursor-pointer hover:scale-105 animate-game-pulse' : ''}
                  ${isActivated ? 'opacity-60 grayscale-[0.5]' : ''}
                `}
              >
                {isActivated && (
                  <div className="absolute bottom-0 left-0 right-0 bg-stone-800/95 border-t border-stone-600 py-0.5 flex items-center justify-center pointer-events-none z-20 rounded-b-lg">
                    <span className="text-stone-400 text-[8px] font-bold uppercase tracking-[0.2em]">Activated</span>
                  </div>
                )}
                {space.state === 'FACE_DOWN' && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Unexcavated</span>
                  </div>
                )}

                {space.state !== 'FACE_DOWN' && (
                  (space.row === 1 && space.col === 1) || 
                  (space.row === 3 && space.col === 1) ||
                  (space.row === 2 && space.col === -1)
                ) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
                    <div className="flex items-center gap-1">
                      <span className="text-orange-400 text-2xl font-black">+1</span>
                      <Drumstick className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                )}

                {space.state !== 'FACE_DOWN' && (space.row === 2 && space.col === -2) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-2xl font-black">+1</span>
                      <OreIcon className="w-5 h-5 text-zinc-500" />
                    </div>
                  </div>
                )}
                
                {space.state === 'CROSSED_PICKAXES' && (
                  <div className="relative flex items-center justify-center">
                    {(space.row === 2 && space.col === 0) ? (
                      <div className="relative flex items-center justify-center">
                        <Pickaxe className="w-10 h-10 text-stone-600 opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Ban className="w-12 h-12 text-stone-500/40" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex text-stone-600 opacity-50">
                        <Pickaxe className="w-10 h-10 -mr-4 transform rotate-45" />
                        <Pickaxe className="w-10 h-10 transform -rotate-45" style={{ transform: 'scaleX(-1) rotate(45deg)' }} />
                      </div>
                    )}
                  </div>
                )}
                
                {space.state === 'ENTRANCE' && space.tile && (
                  <RoomTileComponent
                    tile={space.tile}
                    showIconicDescription={showIconicDescription}
                    isActivated={isActivated}
                    className={`absolute inset-0 w-full h-full ${isActionable ? 'ring-4 ring-green-400/50 animate-game-pulse' : ''}`}
                  />
                )}
                
                {space.state === 'FURNISHED' && space.tile && (
                  <RoomTileComponent
                    tile={space.tile}
                    showIconicDescription={showIconicDescription}
                    isActivated={isActivated}
                    className={`absolute inset-0 w-full h-full ${isActionable ? 'ring-4 ring-green-400/50 animate-game-pulse' : ''}`}
                  />
                )}
              </div>

              {/* Right Wall */}
              {!isRightPerimeter && rightWallId !== '3,-1-3,0' && (
                <div 
                  onClick={() => {
                    if (isBuildingWall && !hasRightWall) onWallClick?.(rightWallId);
                    if (isRemovingWall && hasRightWall) onWallClick?.(rightWallId);
                  }}
                  className={`absolute -right-2 top-0 bottom-0 w-2 z-20 rounded-full transition-all
                    ${hasRightWall && !isRemovingWall ? 'bg-stone-950 shadow-md' : ''}
                    ${hasRightWall && isRemovingWall ? 'bg-stone-950 shadow-md hover:bg-red-500 cursor-pointer animate-game-pulse' : ''}
                    ${!hasRightWall && isBuildingWall ? 'bg-orange-400/30 hover:bg-orange-400/60 cursor-pointer animate-game-pulse' : ''}
                    ${!hasRightWall && !isBuildingWall ? 'hidden' : ''}
                  `}
                />
              )}

              {/* Bottom Wall */}
              {!isBottomPerimeter && bottomWallId !== '3,-1-4,-1' && (
                <div 
                  onClick={() => {
                    if (isBuildingWall && !hasBottomWall) onWallClick?.(bottomWallId);
                    if (isRemovingWall && hasBottomWall) onWallClick?.(bottomWallId);
                  }}
                  className={`absolute -bottom-2 left-0 right-0 h-2 z-20 rounded-full transition-all
                    ${hasBottomWall && !isRemovingWall ? 'bg-stone-950 shadow-md' : ''}
                    ${hasBottomWall && isRemovingWall ? 'bg-stone-950 shadow-md hover:bg-red-500 cursor-pointer animate-game-pulse' : ''}
                    ${!hasBottomWall && isBuildingWall ? 'bg-orange-400/30 hover:bg-orange-400/60 cursor-pointer animate-game-pulse' : ''}
                    ${!hasBottomWall && !isBuildingWall ? 'hidden' : ''}
                  `}
                />
              )}
            </div>
          );
        })}
        {children && (
          <div 
            className="z-20 ml-6 pointer-events-none"
            style={{ 
              gridColumn: 3 - minCol, 
              gridRow: `1 / 4` 
            }}
          >
            <div className="pointer-events-auto">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
