import { GameState } from '../types/game';

export interface ScoreDetails {
  baseVP: number;
  goldVP: number;
  bonusVP: number;
  totalVP: number;
  era1Score: number;
  era1RoomVP: number;
  era1GoldVP: number;
  era2Score: number;
  era2RoomVP: number;
  era2WeaponVP: number;
  era2GoldVP: number;
  era2IronVP: number;
  bonusDetails: { name: string; vp: number }[];
}

export function calculateScore(gameState: GameState): ScoreDetails {
  const furnishedRooms = gameState.cave
    .filter(space => space.state === 'FURNISHED' && space.tile)
    .map(space => space.tile!);

  const baseVP = furnishedRooms.reduce((sum, room) => sum + room.vp, 0);
  
  if (gameState.era === 1) {
    const goldVP = gameState.goods.gold;
    const totalVP = baseVP + goldVP;
    return { 
      baseVP, 
      goldVP, 
      bonusVP: 0, 
      totalVP, 
      era1Score: totalVP,
      era1RoomVP: baseVP,
      era1GoldVP: goldVP,
      era2Score: 0,
      era2RoomVP: 0,
      era2WeaponVP: 0,
      era2GoldVP: 0,
      era2IronVP: 0,
      bonusDetails: [] 
    };
  }

  // Era II Scoring
  // Era II score = Room VP + 1 VP per Weapon + 0.5 VP per Iron + 0.5 VP per Gold
  const era2RoomVP = baseVP;
  const era2WeaponVP = gameState.goods.weapons;
  const era2IronVP = gameState.goods.iron * 0.5;
  const era2GoldVP = gameState.goods.gold * 0.5;
  
  const era2Score = era2RoomVP + era2WeaponVP + era2IronVP + era2GoldVP;
  
  // Final score = Era I score + Era II score
  const era1Score = gameState.era1Score || 0;
  const totalVP = era1Score + era2Score;

  const bonusDetails: { name: string; vp: number }[] = [];
  if (era2WeaponVP > 0) bonusDetails.push({ name: 'Weapons (1 VP)', vp: era2WeaponVP });
  if (era2IronVP > 0) bonusDetails.push({ name: 'Iron (0.5 VP)', vp: era2IronVP });
  if (era2GoldVP > 0) bonusDetails.push({ name: 'Gold (0.5 VP)', vp: era2GoldVP });

  return { 
    baseVP, 
    goldVP: era2GoldVP, 
    bonusVP: era2WeaponVP + era2IronVP + era2GoldVP, 
    totalVP, 
    era1Score,
    era1RoomVP: gameState.era1RoomVP || 0,
    era1GoldVP: gameState.era1GoldVP || 0,
    era2Score,
    era2RoomVP,
    era2WeaponVP,
    era2GoldVP,
    era2IronVP,
    bonusDetails 
  };
}
