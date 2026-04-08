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
  
  // In Era I, Gold is 1 VP each. In Era II, it's 0.5 VP (but added to Era I score if playing full game).
  // For simplicity and following the rulebook's "Era II score" definition:
  const goldVP = gameState.era === 1 ? gameState.goods.gold : gameState.goods.gold * 0.5;
  
  let bonusVP = 0;
  const bonusDetails: { name: string; vp: number }[] = [];

  if (gameState.era === 2) {
    // Era II specific scoring
    const weaponsVP = gameState.goods.weapons;
    const ironVP = gameState.goods.iron * 0.5;
    
    if (weaponsVP > 0) bonusDetails.push({ name: 'Weapons', vp: weaponsVP });
    if (ironVP > 0) bonusDetails.push({ name: 'Iron', vp: ironVP });
    
    bonusVP = weaponsVP + ironVP;
  }

  furnishedRooms.filter(r => r.color === 'blue').forEach(room => {
    let vp = 0;
    // Blue room bonuses could be added here if any exist in data
    if (vp > 0) {
      bonusVP += vp;
      bonusDetails.push({ name: room.name, vp });
    }
  });

  const totalVP = baseVP + goldVP + bonusVP;

  return { baseVP, goldVP, bonusVP, totalVP, bonusDetails };
}
