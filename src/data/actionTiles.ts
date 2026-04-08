import { ActionTile } from '../types/game';

export const STARTING_ACTIONS: ActionTile[] = [
  { id: 'cultivation', name: 'Cultivation', stage: 0, description: 'Activate 1 orange room AND/OR Gain 2 emmer AND/OR Gain 1 flax', iconicDescription: '[1] \n +2[emmer] +1[flax]' },
  { id: 'housework', name: 'Housework', stage: 0, description: 'Pay food equal to the number of turns this round to furnish a cavern AND/OR Pay either 5 food or 1 gold to furnish a cavern', iconicDescription: '?[food] [arrow-right] [furnish] \n 5[food] | 1[gold] [arrow-right] [furnish]' },
  { id: 'excavation', name: 'Excavation', stage: 0, description: 'Excavate once OR pay 2 food to excavate twice AND/OR Gain 1 stone', iconicDescription: '[pickaxe] | 2[food] [arrow-right] [pickaxe] [pickaxe] \n  +1[stone]' },
  { id: 'undergrowth', name: 'Undergrowth', stage: 0, description: 'Activate 1 orange room AND/OR Gain 2 wood', iconicDescription: '[1] [space] +2[wood]' },
];

export const STAGE_2_ACTIONS: ActionTile[] = [
  { id: 'furnishing', name: 'Furnishing', stage: 2, description: 'Gain 1 food AND/OR Pay food equal to the number of turns this round to furnish a cavern', iconicDescription: '+1[food] \n ?[food] [arrow-right] [furnish]' },
  { id: 'masonry', name: 'Masonry', stage: 2, description: 'Activate 1 orange room AND/OR Gain either 1 wood or 1 stone AND/OR Build a wall', iconicDescription: '[1] \n +1[wood] | +1[stone] \n Build a wall' },
  { id: 'undermining', name: 'Undermining', stage: 2, description: 'Activate 2 orange rooms OR Excavate once, even through walls', iconicDescription: '[2] | [pickaxe] {wall}' },
];

export const STAGE_3_ACTIONS: ActionTile[] = [
  { id: 'expansion', name: 'Expansion', stage: 3, description: 'Excavate once AND/OR Pay either 5 food or 2 gold to furnish a cavern', iconicDescription: '[pickaxe] \n 5[food] | 2[gold] [arrow-right] [furnish]' },
  { id: 'breach', name: 'Breach', stage: 3, description: 'Remove one wall from anywhere to gain 2 stone, 3 food, and 1 gold', iconicDescription: 'Remove a wall [arrow-right] \n +2[stone] +3[food] +1[gold]' },
  { id: 'drift_mining', name: 'Drift Mining', stage: 3, description: 'Activate 1 orange room AND/OR Excavate once', iconicDescription: '[1] | [pickaxe]' },
  { id: 'expedition', name: 'Expedition', stage: 3, description: 'Pay either 5 wood or 5 stone to gain up to 4 gold OR Activate 3 orange rooms', iconicDescription: '5[wood] | 5[stone] [arrow-right] +4[gold] \n {or} \n [3]' },
];

export const STAGE_4_ACTIONS: ActionTile[] = [
  { id: 'renovation', name: 'Renovation', stage: 4, description: 'Build a wall AND/OR Furnish a cavern.', iconicDescription: 'Build a wall \n [furnish]' },
];

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function setupSoloActionBoard() {
  const stage3WithoutBreach = STAGE_3_ACTIONS.filter(a => a.id !== 'breach');
  const futureActions = [
    ...shuffle(STAGE_2_ACTIONS),
    ...shuffle(stage3WithoutBreach), // Shuffle the 3 Stage 3 actions that are NOT 'Breach'
    ...STAGE_4_ACTIONS
  ];
  return {
    availableActions: [...STARTING_ACTIONS],
    futureActions
  };
}
