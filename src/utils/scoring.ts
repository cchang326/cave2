import { GameState } from '../types/game';

export interface ScoreDetails {
  baseVP: number;
  goldVP: number;
  bonusVP: number;
  totalVP: number;
  bonusDetails: { name: string; vp: number }[];
}

export function calculateScore(gameState: GameState): ScoreDetails {
  const furnishedRooms = gameState.cave
    .filter(space => space.state === 'FURNISHED' && space.tile)
    .map(space => space.tile!);

  const baseVP = furnishedRooms.reduce((sum, room) => sum + room.vp, 0);
  const goldVP = gameState.goods.gold;

  let bonusVP = 0;
  const bonusDetails: { name: string; vp: number }[] = [];

  furnishedRooms.filter(r => r.color === 'blue').forEach(room => {
    let vp = 0;
    // Note: Currently the blue rooms in roomTiles.ts (prospecting_site, retting_room, etc.)
    // have passive effects during the game but no additional end-game VP bonuses described.
    // If bonuses are added to the data, they should be implemented here.
    
    switch (room.id) {
      // Placeholder for future blue room bonuses if added to data
      default:
        break;
    }

    if (vp > 0) {
      bonusVP += vp;
      bonusDetails.push({ name: room.name, vp });
    }
  });

  const totalVP = baseVP + goldVP + bonusVP;

  return { baseVP, goldVP, bonusVP, totalVP, bonusDetails };
}
