import { CaveSpace, WallRequirement } from '../types/game';

export function getSpaceWalls(space: CaveSpace, internalWalls: string[]) {
  const { row, col, openSides } = space;
  
  let top = internalWalls.includes(`${row - 1},${col}-${row},${col}`);
  let bottom = internalWalls.includes(`${row},${col}-${row + 1},${col}`);
  let left = internalWalls.includes(`${row},${col - 1}-${row},${col}`);
  let right = internalWalls.includes(`${row},${col}-${row},${col + 1}`);

  if (openSides) {
    // If openSides is defined, use it to determine perimeter walls
    if (!openSides.includes('top')) top = true;
    if (!openSides.includes('bottom')) bottom = true;
    if (!openSides.includes('left')) left = true;
    if (!openSides.includes('right')) right = true;
  } else {
    // Fallback for original Era I board without openSides
    if (row === 0) top = true;
    if (row === 4 && col === 2) top = true; 
    if (row === 4) bottom = true; // Bottom of board
    if (col === 0 && row !== 3) left = true;
    if (col === 1 && row !== 4) right = true;
    if (col === 2 && row === 4) right = true;
  }

  return { top, right, bottom, left };
}

export function isValidRoomPlacement(space: CaveSpace, internalWalls: string[], req?: WallRequirement): boolean {
  if (!req) return true;

  const walls = getSpaceWalls(space, internalWalls);
  const count = (walls.top ? 1 : 0) + (walls.right ? 1 : 0) + (walls.bottom ? 1 : 0) + (walls.left ? 1 : 0);

  // The room requires between `req.min` and `req.max` walls.
  if (count < req.min) return false;
  if (count > req.max) return false;

  // If the tile requires exactly 2 walls and the space has exactly 2 walls,
  // we must ensure the space's walls match the required configuration.
  // (If the space has 3 or 4 walls, it automatically satisfies any 2-wall configuration).
  if (req.min === 2 && count === 2) {
    if (req.configuration === 'adjacent') {
      const isAdjacent = (walls.top && walls.right) || (walls.right && walls.bottom) || (walls.bottom && walls.left) || (walls.left && walls.top);
      if (!isAdjacent) return false;
    }

    if (req.configuration === 'opposing') {
      const isOpposing = (walls.top && walls.bottom) || (walls.left && walls.right);
      if (!isOpposing) return false;
    }
  }

  return true;
}
