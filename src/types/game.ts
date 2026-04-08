export type Good = 'wood' | 'stone' | 'emmer' | 'flax' | 'food' | 'gold';
export type EffectTrigger = 'immediate' | 'action' | 'passive' | 'end_game' | 'anytime' | 'none';

export interface GoodsState {
  wood: number;
  stone: number;
  emmer: number;
  flax: number;
  food: number;
  gold: number;
}

export interface WallRequirement {
  min: number;
  max: number;
  configuration: 'adjacent' | 'opposing' | 'any';
}

export interface RoomTile {
  id: string;
  name: string;
  color: 'orange' | 'blue';
  cost: Partial<Record<Good, number>>;
  vp: number;
  wallRequirement?: WallRequirement;
  trigger: EffectTrigger;
  effectDescription: string;
  iconicDescription?: string;
  effectPayload?: any;
}

export type SpaceState = 'EMPTY' | 'FACE_DOWN' | 'FURNISHED' | 'ENTRANCE' | 'CROSSED_PICKAXES';

export interface CaveSpace {
  id: string;
  row: number;
  col: number;
  state: SpaceState;
  tile?: RoomTile;
  openSides?: ('top' | 'bottom' | 'left' | 'right')[];
}

export interface ActionTile {
  id: string;
  name: string;
  stage: 0 | 2 | 3 | 4;
  description: string;
  iconicDescription?: string;
}

export interface ActionBoardState {
  round: number;
  turn: number;
  maxTurns: number;
  availableActions: ActionTile[];
  futureActions: ActionTile[];
  usedActionsThisRound: string[];
  totalRounds: number;
}

export type ChecklistActionType = 'EXCAVATE' | 'FURNISH' | 'ROOM_ACTION' | 'GAIN' | 'PAY' | 'CHOICE' | 'BUILD_WALL' | 'REMOVE_WALL' | 'PAY_DYNAMIC';

export interface ChecklistItem {
  id: string;
  text: string;
  status: 'TODO' | 'DOING' | 'DONE' | 'SKIPPED';
  actionType: ChecklistActionType;
  optional: boolean;
  exclusiveGroup?: string;
  data?: any;
}

export interface UIState {
  mode: 'IDLE' | 'EXCAVATE' | 'FURNISH_SELECT_ROOM' | 'FURNISH_SELECT_SPACE' | 'ROOM_ACTION' | 'BUILD_WALL' | 'REMOVE_WALL' | 'PAY_DYNAMIC' | 'RESOLVING_TURN' | 'GAME_OVER' | 'LEADERBOARD';
  excavationsLeft: number;
  furnishingsLeft: number;
  roomActionsLeft: number;
  wallsLeft: number;
  wallsToRemoveLeft: number;
  dynamicCostAmount: number;
  selectedRoomId?: string;
  checklist: ChecklistItem[];
  activeActionTile?: string;
  activatedRoomsThisTurn: string[];
  hasInteractedWithChecklist?: boolean;
  undoSnapshot?: string;
  showAdditionalCavernChoice?: boolean;
  isTriggeredByCheat?: boolean;
  showIconicDescription: boolean;
  highlightFurnishable: boolean;
  showScoreSummary: boolean;
}

export interface GameState {
  goods: GoodsState;
  cave: CaveSpace[];
  walls: string[];
  actionBoard: ActionBoardState;
  centralDisplay: (RoomTile | null)[];
  roomTileDeck: RoomTile[];
  uiState: UIState;
  hasAdditionalCavern: boolean;
  conversionHistory: (keyof GoodsState)[];
  gameId: string;
  cheatsUsed: boolean;
}
