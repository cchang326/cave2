import React, { useState, useEffect, useRef } from 'react';
import { GameState, CaveSpace, ActionBoardState, ChecklistItem, GoodsState, RoomTile } from './types/game';
import { ROOM_TILES_MAP, ROOM_TILES } from './data/roomTiles';
import { setupSoloActionBoard, ERA_II_ACTIONS, ERA_II_BOARD_ADDITIONAL_ACTIONS } from './data/actionTiles';
import { GoodsTrack } from './components/GoodsTrack';
import { CaveBoard } from './components/CaveBoard';
import { ActionBoard } from './components/ActionBoard';
import { CentralDisplay } from './components/CentralDisplay';
import { ChecklistUI } from './components/ChecklistUI';
import { ScoreSummary } from './components/ScoreSummary';
import { auth, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { incrementVisits } from './services/statsService';
import { LogIn, LogOut, User as UserIcon, Trophy, History, Clock, Pickaxe } from 'lucide-react';
import { SettingsPanel, SettingsState } from './components/Settings';
import { SelectGoodsModal } from './components/SelectGoodsModal';
import { AdditionalCavernModal } from './components/AdditionalCavernModal';
import { LoadGameModal } from './components/LoadGameModal';
import { saveService, GameSave } from './services/saveService';
import { userService } from './services/userService';
import { scoreService } from './services/scoreService';
import { calculateScore } from './utils/scoring';
import { generateChecklistForAction, getRoomActionChecklistItems } from './utils/checklist';
import { isValidRoomPlacement } from './utils/walls';
import { MAX_RESOURCE_LIMIT, MAX_GOLD_WEAPON_LIMIT, MAX_WALLS_ERA_I, MAX_WALLS_ERA_II } from './constants';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
          <div className="bg-stone-800 border-2 border-red-500 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-stone-300 mb-6 text-sm">
              The application encountered an unexpected error. You can try refreshing the page or restarting the game.
            </p>
            <div className="bg-stone-900/50 p-4 rounded-lg mb-6 text-left overflow-auto max-h-40">
              <code className="text-xs text-red-300/70 break-all">
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function canAfford(goods: GoodsState, cost?: Partial<GoodsState>, condition?: any): boolean {
  if (cost) {
    for (const key in cost) {
      const k = key as keyof GoodsState;
      if (goods[k] < (cost[k] || 0)) return false;
    }
  }

  if (condition) {
    if (condition.maxStone !== undefined && goods.stone > condition.maxStone) return false;
    if (condition.minGold !== undefined && goods.gold < condition.minGold) return false;
  }

  return true;
}

function hasWallBetween(r1: number, c1: number, r2: number, c2: number, walls: string[]): boolean {
  const wallId = `${Math.min(r1, r2)},${Math.min(c1, c2)}-${Math.max(r1, r2)},${Math.max(c1, c2)}`;
  return walls.includes(wallId);
}

function getAccessibleSpaces(cave: CaveSpace[], walls: string[], isUndermining: boolean, era: 1 | 2): string[] {
  // Define strictly the single external entry point into the system based on the current era
  const getExternalAccessPointResult = (c: CaveSpace[]) => {
    if (era === 1) return c.find(s => s.row === 3 && s.col === 0);
    return c.find(s => s.row === 3 && s.col === -1);
  };
  
  const externalPoint = getExternalAccessPointResult(cave);
  const reachableOpenSpaces = new Set<string>();
  const queue: CaveSpace[] = [];

  // 1. Initial seeds: Start from the single external access point IF it is currently open/excavated.
  if (externalPoint && externalPoint.state !== 'FACE_DOWN') {
    reachableOpenSpaces.add(externalPoint.id);
    queue.push(externalPoint);
  }

  // 2. Propagate reachability through open spaces within the cave
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = cave.filter(c => {
      const dx = Math.abs(c.col - current.col);
      const dy = Math.abs(c.row - current.row);
      return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    });

    for (const neighbor of neighbors) {
      if (reachableOpenSpaces.has(neighbor.id)) continue;
      
      // Can only pass through open (excavated) spaces
      const isOpen = neighbor.state !== 'FACE_DOWN' && ['ENTRANCE', 'EMPTY', 'FURNISHED', 'CROSSED_PICKAXES'].includes(neighbor.state);
      if (isOpen) {
        if (isUndermining || !hasWallBetween(current.row, current.col, neighbor.row, neighbor.col, walls)) {
          reachableOpenSpaces.add(neighbor.id);
          queue.push(neighbor);
        }
      }
    }
  }

  // 3. Determine which FACE_DOWN spaces are accessible for excavation
  const accessibleIds: string[] = [];
  for (const space of cave) {
    if (space.state === 'FACE_DOWN') {
      // Case A: It is the external entry point for the current era. 
      // It is always accessible from the outside world.
      if (externalPoint && space.id === externalPoint.id) {
        accessibleIds.push(space.id);
        continue;
      }

      // Case B: It is adjacent to an open space that is reachable from the entrance.
      const neighbors = cave.filter(c => {
        const dx = Math.abs(c.col - space.col);
        const dy = Math.abs(c.row - space.row);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
      });

      const isAccessibleFromInside = neighbors.some(open => {
        if (!reachableOpenSpaces.has(open.id)) return false;
        if (!isUndermining && hasWallBetween(space.row, space.col, open.row, open.col, walls)) return false;
        return true;
      });

      if (isAccessibleFromInside) {
        accessibleIds.push(space.id);
      }
    }
  }

  return accessibleIds;
}

function canPlaceAnyVisibleTiles(state: GameState): boolean {
  const availableSpaces = state.cave.filter(s => s.state === 'EMPTY' || s.state === 'CROSSED_PICKAXES');
  if (availableSpaces.length === 0) return false;

  const availableRooms = state.centralDisplay.filter((r): r is RoomTile => r !== null);
  if (availableRooms.length === 0) return false;

  for (const room of availableRooms) {
    for (const space of availableSpaces) {
      if (isValidRoomPlacement(space, state.walls, room.wallRequirement)) {
        // Also check the orange vs blue room rule
        if (room.color === 'blue') {
          const orangeRooms = state.cave.filter(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE') && s.tile?.color === 'orange').length;
          const blueRooms = state.cave.filter(s => s.state === 'FURNISHED' && s.tile?.color === 'blue').length;
          if (blueRooms + 1 >= orangeRooms) continue;
        }
        return true;
      }
    }
  }

  return false;
}

function shouldEndDrafting(state: GameState): boolean {
  const availableSpaces = state.cave.filter(s => s.state === 'EMPTY' || s.state === 'CROSSED_PICKAXES');
  // 1. If no empty spaces on the board, terminate.
  if (availableSpaces.length === 0) return true;
  
  // 2. If VP >= 42, terminate.
  if (state.uiState.draftingScore >= 42) return true;

  // 3. If we can place visible tiles, don't terminate.
  if (canPlaceAnyVisibleTiles(state)) return false;

  // 4. If we can't place visible tiles, check if we can still do something:
  // - FDP1 is not empty (can draw a new tile)
  // - Or there're still unused walls (can build a wall to enable placement)
  if (state.fdp1.length > 0 || state.uiState.draftingWallsLeft > 0) return false;

  // Otherwise, terminate.
  return true;
}

function addGoods(current: GameState['goods'], gains: Partial<GameState['goods']>): GameState['goods'] {
  const next = { ...current };
  for (const key in gains) {
    const k = key as keyof GameState['goods'];
    next[k] = next[k] + (gains[k] || 0);
    // Enforce max limits from constants
    if (k === 'gold' || k === 'weapons') {
      next[k] = Math.min(MAX_GOLD_WEAPON_LIMIT, next[k]);
    } else {
      next[k] = Math.min(MAX_RESOURCE_LIMIT, next[k]);
    }
  }
  return next;
}

function subtractGoods(current: GameState['goods'], costs: Partial<GameState['goods']>): GameState['goods'] {
  const next = { ...current };
  for (const key in costs) {
    const k = key as keyof GameState['goods'];
    next[k] = Math.max(0, next[k] - (costs[k] || 0));
  }
  return next;
}

function generateGameId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function initializeGame(): GameState {
  // 3 out of the 6 unexcavatable rooms (tile 1-6) are randomly selected and removed from the game.
  // The remaining 3 are placed in the central display during initial setup.
  const unexcavatable = ROOM_TILES.filter(r => r.era === 1 && !r.excavatable);
  const shuffledUnexcavatable = [...unexcavatable].sort(() => Math.random() - 0.5);
  const removedUnexcavatable = shuffledUnexcavatable.slice(0, 3);
  const displayUnexcavatable = shuffledUnexcavatable.slice(3, 6);
  
  const otherTiles = ROOM_TILES.filter(r => r.era === 1 && r.excavatable);
  const shuffledOther = [...otherTiles].sort(() => Math.random() - 0.5);

  const initialCave: CaveSpace[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (col === 2 && row !== 4) continue; // Skip the empty spaces in the top right

      let state: CaveSpace['state'] = 'FACE_DOWN';
      let tile = undefined;
      let openSides: CaveSpace['openSides'] = undefined;

      // Define openSides for Era I spaces (not perimeter walls)
      if (row === 0 && col === 0) openSides = ['bottom', 'right'];
      else if (row === 1 && col === 0) openSides = ['top', 'bottom', 'right'];
      else if (row === 2 && col === 0) openSides = ['top', 'bottom', 'right'];
      else if (row === 3 && col === 0) openSides = ['top', 'right', 'left', 'bottom']; // Entrance open to left and bottom
      else if (row === 4 && col === 0) openSides = ['right', 'top']; // Wall at left and bottom
      else if (row === 0 && col === 1) openSides = ['bottom', 'left'];
      else if (row === 1 && col === 1) openSides = ['top', 'bottom', 'left'];
      else if (row === 2 && col === 1) openSides = ['top', 'bottom', 'left'];
      else if (row === 3 && col === 1) openSides = ['top', 'bottom', 'left'];
      else if (row === 4 && col === 1) openSides = ['top', 'right', 'left'];
      else if (row === 4 && col === 2) openSides = ['left'];

      if (row === 3 && col === 0) {
        state = 'ENTRANCE';
        tile = ROOM_TILES_MAP.caveEntrance;
      } else if (row === 2 && col === 0) {
        state = 'CROSSED_PICKAXES';
      } else {
        tile = shuffledOther.pop(); // Take tiles for the cave
      }

      initialCave.push({
        id: `space-${row}-${col}`,
        row,
        col,
        state,
        tile,
        openSides
      });
    }
  }

  // Era I starts with no internal walls (only perimeter walls rendered by component)
  const initialWalls: string[] = [];

  const { availableActions, futureActions } = setupSoloActionBoard();
  const firstNewAction = futureActions.shift();
  if (firstNewAction) {
    availableActions.push(firstNewAction);
  }

  const initialActionBoard: ActionBoardState = {
    round: 1,
    turn: 1,
    maxTurns: 2,
    availableActions,
    futureActions,
    usedActionsThisRound: [],
    totalRounds: futureActions.length + 1 // 7 rounds total for solo game
  };

  return {
    goods: {
      wood: 1,
      stone: 1,
      emmer: 1,
      flax: 1,
      food: 1,
      gold: 1,
      donkey: 0,
      ore: 0,
      iron: 0,
      weapons: 0
    },
    cave: initialCave,
    walls: initialWalls,
    actionBoard: initialActionBoard,
    centralDisplay: displayUnexcavatable, // The 3 remaining unexcavatable tiles
    fdp1: shuffledOther, // Remaining 8 in the deck
    fdp2: [],
    hasAdditionalCavern: false,
    uiState: {
      mode: 'IDLE',
      gameType: 'ERA_I',
      excavationsLeft: 0,
      furnishingsLeft: 0,
      roomActionsLeft: 0,
      wallsLeft: 0,
      wallsToRemoveLeft: 0,
      dynamicCostAmount: 0,
      checklist: [],
      activatedRoomsThisTurn: [],
      showIconicDescription: true,
      highlightFurnishable: false,
      showScoreSummary: false,
      draftingWallsLeft: 0,
      draftingScore: 0
    },
    conversionHistory: [],
    gameId: generateGameId(),
    cheatsUsed: false,
    era: 1,
    era1Score: 0,
    era1RoomVP: 0,
    era1GoldVP: 0
  };
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [settingsState, setSettingsState] = useState<SettingsState>({
    fixTileLocations: true,
    isMuted: false
  });
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuppressingSounds, setIsSuppressingSounds] = useState(false);
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(true);
  const autoExecutedRef = useRef<Set<string>>(new Set());
  const prevChecklistLengthRef = useRef(0);
  const prevModeRef = useRef<string>('IDLE');

  useEffect(() => {
    const currentChecklistLength = gameState.uiState.checklist.length;
    const currentMode = gameState.uiState.mode;
    const isFurnishing = currentMode === 'FURNISH_SELECT_ROOM' || 
                        currentMode === 'FURNISH_SELECT_SPACE' || 
                        currentMode === 'DRAFTING_PLACE_ROOM';

    if (isFurnishing) {
      setIsChecklistCollapsed(true);
    } else if (prevModeRef.current !== currentMode && !isFurnishing && currentChecklistLength > 0) {
      setIsChecklistCollapsed(false);
    } else if (currentChecklistLength > prevChecklistLengthRef.current && currentChecklistLength > 0) {
      setIsChecklistCollapsed(false);
    } else if (currentChecklistLength === 0) {
      setIsChecklistCollapsed(true);
    }

    prevChecklistLengthRef.current = currentChecklistLength;
    prevModeRef.current = currentMode;
  }, [gameState.uiState.mode, gameState.uiState.checklist.length]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (!settingsState.fixTileLocations) {
      setGameState(prev => {
        if (prev.centralDisplay.some(t => t === null)) {
          return {
            ...prev,
            centralDisplay: prev.centralDisplay.filter((t): t is RoomTile => t !== null)
          };
        }
        return prev;
      });
    }
  }, [settingsState.fixTileLocations]);

  useEffect(() => {
    incrementVisits();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Sync user profile to Firestore so the document exists and is visible in console
        await userService.syncUserProfile(u);
        const role = await userService.getUserRole(u.uid);
        setUserRole(role);

        // Case: User just logged in
        // Check if there's an ongoing game (Round > 1 or Turn > 1 or any actions taken)
        // We use a ref to get the current gameState without adding it to dependencies
        const currentState = gameStateRef.current;
        const isOngoing = currentState.actionBoard.round > 1 || 
                          currentState.actionBoard.turn > 1 || 
                          currentState.actionBoard.usedActionsThisRound.length > 0;
        
        if (isOngoing) {
          // Mid-game login: Save current game to an open slot
          const openSlot = await saveService.findOpenSlot();
          setCurrentSlotId(openSlot);
          await saveService.saveGame(openSlot, currentState);
        } else {
          // Page load login: Auto-load most recent unfinished game
          const recentSave = await saveService.getMostRecentUnfinishedSave();
          if (recentSave) {
            setGameState(recentSave.state);
            setCurrentSlotId(recentSave.id);
          } else {
            // No unfinished saves, prepare for a new game save in an open slot
            const openSlot = await saveService.findOpenSlot();
            setCurrentSlotId(openSlot);
          }
        }
      } else {
        // User logged out
        setCurrentSlotId(null);
      }
      setUser(u);
    });
    return () => unsubscribe();
  }, []); // Only run once on mount

  // Keep a ref to gameState for the auth useEffect
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (gameState.uiState.checklist.length === 0) {
      autoExecutedRef.current.clear();
    }
  }, [gameState.uiState.checklist.length]);

  const handleToggleHighlight = () => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        highlightFurnishable: !prev.uiState.highlightFurnishable
      }
    }));
  };

  const handleTakeAction = (actionId: string) => {
    if (gameState.uiState.mode !== 'IDLE') return;

    setGameState(prev => {
      const checklist = generateChecklistForAction(actionId, prev.actionBoard, prev.cave);
      return {
        ...prev,
        conversionHistory: [],
        uiState: {
          ...prev.uiState,
          mode: 'RESOLVING_TURN',
          activeActionTile: actionId,
          checklist,
          hasInteractedWithChecklist: false,
          undoSnapshot: JSON.stringify({ ...prev, uiState: { ...prev.uiState, undoSnapshot: undefined } })
        }
      };
    });
  };

  const handleSelectAdditionalCavern = (walls: 2 | 3) => {
    setGameState(prev => {
      const nextState = { 
        ...prev, 
        hasAdditionalCavern: true,
        cheatsUsed: prev.cheatsUsed || !!prev.uiState.isTriggeredByCheat,
        cave: [...prev.cave],
        walls: [...prev.walls],
        uiState: { 
          ...prev.uiState, 
          showAdditionalCavernChoice: false,
          isTriggeredByCheat: false
        }
      };

      // Preserve existing walls that become internal:
      // 1. Wall between (3,1) and (3,2)
      // 2. Wall between (4,2) and (3,2)
      const existingWalls = ['3,1-3,2', '3,2-4,2'];
      existingWalls.forEach(w => {
        if (!nextState.walls.includes(w)) {
          nextState.walls.push(w);
        }
      });

      const openSides: ('top' | 'bottom' | 'left' | 'right')[] = [];
      if (walls === 2) {
        // 2-wall: already has Left and Bottom (internal). So it's open to Top and Right.
        openSides.push('top', 'right');
      } else {
        // 3-wall: add a wall at the top. So it's only open to Right.
        openSides.push('right');
      }

      nextState.cave.push({
        id: 'additional-cavern',
        row: 3,
        col: 2,
        state: 'EMPTY',
        openSides
      });

      return nextState;
    });
  };

  const handleCloseAdditionalCavern = () => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        showAdditionalCavernChoice: false,
        isTriggeredByCheat: false
      }
    }));
  };

  const handleExecuteChecklist = (id: string, isManual: boolean = true, amount: number = 0) => {
    setGameState(prev => {
      const next = { ...prev, conversionHistory: [] };
      next.uiState.hasInteractedWithChecklist = isManual || next.uiState.hasInteractedWithChecklist;
      const checklist = [...next.uiState.checklist];
      const itemIndex = checklist.findIndex(i => i.id === id);
      if (itemIndex === -1) return prev;

      const item = checklist[itemIndex];
      const updatedItem = { ...item };

      // Check if they can furnish before deducting food
      if (item.actionType === 'FURNISH') {
        if (next.centralDisplay.filter(Boolean).length === 0 || !next.cave.some(s => s.state === 'EMPTY' || s.state === 'CROSSED_PICKAXES')) {
          showNotification("No rooms available to furnish or no empty spaces in the cave!", 'error');
          checklist[itemIndex] = { ...item, status: 'SKIPPED' };
          next.uiState.checklist = checklist;
          return next;
        }
      } else if (item.actionType === 'EXCAVATE') {
        const isUndermining = next.uiState.activeActionTile === 'undermining';
        const accessible = getAccessibleSpaces(next.cave, next.walls, isUndermining, next.era);
        if (accessible.length === 0) {
          showNotification("No accessible spaces to excavate!", 'error');
          checklist[itemIndex] = { ...item, status: 'SKIPPED' };
          next.uiState.checklist = checklist;
          return next;
        }
      } else if (item.actionType === 'ROOM_ACTION') {
        const hasRoomActions = next.cave.some(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE') && s.tile?.trigger === 'action');
        if (!hasRoomActions) {
          showNotification("No rooms with actions available!", 'error');
          checklist[itemIndex] = { ...item, status: 'SKIPPED' };
          next.uiState.checklist = checklist;
          return next;
        }
      } else if (item.actionType === 'REMOVE_WALL') {
        if (next.walls.length === 0) {
          showNotification("No walls to remove!", 'error');
          checklist[itemIndex] = { ...item, status: 'SKIPPED' };
          next.uiState.checklist = checklist;
          return next;
        }
      }

      // Handle payBefore for any action type
      if (item.data?.payBefore) {
        if (!canAfford(next.goods, item.data.payBefore)) {
          showNotification("Not enough resources to pay for this action!", 'error');
          return prev;
        }
        next.goods = subtractGoods(next.goods, item.data.payBefore);
      }

      // Check condition before executing
      if (item.data?.condition) {
        if (!canAfford(next.goods, undefined, item.data.condition)) {
          showNotification("Condition not met for this action!", 'error');
          return prev;
        }
      }

      if (item.actionType === 'GAIN') {
        if (item.data.replenishUpTo) {
          const diff: Partial<typeof next.goods> = {};
          for (const key of Object.keys(item.data.replenishUpTo)) {
            const k = key as keyof GoodsState;
            const target = (item.data.replenishUpTo as Record<string, number>)[key];
            const current = next.goods[k] || 0;
            if (current < target) {
              diff[k] = target - current;
            }
          }
          next.goods = addGoods(next.goods, diff);
        } else if (item.data.goods) {
          next.goods = addGoods(next.goods, item.data.goods);
        }
        updatedItem.status = 'DONE';
      } else if (item.actionType === 'GAIN_CALCULATED') {
        if (item.data.calculation === 'gold_per_2_donkeys') {
          const goldToGain = Math.floor((next.goods.donkey || 0) / 2);
          next.goods = addGoods(next.goods, { gold: goldToGain });
        }
        updatedItem.status = 'DONE';
      } else if (item.actionType === 'PAY') {
        const hasEnough = Object.entries(item.data.goods).every(([key, value]) => {
          return (next.goods[key as keyof typeof next.goods] || 0) >= (value as number);
        });
        if (!hasEnough) {
          showNotification("Not enough resources to pay!", 'error');
          return prev;
        }
        next.goods = subtractGoods(next.goods, item.data.goods);
        updatedItem.status = 'DONE';
      } else if (item.actionType === 'QUANTITY') {
        const amt = amount || 0;
        if (amt > 0) {
          if (item.data.costPer) {
            const totalCost: Partial<GoodsState> = {};
            for (const [res, cost] of Object.entries(item.data.costPer)) {
              totalCost[res as keyof GoodsState] = (cost as number) * amt;
            }
            if (!canAfford(next.goods, totalCost)) {
              showNotification("Not enough resources for this quantity!", 'error');
              return prev;
            }
            next.goods = subtractGoods(next.goods, totalCost);
          }
          if (item.data.gainPer) {
            const totalGain: Partial<GoodsState> = {};
            for (const [res, gain] of Object.entries(item.data.gainPer)) {
              totalGain[res as keyof GoodsState] = (gain as number) * amt;
            }
            next.goods = addGoods(next.goods, totalGain);
          }
        }
        updatedItem.data = { ...updatedItem.data, finalAmount: amt };
        updatedItem.status = 'DONE';
      } else if (item.actionType === 'EXCAVATE') {
        next.uiState.mode = 'EXCAVATE';
        next.uiState.excavationsLeft = item.data.count;
        updatedItem.status = 'DOING';
      } else if (item.actionType === 'FURNISH') {
        next.uiState.mode = 'FURNISH_SELECT_ROOM';
        next.uiState.furnishingsLeft = item.data.count;
        updatedItem.status = 'DOING';
      } else if (item.actionType === 'ROOM_ACTION') {
        next.uiState.mode = 'ROOM_ACTION';
        next.uiState.roomActionsLeft = item.data.count;
        updatedItem.status = 'DOING';
      } else if (item.actionType === 'BUILD_WALL') {
        next.uiState.mode = 'BUILD_WALL';
        next.uiState.wallsLeft = item.data.count;
        updatedItem.status = 'DOING';
      } else if (item.actionType === 'REMOVE_WALL') {
        next.uiState.mode = 'REMOVE_WALL';
        next.uiState.wallsToRemoveLeft = item.data.count;
        updatedItem.status = 'DOING';
      } else if (item.actionType === 'PAY_DYNAMIC') {
        next.uiState.mode = 'PAY_DYNAMIC';
        next.uiState.dynamicCostAmount = item.data.amount;
        updatedItem.status = 'DOING';
      }

      // Handle exclusive groups
      if (item.exclusiveGroup) {
        checklist.forEach((checkItem, idx) => {
          if (checkItem.id !== item.id && checkItem.exclusiveGroup === item.exclusiveGroup && checkItem.status === 'TODO') {
            checklist[idx] = { ...checkItem, status: 'SKIPPED' };
          }
        });
      }

      // Automatically grant passive gains if they exist
      if (updatedItem.status === 'DONE' && updatedItem.passiveGains) {
        updatedItem.passiveGains.forEach(pg => {
          next.goods = addGoods(next.goods, pg.goods);
        });
      }

      checklist[itemIndex] = updatedItem;
      next.uiState.checklist = checklist;
      return next;
    });
  };

  const handleSkipChecklist = (id: string, isManual: boolean = true) => {
    setGameState(prev => {
      const next = { ...prev, conversionHistory: [] };
      next.uiState.hasInteractedWithChecklist = isManual || next.uiState.hasInteractedWithChecklist;
      const checklist = [...next.uiState.checklist];
      const itemIndex = checklist.findIndex(i => i.id === id);
      if (itemIndex === -1) return prev;

      const item = checklist[itemIndex];
      if (item.status === 'DOING') {
        next.uiState.mode = 'RESOLVING_TURN';
      }

      checklist[itemIndex] = { ...item, status: 'SKIPPED' as const };
      next.uiState.checklist = checklist;
      return next;
    });
  };

  const handleChooseChecklist = (id: string, optionIndex: number, isManual: boolean = true) => {
    setGameState(prev => {
      const next = { ...prev, conversionHistory: [] };
      next.uiState.hasInteractedWithChecklist = isManual || next.uiState.hasInteractedWithChecklist;
      const checklist = [...next.uiState.checklist];
      const itemIndex = checklist.findIndex(i => i.id === id);
      if (itemIndex === -1) return prev;

      const item = checklist[itemIndex];
      const option = item.data.options[optionIndex];

      // Replace the choice item with the sub-items
      // Inherit the optional status from the parent choice if it's optional
      const subItems = option.items.map((subItem: ChecklistItem) => ({
        ...subItem,
        optional: item.optional || subItem.optional
      }));

      checklist.splice(itemIndex, 1, ...subItems);

      return { ...next, uiState: { ...next.uiState, checklist } };
    });
  };

  useEffect(() => {
    if (gameState.uiState.mode !== 'RESOLVING_TURN') return;

    const todos = gameState.uiState.checklist.filter(i => i.status === 'TODO');
    const doings = gameState.uiState.checklist.filter(i => i.status === 'DOING');

    if (doings.length > 0) return; // Wait for current action to finish

    // Auto-choose if there's a CHOICE with only 1 viable option and it's NOT optional
    const choiceItem = todos.find(i => i.actionType === 'CHOICE');
    if (choiceItem && !choiceItem.optional) {
      const viableOptions = choiceItem.data.options.map((opt: any, idx: number) => ({ opt, idx }))
        .filter(({ opt }: any) => canAfford(gameState.goods, opt.cost));
      
      if (viableOptions.length === 1) {
        handleChooseChecklist(choiceItem.id, viableOptions[0].idx, false);
        return;
      }
    }

    // Auto-execute the first TODO item if it's not a CHOICE and it's not optional
    // OR if it's the only TODO item left.
    if (todos.length > 0) {
      const item = todos[0];
      if (item.actionType !== 'CHOICE') {
        if (autoExecutedRef.current.has(item.id)) return;

        const cost = item.actionType === 'PAY' ? item.data?.goods : item.data?.payBefore;
        const affordable = canAfford(gameState.goods, cost);
        
        if (affordable && !item.optional) {
          autoExecutedRef.current.add(item.id);
          // Use a slight timeout to allow UI to render the checklist before auto-executing
          // This prevents the UI from feeling too jarring
          const timer = setTimeout(() => {
            handleExecuteChecklist(item.id, false);
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [gameState.uiState.checklist, gameState.uiState.mode, gameState.goods]);

  const handleFinishTurn = () => {
    setGameState(prev => {
      const nextState = { ...prev, conversionHistory: [] };
      const board = nextState.actionBoard;
      const actionId = nextState.uiState.activeActionTile!;
      
      const newUsed = [...board.usedActionsThisRound, actionId];
      
      let newTurn = board.turn + 1;
      let newRound = board.round;
      let newMaxTurns = board.maxTurns;
      let newAvailable = [...board.availableActions];
      let newFuture = [...board.futureActions];
      let nextUsed: string[] = newUsed;

      let nextMode: GameState['uiState']['mode'] = 'IDLE';

      if (newTurn > board.maxTurns) {
        // End of round logic
        if (nextState.era === 2) {
          // Donkeys Haul Ore: Gain 1 ore per donkey
          const donkeyCount = nextState.goods.donkey;
          if (donkeyCount > 0) {
            nextState.goods = addGoods(nextState.goods, { ore: donkeyCount });
            showNotification(`Donkeys hauled ${donkeyCount} ore!`, 'success');
          }
        }

        if (newRound < board.totalRounds) {
          newRound++;
          newTurn = 1;
          const nextAction = newFuture.shift();
          if (nextAction) {
            newAvailable.push(nextAction);
          }
          
          // Determine max turns for the new round
          if (nextState.era === 1) {
            if (newRound <= 3) {
              newMaxTurns = 2;
            } else if (newRound <= 6) {
              newMaxTurns = 3;
            } else {
              newMaxTurns = 4;
            }
          } else {
            // Era II turns: Rounds 8-11 all have 4 turns
            newMaxTurns = 4;
          }
          
          nextUsed = [];
        } else {
          nextMode = 'GAME_OVER';
        }
      }

      nextState.actionBoard = {
        round: newRound,
        turn: nextMode === 'GAME_OVER' ? board.maxTurns : newTurn,
        maxTurns: newMaxTurns,
        availableActions: newAvailable,
        futureActions: newFuture,
        usedActionsThisRound: nextUsed,
        totalRounds: board.totalRounds
      };

      nextState.uiState = {
        ...prev.uiState,
        mode: nextMode,
        gameType: prev.uiState.gameType,
        excavationsLeft: 0,
        furnishingsLeft: 0,
        roomActionsLeft: 0,
        wallsLeft: 0,
        wallsToRemoveLeft: 0,
        dynamicCostAmount: 0,
        checklist: [],
        activeActionTile: undefined,
        activatedRoomsThisTurn: [],
        showIconicDescription: prev.uiState.showIconicDescription,
        highlightFurnishable: prev.uiState.highlightFurnishable,
        showScoreSummary: nextMode === 'GAME_OVER',
        draftingWallsLeft: prev.uiState.draftingWallsLeft,
        draftingScore: prev.uiState.draftingScore,
        undoSnapshot: undefined
      };

      // If Era I just finished, cache the score breakdown now
      if (nextMode === 'GAME_OVER' && nextState.era === 1) {
        const scoreDetails = calculateScore(nextState);
        nextState.era1Score = scoreDetails.totalVP;
        nextState.era1RoomVP = scoreDetails.baseVP;
        nextState.era1GoldVP = scoreDetails.goldVP;
      }

      return nextState;
    });
  };

  // Auto-save effect
  useEffect(() => {
    let active = true;
    if (!user || !currentSlotId) return;
    
    // Only save if we are in a stable state (IDLE or GAME_OVER)
    // and some progress has been made (not just initialized)
    const isStable = gameState.uiState.mode === 'IDLE' || gameState.uiState.mode === 'GAME_OVER';
    if (!isStable) return;

    // Avoid saving the very first state if nothing happened
    if (gameState.actionBoard.round === 1 && gameState.actionBoard.turn === 1 && gameState.actionBoard.usedActionsThisRound.length === 0 && gameState.uiState.mode !== 'GAME_OVER') {
      return;
    }

    const performSave = async () => {
      setIsSaving(true);
      try {
        await saveService.saveGame(currentSlotId, gameState);
        if (gameState.uiState.mode === 'GAME_OVER' && active) {
          await scoreService.saveHighScore(gameState);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        if (active) setIsSaving(false);
      }
    };

    performSave();
    return () => { active = false; };
  }, [gameState.actionBoard.round, gameState.actionBoard.turn, gameState.uiState.mode, user, currentSlotId]);

  const startNewGame = () => {
    const newState = initializeGame();
    setGameState(newState);
    // If logged in, we should probably save the new state to the current slot
    if (user && currentSlotId) {
      saveService.saveGame(currentSlotId, newState);
    }
  };

  const startDrafting = () => {
    // 1. Set all resources to 0
    const zeroGoods: GoodsState = {
      wood: 0, stone: 0, emmer: 0, flax: 0, food: 0, gold: 0, donkey: 0, ore: 0, iron: 0, weapons: 0
    };

    // 2. Initial setup of room tiles
    const eraIRooms = ROOM_TILES.filter(r => r.era === 1);
    const nonExcavatableEraI = eraIRooms.filter(r => !r.excavatable);
    const excavatableEraI = eraIRooms.filter(r => r.excavatable);

    // Remove 3 random non-excavatable room tiles from the game
    const shuffledNonExcavatable = [...nonExcavatableEraI].sort(() => Math.random() - 0.5);
    const startingRooms = shuffledNonExcavatable.slice(3); // The remaining 3

    // The rest of Era I room tiles (excavatable ones) are shuffled into FDP1
    const fdp1 = [...excavatableEraI].sort(() => Math.random() - 0.5);

    // Draw a tile from FDP1 and place it in central display
    const firstDrawn = fdp1.shift();
    const centralDisplay = [...startingRooms];
    if (firstDrawn) centralDisplay.push(firstDrawn);

    // Initial cave for drafting: all spaces are EMPTY (excavated) except entrance
    const initialCave: CaveSpace[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (col === 2 && row !== 4) continue;
        
        let state: CaveSpace['state'] = 'EMPTY';
        let tile = undefined;

        if (row === 3 && col === 0) {
          state = 'ENTRANCE';
          tile = ROOM_TILES_MAP.caveEntrance;
        } else if (row === 2 && col === 0) {
          state = 'CROSSED_PICKAXES';
        }

        initialCave.push({
          id: `space-${row}-${col}`,
          row,
          col,
          state,
          tile
        });
      }
    }

    setGameState(prev => ({
      ...prev,
      gameId: generateGameId(),
      era: 1,
      goods: zeroGoods,
      cave: initialCave,
      walls: [],
      centralDisplay: centralDisplay,
      fdp1: fdp1,
      fdp2: [],
      uiState: {
        ...prev.uiState,
        mode: 'DRAFTING',
        gameType: 'ERA_II_DRAFT',
        draftingScore: 0,
        draftingWallsLeft: 3,
        showScoreSummary: false
      },
      era1Score: 0,
      era1RoomVP: 0,
      era1GoldVP: 0
    }));
  };

  const transitionToEraII = () => {
    setIsSuppressingSounds(true);
    setGameState(prev => {
      let currentFdp1 = [...prev.fdp1];
      
      // 1. Cover remaining uncovered spaces in player's cave with tiles from FDP1 (Draft Mode ONLY)
      const eraICave = prev.cave.map(space => {
        if (prev.uiState.gameType === 'ERA_II_DRAFT' && (space.state === 'EMPTY' || space.state === 'CROSSED_PICKAXES')) {
          if (currentFdp1.length > 0) {
            const tile = currentFdp1.shift();
            return { ...space, state: 'FACE_DOWN' as const, tile };
          }
        }
        return space;
      });

      // 2. Setup Era II board (8 spaces) added to the left of Era I
      const eraIICave: CaveSpace[] = [];
      const eraIITiles = ROOM_TILES.filter(r => r.era === 2 && r.excavatable);
      const shuffledEraIITiles = [...eraIITiles].sort(() => Math.random() - 0.5);

      const eraIICoords = [
        { row: 0, col: -1, state: 'FACE_DOWN' as const, openSides: ['bottom'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 1, col: -3, state: 'FACE_DOWN' as const, openSides: ['right'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 1, col: -2, state: 'FACE_DOWN' as const, openSides: ['left', 'right', 'bottom'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 1, col: -1, state: 'FACE_DOWN' as const, openSides: ['top', 'left', 'bottom', 'right'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 2, col: -2, state: 'FACE_DOWN' as const, openSides: ['top', 'bottom', 'right'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 2, col: -1, state: 'FACE_DOWN' as const, openSides: ['top', 'bottom', 'left', 'right'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 3, col: -2, state: 'FACE_DOWN' as const, openSides: ['top', 'right'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() },
        { row: 3, col: -1, state: 'FACE_DOWN' as const, openSides: ['top', 'left', 'right', 'bottom'] as ("top" | "bottom" | "left" | "right")[], tile: shuffledEraIITiles.shift() }
      ];

      // Place 8 tiles on Era II board
      for (const { row, col, state, openSides, tile } of eraIICoords) {
        eraIICave.push({
          id: `space-${row}-${col}`,
          row,
          col,
          state,
          openSides,
          tile
        });
      }

      // Remaining 7 excavatable Era II rooms form FDP2
      const fdp2 = shuffledEraIITiles;

      // Update Era I spaces that connect to Era II
      const updatedCave = eraICave.map(space => {
        // The old Era I entrance at (3,0) is now a standard furnished room
        if (space.row === 3 && space.col === 0) return { ...space, state: 'FURNISHED' as const, openSides: ['top', 'right', 'left'] as ("top" | "bottom" | "left" | "right")[] };
        
        if (space.row === 0 && space.col === 0) return { ...space, openSides: ['bottom', 'right', 'left'] as ("top" | "bottom" | "left" | "right")[] };
        if (space.row === 1 && space.col === 0) return { ...space, openSides: ['top', 'bottom', 'right', 'left'] as ("top" | "bottom" | "left" | "right")[] };
        if (space.row === 2 && space.col === 0) return { ...space, openSides: ['top', 'bottom', 'right', 'left'] as ("top" | "bottom" | "left" | "right")[] };
        return space;
      });

      // Combine boards
      const combinedCave = [...updatedCave, ...eraIICave];

      // Add boundary walls between Era I and Era II (except at entrance)
      const newWalls = [...prev.walls];
      const boundaryWalls = [
        '0,-1-0,0',
        '1,-1-1,0',
        '2,-1-2,0'
      ];
      
      boundaryWalls.forEach(w => {
        if (!newWalls.includes(w)) newWalls.push(w);
      });

      // 3. Set resources based on transition mode
      let eraIIGoods: GoodsState;
      if (prev.uiState.gameType === 'ERA_II_DRAFT') {
        // In draft mode, all resources are set to 1
        eraIIGoods = {
          wood: 1, stone: 1, emmer: 1, flax: 1, food: 1, gold: 1, donkey: 1, ore: 1, iron: 1, weapons: 1
        };
      } else {
        // In non-draft transition:
        // - All non-zero Era I goods keep counts
        // - Era I goods that are 0 are set to 1
        // - New Era II goods (ore, iron, weapons) are set to 1
        eraIIGoods = {
          wood: Math.max(1, prev.goods.wood),
          stone: Math.max(1, prev.goods.stone),
          emmer: Math.max(1, prev.goods.emmer),
          flax: Math.max(1, prev.goods.flax),
          food: Math.max(1, prev.goods.food),
          gold: Math.max(1, prev.goods.gold),
          donkey: 1,
          ore: 1,
          iron: 1,
          weapons: 1
        };
      }

      // 4. Update central display with Era II non-excavatable rooms
      // For solo mode, remove 3 (out of 6) random non-excavatable Era II room tiles
      const eraIINonExcavatable = ROOM_TILES.filter(r => r.era === 2 && !r.excavatable);
      const shuffledNonExcavatable = [...eraIINonExcavatable].sort(() => Math.random() - 0.5);
      const displayRooms = shuffledNonExcavatable.slice(3);
      
      // Action Board update
      const shuffledEraII = [...ERA_II_ACTIONS].sort(() => Math.random() - 0.5);
      
      const allEraIActions = [...prev.actionBoard.availableActions, ...prev.actionBoard.futureActions];
      const eraIAvailableActions = allEraIActions.filter(a => a.id !== 'renovation');

      const nextActionBoard = {
        ...prev.actionBoard,
        round: 8,
        turn: 1,
        maxTurns: 4,
        availableActions: [...eraIAvailableActions, shuffledEraII[0]],
        futureActions: shuffledEraII.slice(1),
        usedActionsThisRound: [],
        totalRounds: 11
      };

      return {
        ...prev,
        era: 2,
        uiState: {
          ...prev.uiState,
          gameType: prev.uiState.gameType === 'ERA_II_DRAFT' ? 'ERA_II_DRAFT' : 'ERA_II',
          mode: 'IDLE',
          draftingScore: 0,
          draftingWallsLeft: 0,
          showScoreSummary: false,
          wallsLeft: 0 // Reset walls left from any previous action
        },
        cave: combinedCave,
        walls: newWalls,
        actionBoard: nextActionBoard,
        centralDisplay: [...prev.centralDisplay, ...displayRooms],
        fdp1: currentFdp1,
        fdp2: fdp2,
        goods: eraIIGoods,
      };
    });
    setTimeout(() => setIsSuppressingSounds(false), 300);
  };

  const handleRestartGame = () => {
    startNewGame();
    setShowRestartConfirm(false);
  };

  const handleLoadSave = (slotId: string, save?: GameSave) => {
    setIsSuppressingSounds(true);
    if (save) {
      const loadedState = { ...save.state };
      // Migration for old saves missing gameType
      if (!loadedState.uiState.gameType) {
        const isDraft = loadedState.uiState.mode?.startsWith('DRAFTING') || 
                        (loadedState.uiState.draftingWallsLeft !== undefined && loadedState.uiState.draftingWallsLeft > 0) ||
                        (loadedState.uiState.draftingScore !== undefined && loadedState.uiState.draftingScore > 0);
        
        if (isDraft) {
          loadedState.uiState.gameType = 'ERA_II_DRAFT';
        } else {
          loadedState.uiState.gameType = loadedState.era === 2 ? 'ERA_II' : 'ERA_I';
        }
      }
      setGameState(loadedState);
      if (save.isGameOver) {
        scoreService.saveHighScore(loadedState);
      }
    } else {
      // Empty slot selected: Always start a new game in this slot
      const newState = initializeGame();
      setGameState(newState);
      saveService.saveGame(slotId, newState);
    }
    setCurrentSlotId(slotId);
    setShowLoadModal(false);
    setTimeout(() => setIsSuppressingSounds(false), 300);
  };

  const checkCompletion = (nextState: GameState) => {
    if (nextState.uiState.mode === 'EXCAVATE' && nextState.uiState.excavationsLeft <= 0) {
      nextState.uiState.mode = 'RESOLVING_TURN';
      const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'EXCAVATE');
      if (itemIndex !== -1) {
        const doingItem = { ...nextState.uiState.checklist[itemIndex], status: 'DONE' as const };
        nextState.uiState.checklist[itemIndex] = doingItem;
        if (doingItem.data?.gainAfter) {
          nextState.goods = addGoods(nextState.goods, doingItem.data.gainAfter);
        }
      }
    } else if ((nextState.uiState.mode === 'FURNISH_SELECT_ROOM' || nextState.uiState.mode === 'FURNISH_SELECT_SPACE') && nextState.uiState.furnishingsLeft <= 0) {
      nextState.uiState.mode = 'RESOLVING_TURN';
      const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'FURNISH');
      if (itemIndex !== -1) {
        const doingItem = { ...nextState.uiState.checklist[itemIndex], status: 'DONE' as const };
        nextState.uiState.checklist[itemIndex] = doingItem;
        if (doingItem.data?.gainAfter) {
          nextState.goods = addGoods(nextState.goods, doingItem.data.gainAfter);
        }
      }
    } else if (nextState.uiState.mode === 'ROOM_ACTION' && nextState.uiState.roomActionsLeft <= 0) {
      nextState.uiState.mode = 'RESOLVING_TURN';
      const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'ROOM_ACTION');
      if (itemIndex !== -1) {
        const doingItem = { ...nextState.uiState.checklist[itemIndex], status: 'DONE' as const };
        nextState.uiState.checklist[itemIndex] = doingItem;
        if (doingItem.data?.gainAfter) {
          nextState.goods = addGoods(nextState.goods, doingItem.data.gainAfter);
        }
      }
    } else if (nextState.uiState.mode === 'BUILD_WALL' && nextState.uiState.wallsLeft <= 0) {
      nextState.uiState.mode = 'RESOLVING_TURN';
      const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'BUILD_WALL');
      if (itemIndex !== -1) {
        const doingItem = { ...nextState.uiState.checklist[itemIndex], status: 'DONE' as const };
        nextState.uiState.checklist[itemIndex] = doingItem;
        if (doingItem.data?.gainAfter) {
          nextState.goods = addGoods(nextState.goods, doingItem.data.gainAfter);
        }
      }
    } else if (nextState.uiState.mode === 'REMOVE_WALL' && nextState.uiState.wallsToRemoveLeft <= 0) {
      nextState.uiState.mode = 'RESOLVING_TURN';
      const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'REMOVE_WALL');
      if (itemIndex !== -1) {
        const doingItem = { ...nextState.uiState.checklist[itemIndex], status: 'DONE' as const };
        nextState.uiState.checklist[itemIndex] = doingItem;
        // gainAfter is handled in handleWallClick for REMOVE_WALL because it's per-wall
      }
    }
  };

  const handleRoomClick = (roomId: string) => {
    setGameState(prev => {
      if (prev.uiState.mode === 'DRAFTING') {
        const room = prev.centralDisplay.find(r => r?.id === roomId);
        if (!room) return prev;

        // Rule: You must always have more orange Rooms than blue Rooms.
        if (room.color === 'blue') {
          const orangeRooms = prev.cave.filter(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE') && s.tile?.color === 'orange').length;
          const blueRooms = prev.cave.filter(s => s.state === 'FURNISHED' && s.tile?.color === 'blue').length;
          if (blueRooms + 1 >= orangeRooms) {
            showNotification("You must always have more orange rooms than blue rooms!", 'error');
            return prev;
          }
        }

        // Drafting cost: 0 (User requested no resource cost)
        return {
          ...prev,
          uiState: { ...prev.uiState, mode: 'DRAFTING_PLACE_ROOM', selectedRoomId: roomId }
        };
      }

      if (prev.uiState.mode === 'FURNISH_SELECT_ROOM' || prev.uiState.mode === 'FURNISH_SELECT_SPACE' || prev.uiState.mode === 'DRAFTING_PLACE_ROOM') {
        // Deselect if clicking the same room
        if ((prev.uiState.mode === 'FURNISH_SELECT_SPACE' || prev.uiState.mode === 'DRAFTING_PLACE_ROOM') && prev.uiState.selectedRoomId === roomId) {
          const nextMode = prev.uiState.mode === 'DRAFTING_PLACE_ROOM' ? 'DRAFTING' : 'FURNISH_SELECT_ROOM';
          
          return {
            ...prev,
            uiState: { ...prev.uiState, mode: nextMode, selectedRoomId: undefined }
          };
        }

        const room = prev.centralDisplay.find(r => r?.id === roomId);
        if (!room) return prev;

        // Rule: You must always have more orange Rooms than blue Rooms.
        // You may not build a blue Room if you would have an equal number of orange and blue Rooms.
        if (room.color === 'blue') {
          const orangeRooms = prev.cave.filter(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE') && s.tile?.color === 'orange').length;
          const blueRooms = prev.cave.filter(s => s.state === 'FURNISHED' && s.tile?.color === 'blue').length;
          
          if (blueRooms + 1 >= orangeRooms) {
            showNotification("You must always have more orange rooms than blue rooms! You cannot build this blue room right now.", 'error');
            return prev;
          }
        }

        const itemIndex = prev.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'FURNISH');

        // Check if user has enough resources
        const hasEnough = Object.entries(room.cost).every(([key, value]) => {
          return (prev.goods[key as keyof typeof prev.goods] || 0) >= (value as number);
        });

        if (!hasEnough) {
          showNotification(`Not enough resources to furnish ${room.name}!`, 'error');
          return prev;
        }

        return {
          ...prev,
          conversionHistory: [],
          uiState: { ...prev.uiState, mode: 'FURNISH_SELECT_SPACE', selectedRoomId: roomId }
        };
      }
      return prev;
    });
  };

  const handleDraftingDraw = () => {
    setGameState(prev => {
      if (prev.fdp1.length === 0) return prev;
      const next = { ...prev, fdp1: [...prev.fdp1], centralDisplay: [...prev.centralDisplay] };
      const drawnTile = next.fdp1.shift();
      if (drawnTile) {
        next.centralDisplay.push(drawnTile);
      }
      
      // After drawing, check if we are still stuck
      if (shouldEndDrafting(next)) {
        showNotification("Drafting complete! You can no longer place tiles.", 'success');
        next.uiState.mode = 'DRAFTING_COMPLETE';
      }

      return next;
    });
  };

  const handleSpaceClick = (spaceId: string) => {
    setGameState(prev => {
      const nextState = { 
        ...prev, 
        conversionHistory: [], 
        uiState: { ...prev.uiState, hasInteractedWithChecklist: true }, 
        cave: [...prev.cave], 
        centralDisplay: [...prev.centralDisplay], 
        goods: { ...prev.goods },
        fdp1: [...prev.fdp1],
        fdp2: [...prev.fdp2]
      };
      nextState.uiState.checklist = [...prev.uiState.checklist];

      if (prev.uiState.mode === 'EXCAVATE') {
        if (prev.uiState.excavationsLeft <= 0) return prev;

        const isUndermining = prev.uiState.activeActionTile === 'undermining';
        const accessible = getAccessibleSpaces(prev.cave, prev.walls, isUndermining, prev.era);
        if (!accessible.includes(spaceId)) return prev;

        const spaceIndex = prev.cave.findIndex(s => s.id === spaceId);
        const space = prev.cave[spaceIndex];

        // Era II entrance at (3, -1) transitions to a standard empty room after excavation.
        nextState.cave[spaceIndex] = { ...space, state: 'EMPTY', tile: undefined };

        if (space.tile) {
          nextState.centralDisplay.push(space.tile);
        }

        // Draw a new room tile from the deck and add to central display
        // If player excavate exactly one tile, a tile from FDP1/FDP2 is also drawn
        const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'EXCAVATE');
        if (itemIndex !== -1) {
          const item = nextState.uiState.checklist[itemIndex];
          if (item.data.initialCount === 1) {
            const isEraI = space.col >= 0;
            const deck = isEraI ? nextState.fdp1 : nextState.fdp2;
            
            if (deck.length > 0) {
              const drawnTile = deck.shift();
              if (drawnTile) {
                nextState.centralDisplay.push(drawnTile);
              }
              if (isEraI) nextState.fdp1 = [...deck];
              else nextState.fdp2 = [...deck];
            }
          }
        }

        nextState.uiState.excavationsLeft -= 1;
        
        if (itemIndex !== -1) {
          const doingItem = { ...nextState.uiState.checklist[itemIndex] };
          if (doingItem.data) {
            doingItem.data = { ...doingItem.data, count: nextState.uiState.excavationsLeft };
            
            // Add food bonus if space is (1,1), (3,1) or (2,-1)
            if ((space.row === 1 && space.col === 1) || (space.row === 3 && space.col === 1) || (space.row === 2 && space.col === -1)) {
              doingItem.data.gainAfter = { 
                ...(doingItem.data.gainAfter || {}), 
                food: (doingItem.data.gainAfter?.food || 0) + 1 
              };
            }
            // Add ore bonus if space is (2,-2)
            if (space.row === 2 && space.col === -2) {
              doingItem.data.gainAfter = { 
                ...(doingItem.data.gainAfter || {}), 
                ore: (doingItem.data.gainAfter?.ore || 0) + 1 
              };
            }
          }
          nextState.uiState.checklist[itemIndex] = doingItem;
        }

        checkCompletion(nextState);
        return nextState;
      } 
      
      if (prev.uiState.mode === 'DRAFTING_PLACE_ROOM') {
        const spaceIndex = prev.cave.findIndex(s => s.id === spaceId);
        const space = prev.cave[spaceIndex];

        if (space.state !== 'EMPTY' && space.state !== 'CROSSED_PICKAXES') return prev;
        if (!prev.uiState.selectedRoomId) return prev;

        const roomIndex = prev.centralDisplay.findIndex(r => r?.id === prev.uiState.selectedRoomId);
        if (roomIndex === -1) return prev;

        const roomToPlace = prev.centralDisplay[roomIndex]!;
        
        if (!isValidRoomPlacement(space, prev.walls, roomToPlace.wallRequirement)) {
          showNotification("Wall requirements not met for this room!", 'error');
          return prev;
        }

        nextState.cave[spaceIndex] = { ...space, state: 'FURNISHED', tile: roomToPlace };
        nextState.centralDisplay.splice(roomIndex, 1);
        
        // Draw a new tile from FDP1
        if (nextState.fdp1.length > 0) {
          const drawnTile = nextState.fdp1.shift();
          if (drawnTile) {
            nextState.centralDisplay.push(drawnTile);
          }
        }

        nextState.uiState.mode = 'DRAFTING';
        nextState.uiState.draftingScore += roomToPlace.vp;
        nextState.uiState.selectedRoomId = undefined;

        // Check if drafting should end
        if (shouldEndDrafting(nextState)) {
          showNotification("Drafting complete! You can no longer place tiles.", 'success');
          nextState.uiState.mode = 'DRAFTING_COMPLETE';
        }

        return nextState;
      }

      if (prev.uiState.mode === 'FURNISH_SELECT_SPACE') {
        const spaceIndex = prev.cave.findIndex(s => s.id === spaceId);
        const space = prev.cave[spaceIndex];

        if (space.state !== 'EMPTY' && space.state !== 'CROSSED_PICKAXES') return prev;
        if (!prev.uiState.selectedRoomId) return prev;

        const roomIndex = prev.centralDisplay.findIndex(r => r?.id === prev.uiState.selectedRoomId);
        if (roomIndex === -1) return prev;

        const roomToPlace = prev.centralDisplay[roomIndex];
        if (!roomToPlace) return prev;
        
        // Validate wall requirements
        if (!isValidRoomPlacement(space, prev.walls, roomToPlace.wallRequirement)) {
          return prev;
        }

        // Deduct cost
        const itemIndex = prev.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'FURNISH');
        const isFree = itemIndex !== -1 && prev.uiState.checklist[itemIndex].data?.freeFurnish;
        if (!isFree) {
          nextState.goods = subtractGoods(nextState.goods, roomToPlace.cost);
        }

        // Remove from display
        if (settingsState.fixTileLocations) {
          nextState.centralDisplay[roomIndex] = null;
        } else {
          nextState.centralDisplay.splice(roomIndex, 1);
        }

        // Add to cave
        nextState.cave[spaceIndex] = { ...space, state: 'FURNISHED', tile: roomToPlace };

        if (roomToPlace.trigger === 'immediate') {
          if (roomToPlace.id === 'parlor') {
            nextState.goods = addGoods(nextState.goods, { food: 2 });
          } else if (roomToPlace.id === 'supply_room') {
            nextState.goods = addGoods(nextState.goods, { wood: 1, stone: 1, emmer: 1, flax: 1 });
          } else if (roomToPlace.id === 'dining_room') {
            nextState.goods = addGoods(nextState.goods, { food: 3 });
          } else if (roomToPlace.id === 'guest_room') {
            nextState.goods = addGoods(nextState.goods, { gold: 2 });
          } else if (roomToPlace.id === 'builders_parlor') {
            nextState.uiState.checklist.unshift({
              id: `builders_parlor_${Date.now()}`,
              text: 'Build up to 2 Walls',
              status: 'TODO',
              actionType: 'BUILD_WALL',
              optional: true,
              data: { count: 2 }
            });
          }
        }

        nextState.uiState.furnishingsLeft -= 1;
        
        const furnishItemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'FURNISH');
        if (furnishItemIndex !== -1) {
          const doingItem = { ...nextState.uiState.checklist[furnishItemIndex] };
          if (doingItem.data) {
            doingItem.data = { ...doingItem.data, count: nextState.uiState.furnishingsLeft };
          }
          nextState.uiState.checklist[furnishItemIndex] = doingItem;
        }

        if (nextState.uiState.furnishingsLeft > 0) {
          nextState.uiState.mode = 'FURNISH_SELECT_ROOM';
        }
        nextState.uiState.selectedRoomId = undefined;

        // Check for Additional Cavern
        if (!nextState.hasAdditionalCavern) {
          const initialCaveSpaces = nextState.cave.filter(s => s.row < 5 && s.col < 3);
          const allFilled = initialCaveSpaces.every(s => s.state === 'FURNISHED' || s.state === 'ENTRANCE');
          if (allFilled) {
            nextState.uiState.showAdditionalCavernChoice = true;
          }
        }

        checkCompletion(nextState);
        return nextState;
      }

      if (prev.uiState.mode === 'ROOM_ACTION') {
        const spaceIndex = prev.cave.findIndex(s => s.id === spaceId);
        const space = prev.cave[spaceIndex];

        const isFurnishedAction = space.state === 'FURNISHED' && space.tile?.trigger === 'action';
        const isEntranceAction = space.state === 'ENTRANCE' && space.tile?.trigger === 'action';

        if (!isFurnishedAction && !isEntranceAction) {
          return prev;
        }

        if (nextState.uiState.activatedRoomsThisTurn.includes(spaceId)) {
          showNotification("This room has already been activated this turn!", 'error');
          return prev;
        }

        // Apply room action effect
        const newItems = getRoomActionChecklistItems(space.tile.id, prev.cave);
        
        if (newItems.length > 0) {
          // Insert new items right after the current ROOM_ACTION item
          const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'ROOM_ACTION');
          if (itemIndex !== -1) {
            nextState.uiState.checklist.splice(itemIndex + 1, 0, ...newItems);
          } else {
            nextState.uiState.checklist.unshift(...newItems);
          }
        } else {
          showNotification(`Action for ${space.tile.name} not implemented yet.`, 'info');
          return prev;
        }

        nextState.uiState.roomActionsLeft -= 1;
        nextState.uiState.activatedRoomsThisTurn = [...nextState.uiState.activatedRoomsThisTurn, spaceId];
        
        const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'ROOM_ACTION');
        if (itemIndex !== -1) {
          const doingItem = { ...nextState.uiState.checklist[itemIndex] };
          if (doingItem.data) {
            doingItem.data = { ...doingItem.data, count: nextState.uiState.roomActionsLeft };
          }
          nextState.uiState.checklist[itemIndex] = doingItem;
        }

        checkCompletion(nextState);
        return nextState;
      }

      return prev;
    });
  };

  const handleWallClick = (wallId: string) => {
    const isDraftingMode = gameState.uiState.mode === 'DRAFTING' || gameState.uiState.mode === 'DRAFTING_PLACE_ROOM';
    if (gameState.uiState.mode !== 'BUILD_WALL' && gameState.uiState.mode !== 'REMOVE_WALL' && !isDraftingMode) return;

    setGameState(prev => {
      const nextState = { ...prev, conversionHistory: [], uiState: { ...prev.uiState, hasInteractedWithChecklist: true } };
      
      if (prev.uiState.mode === 'BUILD_WALL' || prev.uiState.mode === 'DRAFTING' || prev.uiState.mode === 'DRAFTING_PLACE_ROOM') {
        if (wallId === '3,-1-3,0' || wallId === '3,-1-4,-1') {
          showNotification("You cannot build a wall at the entrance!", 'error');
          return prev;
        }
        if (nextState.walls.includes(wallId)) return prev;

        if (isDraftingMode) {
          if (nextState.uiState.draftingWallsLeft <= 0) {
            showNotification("No drafting walls left!", 'error');
            return prev;
          }
        }
        
        const maxWalls = nextState.era === 1 ? MAX_WALLS_ERA_I : MAX_WALLS_ERA_II;
        
        if (nextState.walls.length >= maxWalls) {
          showNotification(`Maximum of ${maxWalls} walls reached! You cannot build any more walls.`, 'error');
          return prev;
        }

        nextState.walls = [...nextState.walls, wallId];
        
        if (nextState.walls.length === maxWalls) {
          showNotification(`You have built your ${maxWalls === 7 ? '7th' : '10th'} and final wall!`, 'success');
        }

        if (isDraftingMode) {
          nextState.uiState.draftingWallsLeft -= 1;
          
          // Check if drafting should end (building a wall might enable/disable placements)
          if (nextState.uiState.mode === 'DRAFTING' && shouldEndDrafting(nextState)) {
            showNotification("Drafting complete! You can no longer place tiles.", 'success');
            nextState.uiState.mode = 'DRAFTING_COMPLETE';
          }
          
          return nextState;
        }

        nextState.uiState.wallsLeft -= 1;

        const checklist = [...nextState.uiState.checklist];
        const itemIndex = checklist.findIndex(i => i.actionType === 'BUILD_WALL' && i.status === 'DOING');
        
        if (itemIndex !== -1) {
          const buildWallItem = { ...checklist[itemIndex] };
          buildWallItem.data = { ...buildWallItem.data, count: nextState.uiState.wallsLeft };

          // Dungeon: Each time you build a wall, also gain 2 gold.
          const hasDungeon = nextState.cave.some(s => s.state === 'FURNISHED' && s.tile?.id === 'dungeon');
          if (hasDungeon) {
            if (!buildWallItem.passiveGains) buildWallItem.passiveGains = [];
            buildWallItem.passiveGains.push({
              name: 'Dungeon',
              goods: { gold: 2 }
            });
          }
          checklist[itemIndex] = buildWallItem;
        }
        
        nextState.uiState.checklist = checklist;
        checkCompletion(nextState);
        return nextState;
      } else if (prev.uiState.mode === 'REMOVE_WALL') {
        if (!nextState.walls.includes(wallId)) return prev;

        nextState.walls = nextState.walls.filter(w => w !== wallId);
        nextState.uiState.wallsToRemoveLeft -= 1;

        const checklist = [...nextState.uiState.checklist];
        const itemIndex = checklist.findIndex(i => i.actionType === 'REMOVE_WALL' && i.status === 'DOING');
        
        if (itemIndex !== -1) {
          const item = checklist[itemIndex];
          if (item.data?.gainAfter) {
            nextState.goods = addGoods(nextState.goods, item.data.gainAfter);
          }
          checklist[itemIndex] = { 
            ...item, 
            data: { ...item.data, count: nextState.uiState.wallsToRemoveLeft } 
          };
        }
        
        nextState.uiState.checklist = checklist;
        checkCompletion(nextState);
        return nextState;
      }

      return nextState;
    });
  };

  const accessibleSpaces = gameState.uiState.mode === 'EXCAVATE' ? getAccessibleSpaces(gameState.cave, gameState.walls, gameState.uiState.activeActionTile === 'undermining', gameState.era) : [];

  const handleUndoAction = () => {
    console.log("Attempting to undo action. Snapshot exists:", !!gameState.uiState.undoSnapshot);
    if (gameState.uiState.undoSnapshot) {
      const nextState = JSON.parse(gameState.uiState.undoSnapshot);
      nextState.conversionHistory = [];
      if (nextState.uiState) {
        nextState.uiState.undoSnapshot = undefined;
      }
      setGameState(nextState);
      showNotification("Action undone", 'success');
    }
  };

  const handleExchange = (from: keyof GoodsState, to: keyof GoodsState) => {
    setGameState(prev => {
      if (prev.goods[from] <= 0) return prev;
      
      // Enforce max limits from constants
      const limit = (to === 'gold' || to === 'weapons') ? MAX_GOLD_WEAPON_LIMIT : MAX_RESOURCE_LIMIT;
      if (prev.goods[to] >= limit) {
        showNotification(`${to.charAt(0).toUpperCase() + to.slice(1)} is already at maximum capacity`, 'error');
        return prev;
      }

      const nextState = { ...prev, goods: { ...prev.goods } };
      nextState.goods[from] -= 1;
      nextState.goods[to] += 1;
      nextState.conversionHistory = [...prev.conversionHistory, from];
      return nextState;
    });
  };

  const handleUndoConversion = () => {
    setGameState(prev => {
      if (prev.conversionHistory.length === 0) return prev;
      const nextHistory = [...prev.conversionHistory];
      const lastFrom = nextHistory.pop()!;
      
      // Enforce max limits from constants when undoing
      const limit = (lastFrom === 'gold' || lastFrom === 'weapons') ? MAX_GOLD_WEAPON_LIMIT : MAX_RESOURCE_LIMIT;
      if (prev.goods[lastFrom] >= limit) {
        showNotification(`Cannot undo: ${lastFrom.charAt(0).toUpperCase() + lastFrom.slice(1)} is already at maximum capacity`, 'error');
        return prev;
      }

      const nextState = { ...prev, goods: { ...prev.goods }, conversionHistory: nextHistory };
      nextState.goods[lastFrom] += 1;
      nextState.goods.food -= 1;
      return nextState;
    });
  };

  const handleCancelItem = () => {
    setGameState(prev => {
      const nextState = { ...prev, conversionHistory: [], uiState: { ...prev.uiState }, goods: { ...prev.goods } };
      const checklist = [...nextState.uiState.checklist];
      const itemIndex = checklist.findIndex(i => i.status === 'DOING');
      
      if (itemIndex !== -1) {
        const item = checklist[itemIndex];
        // Refund payBefore if it exists
        if (item.data?.payBefore) {
          nextState.goods = addGoods(nextState.goods, item.data.payBefore);
        }
        checklist[itemIndex] = { ...item, status: 'TODO' };

        // Restore exclusive group items
        if (item.exclusiveGroup) {
          checklist.forEach((checkItem, idx) => {
            if (checkItem.id !== item.id && checkItem.exclusiveGroup === item.exclusiveGroup && checkItem.status === 'SKIPPED') {
              checklist[idx] = { ...checkItem, status: 'TODO' };
            }
          });
        }
      }
      
      nextState.uiState.checklist = checklist;
      nextState.uiState.mode = 'RESOLVING_TURN';
      nextState.uiState.excavationsLeft = 0;
      nextState.uiState.furnishingsLeft = 0;
      nextState.uiState.roomActionsLeft = 0;
      nextState.uiState.wallsLeft = 0;
      nextState.uiState.wallsToRemoveLeft = 0;
      nextState.uiState.dynamicCostAmount = 0;
      nextState.uiState.selectedRoomId = undefined;
      
      return nextState;
    });
  };

  const selectedRoomTile = gameState.uiState.selectedRoomId 
    ? gameState.centralDisplay.find(r => r?.id === gameState.uiState.selectedRoomId) 
    : undefined;

  const isDraftingMode = gameState.uiState.mode === 'DRAFTING' || gameState.uiState.mode === 'DRAFTING_PLACE_ROOM' || gameState.uiState.mode === 'DRAFTING_COMPLETE';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-8 font-sans flex flex-col">
      <div className="max-w-[1570px] mx-auto w-full space-y-6 flex-1 flex flex-col">
        {gameState.uiState.showScoreSummary && (
          <ScoreSummary 
            gameState={gameState} 
            onPlayAgain={startNewGame} 
            onClose={() => setGameState(prev => ({ ...prev, uiState: { ...prev.uiState, showScoreSummary: false } }))}
            onContinueToEraII={transitionToEraII}
            userRole={userRole}
          />
        )}
        {gameState.uiState.mode === 'PAY_DYNAMIC' && (
          <SelectGoodsModal
            goods={gameState.goods}
            amount={gameState.uiState.dynamicCostAmount}
            mustBeDifferent={true} // Junction Room requires different goods
            exclude={gameState.uiState.checklist.find(i => i.status === 'DOING' && i.actionType === 'PAY_DYNAMIC')?.data?.exclude}
            onConfirm={(selected) => {
              setGameState(prev => {
                const nextState = { ...prev };
                nextState.goods = subtractGoods(nextState.goods, selected);
                
                const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'PAY_DYNAMIC');
                if (itemIndex !== -1) {
                  const item = nextState.uiState.checklist[itemIndex];
                  nextState.uiState.checklist[itemIndex] = { ...item, status: 'DONE' };
                  
                  if (item.data?.gainAfter) {
                    if (item.data.replenishUpToGainAfter) {
                      const diff: Partial<typeof nextState.goods> = {};
                      for (const key of Object.keys(item.data.gainAfter)) {
                        const k = key as keyof GoodsState;
                        const target = (item.data.gainAfter as Record<string, number>)[key];
                        const current = nextState.goods[k] || 0;
                        if (current < target) {
                          diff[k] = target - current;
                        }
                      }
                      nextState.goods = addGoods(nextState.goods, diff);
                    } else {
                      nextState.goods = addGoods(nextState.goods, item.data.gainAfter);
                    }
                  }
                }
                
                nextState.uiState.mode = 'RESOLVING_TURN';
                return nextState;
              });
            }}
            onCancel={handleCancelItem}
          />
        )}
        <header className="border-b border-stone-700 pb-4 flex justify-between items-end shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-orange-400 tracking-tight">Caverna: Cave vs Cave</h1>
            <p className="text-stone-400">Solo Implementation</p>
          </div>
          <div className="flex items-center gap-4">
            {isSaving && (
              <div className="flex items-center gap-2 text-stone-500 text-[10px] uppercase font-bold tracking-widest animate-game-pulse">
                <div className="w-1.5 h-1.5 bg-stone-500 rounded-full"></div>
                Saving...
              </div>
            )}
            <button 
              onClick={() => setShowRestartConfirm(true)}
              className="text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded border border-stone-600 transition-colors"
            >
              New Game
            </button>

            {user && (
              <button 
                onClick={() => setShowLoadModal(true)}
                className="flex items-center gap-2 text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded border border-stone-600 transition-colors"
              >
                <Clock className="w-4 h-4 text-stone-400" />
                Load Game
              </button>
            )}

            <button 
              onClick={() => setGameState(prev => ({ ...prev, uiState: { ...prev.uiState, showScoreSummary: true } }))}
              className="flex items-center gap-2 text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded border border-stone-600 transition-colors"
            >
              <History className="w-4 h-4 text-orange-400" />
              High Scores
            </button>
            
            {user ? (
              <div className="flex items-center gap-2 bg-stone-800 p-1.5 rounded-full border border-stone-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 bg-stone-700 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-stone-400" />
                  </div>
                )}
                <button 
                  onClick={logout}
                  className="text-stone-400 hover:text-red-400 transition-colors pr-1"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded border border-stone-600 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-col gap-6 flex-1 overflow-hidden">
          {/* Top Stripe: Action Board */}
          <section className="shrink-0 flex gap-6 max-w-full w-full">
            <div className="flex-1 min-w-0">
              <ActionBoard 
                board={gameState.actionBoard} 
                activeActionTile={gameState.uiState.activeActionTile}
                showIconicDescription={gameState.uiState.showIconicDescription}
                disabled={gameState.uiState.mode !== 'IDLE'}
                era={gameState.era}
                onTakeAction={handleTakeAction} 
              />
            </div>
          </section>

          {/* Bottom Area: Cave (Center) + Checklist (Middle) + Display (Right) */}
          <section className="flex flex-col xl:flex-row items-stretch flex-1 overflow-hidden gap-4">
            <div className="flex-1 overflow-auto pb-8 space-y-4 flex flex-col h-full">
              {isDraftingMode && (
                <div className="bg-orange-600/20 border border-orange-500/30 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">Drafting Phase</span>
                    <span className="text-white text-lg font-bold">Draft Era I rooms to reach 42 VP</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {isDraftingMode && gameState.uiState.mode !== 'DRAFTING_COMPLETE' && !canPlaceAnyVisibleTiles(gameState) && gameState.uiState.draftingWallsLeft === 0 && gameState.fdp1.length > 0 && (
                      <button
                        onClick={handleDraftingDraw}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
                      >
                        <Pickaxe className="w-4 h-4" />
                        Stuck? Draw New Tile
                      </button>
                    )}
                    <div className="flex flex-col items-center">
                      <span className="text-stone-400 text-[10px] uppercase">Walls Left</span>
                      <span className="text-orange-400 text-2xl font-black">{gameState.uiState.draftingWallsLeft}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-stone-400 text-[10px] uppercase">Current VP</span>
                      <span className="text-orange-400 text-2xl font-black">{gameState.uiState.draftingScore} / 42</span>
                    </div>
                    {(gameState.uiState.mode === 'DRAFTING_COMPLETE' || gameState.uiState.draftingScore >= 42) && (
                      <button
                        onClick={transitionToEraII}
                        className="bg-orange-500 hover:bg-orange-400 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all animate-bounce"
                      >
                        Finish Drafting & Start Era II
                      </button>
                    )}
                  </div>
                </div>
              )}
              <CaveBoard 
                cave={gameState.cave} 
                walls={gameState.walls}
                isExcavating={gameState.uiState.mode === 'EXCAVATE'}
                isFurnishing={gameState.uiState.mode === 'FURNISH_SELECT_SPACE' || gameState.uiState.mode === 'DRAFTING_PLACE_ROOM'}
                isRoomAction={gameState.uiState.mode === 'ROOM_ACTION'}
                isBuildingWall={gameState.uiState.mode === 'BUILD_WALL' || (isDraftingMode && gameState.uiState.draftingWallsLeft > 0)}
                isRemovingWall={gameState.uiState.mode === 'REMOVE_WALL'}
                accessibleSpaces={accessibleSpaces}
                selectedRoomTile={selectedRoomTile}
                activatedRoomsThisTurn={gameState.uiState.activatedRoomsThisTurn}
                showIconicDescription={gameState.uiState.showIconicDescription}
                onSpaceClick={handleSpaceClick}
                onWallClick={handleWallClick}
              >
                <GoodsTrack 
                  goods={gameState.goods} 
                  onExchange={handleExchange} 
                  onUndoExchange={handleUndoConversion}
                  canUndoExchange={gameState.conversionHistory.length > 0}
                  era={gameState.era}
                  muted={settingsState.isMuted}
                  suppressSounds={isSuppressingSounds}
                />
              </CaveBoard>
            </div>

            <div className="flex-none w-[620px] overflow-auto pb-8 h-full">
              <CentralDisplay 
                tiles={gameState.centralDisplay} 
                goods={gameState.goods}
                cave={gameState.cave}
                walls={gameState.walls}
                isSelectable={gameState.uiState.mode === 'FURNISH_SELECT_ROOM' || gameState.uiState.mode === 'FURNISH_SELECT_SPACE' || isDraftingMode}
                isDrafting={isDraftingMode}
                selectedRoomId={gameState.uiState.selectedRoomId}
                showIconicDescription={gameState.uiState.showIconicDescription}
                highlightFurnishable={gameState.uiState.highlightFurnishable}
                fixTileLocations={settingsState.fixTileLocations}
                isChecklistCollapsed={isChecklistCollapsed}
                checklistLength={gameState.uiState.checklist.length}
                fdp1Count={gameState.fdp1.length}
                fdp2Count={gameState.fdp2.length}
                era={gameState.era}
                onRoomClick={handleRoomClick}
                onToggleHighlight={handleToggleHighlight}
                onToggleFixTileLocations={() => setSettingsState(prev => ({ ...prev, fixTileLocations: !prev.fixTileLocations }))}
                onToggleChecklist={() => setIsChecklistCollapsed(!isChecklistCollapsed)}
                onUndo={
                  gameState.uiState.mode === 'FURNISH_SELECT_SPACE'
                    ? () => setGameState(prev => ({...prev, uiState: {...prev.uiState, mode: 'FURNISH_SELECT_ROOM', selectedRoomId: undefined}}))
                    : (['EXCAVATE', 'ROOM_ACTION', 'BUILD_WALL', 'REMOVE_WALL', 'PAY_DYNAMIC', 'FURNISH_SELECT_ROOM'].includes(gameState.uiState.mode) ? handleCancelItem : handleUndoAction)
                }
                canUndo={!!gameState.uiState.undoSnapshot || (['EXCAVATE', 'ROOM_ACTION', 'BUILD_WALL', 'REMOVE_WALL', 'PAY_DYNAMIC', 'FURNISH_SELECT_ROOM', 'FURNISH_SELECT_SPACE'].includes(gameState.uiState.mode))}
              >
                <ChecklistUI 
                  checklist={gameState.uiState.checklist}
                  goods={gameState.goods}
                  showIconicDescription={gameState.uiState.showIconicDescription}
                  isCollapsed={isChecklistCollapsed}
                  onExecute={handleExecuteChecklist}
                  onSkip={handleSkipChecklist}
                  onChoose={handleChooseChecklist}
                  onFinishTurn={handleFinishTurn}
                  onUndoAction={handleUndoAction}
                  canUndoAction={!!gameState.uiState.undoSnapshot}
                  onToggle={() => setIsChecklistCollapsed(!isChecklistCollapsed)}
                  onCancel={
                    gameState.uiState.mode === 'FURNISH_SELECT_SPACE'
                      ? () => setGameState(prev => ({...prev, uiState: {...prev.uiState, mode: 'FURNISH_SELECT_ROOM', selectedRoomId: undefined}}))
                      : (['EXCAVATE', 'ROOM_ACTION', 'BUILD_WALL', 'REMOVE_WALL', 'PAY_DYNAMIC', 'FURNISH_SELECT_ROOM'].includes(gameState.uiState.mode) ? handleCancelItem : undefined)
                  }
                />
              </CentralDisplay>
            </div>
          </section>
        </main>
      </div>
      <SettingsPanel 
        settingsState={settingsState} 
        setSettingsState={setSettingsState} 
        gameState={gameState} 
        setGameState={setGameState}
        onTransitionToEraII={transitionToEraII}
      />
      {gameState.uiState.showAdditionalCavernChoice && (
        <AdditionalCavernModal 
          onSelect={handleSelectAdditionalCavern} 
          onClose={handleCloseAdditionalCavern}
        />
      )}
      {showLoadModal && (
        <LoadGameModal 
          currentSlotId={currentSlotId}
          onLoad={handleLoadSave}
          onClose={() => setShowLoadModal(false)}
        />
      )}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3 ${
            notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' :
            notification.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' :
            'bg-stone-800/90 border-orange-500/50 text-stone-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'success' ? 'bg-green-500' :
              'bg-orange-500'
            }`} />
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </div>
        </div>
      )}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4">
          <div className="bg-stone-800 border-2 border-stone-600 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-stone-100 mb-4 text-center">Start New Game?</h3>
            <p className="text-stone-400 mb-8 text-center text-sm">
              Current progress will be lost. Choose your starting era:
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={handleRestartGame}
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors shadow-lg flex flex-col items-center border border-orange-400/30"
              >
                <span>Start from Era I</span>
                <span className="text-[10px] opacity-80 font-normal text-orange-100">The Stone Age (Standard)</span>
              </button>
              <button
                onClick={() => {
                  startDrafting();
                  setShowRestartConfirm(false);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg flex flex-col items-center border border-blue-400/30"
              >
                <span>Draft for Era II</span>
                <span className="text-[10px] opacity-80 font-normal text-blue-100">The Iron Age (Advanced)</span>
              </button>
              <div className="h-px bg-stone-700 my-2" />
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
