import React, { useState, useEffect, useRef } from 'react';
import { GameState, CaveSpace, ActionBoardState, ChecklistItem, GoodsState, RoomTile } from './types/game';
import { ROOM_TILES_MAP, ROOM_TILES } from './data/roomTiles';
import { setupSoloActionBoard } from './data/actionTiles';
import { GoodsTrack } from './components/GoodsTrack';
import { CaveBoard } from './components/CaveBoard';
import { ActionBoard } from './components/ActionBoard';
import { CentralDisplay } from './components/CentralDisplay';
import { ChecklistUI } from './components/ChecklistUI';
import { ScoreSummary } from './components/ScoreSummary';
import { auth, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { incrementVisits } from './services/statsService';
import { LogIn, LogOut, User as UserIcon, Trophy, History, Clock } from 'lucide-react';
import { SettingsPanel, SettingsState } from './components/Settings';
import { SelectGoodsModal } from './components/SelectGoodsModal';
import { AdditionalCavernModal } from './components/AdditionalCavernModal';
import { LoadGameModal } from './components/LoadGameModal';
import { saveService, GameSave } from './services/saveService';
import { userService } from './services/userService';
import { scoreService } from './services/scoreService';
import { generateChecklistForAction, getRoomActionChecklistItems } from './utils/checklist';
import { isValidRoomPlacement } from './utils/walls';

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

function getAccessibleSpaces(cave: CaveSpace[], walls: string[], isUndermining: boolean): string[] {
  const entrance = cave.find(c => c.state === 'ENTRANCE');
  if (!entrance) return [];

  const reachableOpenSpaces = new Set<string>();
  const queue: CaveSpace[] = [entrance];
  reachableOpenSpaces.add(entrance.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = cave.filter(c => {
      const dx = Math.abs(c.col - current.col);
      const dy = Math.abs(c.row - current.row);
      return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    });

    for (const neighbor of neighbors) {
      if (reachableOpenSpaces.has(neighbor.id)) continue;
      
      if (['ENTRANCE', 'EMPTY', 'FURNISHED', 'CROSSED_PICKAXES'].includes(neighbor.state)) {
        if (isUndermining || !hasWallBetween(current.row, current.col, neighbor.row, neighbor.col, walls)) {
          reachableOpenSpaces.add(neighbor.id);
          queue.push(neighbor);
        }
      }
    }
  }

  const accessibleIds: string[] = [];
  for (const space of cave) {
    if (space.state === 'FACE_DOWN') {
      const neighbors = cave.filter(c => {
        const dx = Math.abs(c.col - space.col);
        const dy = Math.abs(c.row - space.row);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
      });

      const isAccessible = neighbors.some(open => {
        if (!reachableOpenSpaces.has(open.id)) return false;
        if (!isUndermining && hasWallBetween(space.row, space.col, open.row, open.col, walls)) return false;
        return true;
      });

      if (isAccessible) {
        accessibleIds.push(space.id);
      }
    }
  }
  return accessibleIds;
}

function addGoods(current: GameState['goods'], gains: Partial<GameState['goods']>): GameState['goods'] {
  const next = { ...current };
  for (const key in gains) {
    const k = key as keyof GameState['goods'];
    const limit = k === 'gold' ? 19 : 9;
    next[k] = Math.min(limit, next[k] + (gains[k] || 0));
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

function initializeGame(): GameState {
  // 3 out of the 6 unexcavatable rooms (tile 1-6) are randomly selected and removed from the game.
  // The remaining 3 are placed in the central display during initial setup.
  const unexcavatable = ROOM_TILES.slice(0, 6);
  const shuffledUnexcavatable = [...unexcavatable].sort(() => Math.random() - 0.5);
  const removedUnexcavatable = shuffledUnexcavatable.slice(0, 3);
  const displayUnexcavatable = shuffledUnexcavatable.slice(3, 6);
  
  const otherTiles = ROOM_TILES.slice(6);
  const shuffledOther = [...otherTiles].sort(() => Math.random() - 0.5);

  const initialCave: CaveSpace[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (col === 2 && row !== 4) continue; // Skip the empty spaces in the top right

      let state: CaveSpace['state'] = 'FACE_DOWN';
      let tile = undefined;

      if (row === 3 && col === 0) {
        state = 'ENTRANCE';
        tile = ROOM_TILES_MAP.caveEntrance;
      } else if (row === 2 && col === 0) {
        state = 'CROSSED_PICKAXES';
      } else {
        tile = shuffledOther.pop(); // Take 10 tiles for the cave
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
      gold: 1
    },
    cave: initialCave,
    walls: [],
    actionBoard: initialActionBoard,
    centralDisplay: displayUnexcavatable, // The 3 remaining unexcavatable tiles
    roomTileDeck: shuffledOther, // Remaining 8 in the deck
    hasAdditionalCavern: false,
    uiState: {
      mode: 'IDLE',
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
      showScoreSummary: false
    },
    conversionHistory: [],
    gameId: '',
    cheatsUsed: false
  };
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [settingsState, setSettingsState] = useState<SettingsState>({
    fixTileLocations: true
  });
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoExecutedRef = useRef<Set<string>>(new Set());
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
    // Generate gameId if it's a new game (Round 1, Turn 1) and ID is empty
    if (gameState.actionBoard.round === 1 && gameState.actionBoard.turn === 1 && !gameState.gameId) {
      setGameState(prev => ({
        ...prev,
        gameId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }));
    }
  }, [gameState.actionBoard.round, gameState.actionBoard.turn, gameState.gameId]);

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
          undoSnapshot: JSON.stringify(prev)
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
        uiState: { 
          ...prev.uiState, 
          showAdditionalCavernChoice: false,
          isTriggeredByCheat: false
        }
      };

      const openSides: ('top' | 'bottom' | 'left' | 'right')[] = [];
      if (walls === 2) {
        // 2 adjacent walls (e.g., top and left are natural, so bottom and right are open)
        openSides.push('bottom', 'right');
      } else {
        // 3 walls (e.g., top, left, right are natural, so bottom is open)
        openSides.push('bottom');
      }

      nextState.cave.push({
        id: 'additional-cavern',
        row: 4,
        col: 4,
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

  const handleExecuteChecklist = (id: string, isManual: boolean = true) => {
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
        const accessible = getAccessibleSpaces(next.cave, next.walls, isUndermining);
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
        if (newRound < board.totalRounds) {
          newRound++;
          newTurn = 1;
          const nextAction = newFuture.shift();
          if (nextAction) {
            newAvailable.push(nextAction);
          }
          
          // Determine max turns for the new round
          if (newRound <= 3) {
            newMaxTurns = 2;
          } else if (newRound <= 6) {
            newMaxTurns = 3;
          } else {
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
        mode: nextMode,
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
        showScoreSummary: nextMode === 'GAME_OVER'
      };

      if (nextMode === 'GAME_OVER') {
        scoreService.saveHighScore(nextState);
      }

      // Auto-save if logged in
      if (user) {
        setIsSaving(true);
        const performSave = async (slotId: string) => {
          await saveService.saveGame(slotId, nextState);
          setIsSaving(false);
        };

        if (currentSlotId) {
          performSave(currentSlotId);
        } else {
          // Find slot on the fly if missing
          saveService.findOpenSlot().then(slotId => {
            setCurrentSlotId(slotId);
            performSave(slotId);
          });
        }
      }

      return nextState;
    });
  };

  const startNewGame = () => {
    const newState = initializeGame();
    setGameState(newState);
    // If logged in, we should probably save the new state to the current slot
    if (user && currentSlotId) {
      saveService.saveGame(currentSlotId, newState);
    }
  };

  const handleRestartGame = () => {
    startNewGame();
    setShowRestartConfirm(false);
  };

  const handleLoadSave = (slotId: string, save?: GameSave) => {
    if (save) {
      setGameState(save.state);
      if (save.isGameOver) {
        scoreService.saveHighScore(save.state);
      }
    } else {
      // Empty slot selected: Always start a new game in this slot
      const newState = initializeGame();
      setGameState(newState);
      saveService.saveGame(slotId, newState);
    }
    setCurrentSlotId(slotId);
    setShowLoadModal(false);
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
      if (prev.uiState.mode === 'FURNISH_SELECT_ROOM' || prev.uiState.mode === 'FURNISH_SELECT_SPACE') {
        // Deselect if clicking the same room
        if (prev.uiState.mode === 'FURNISH_SELECT_SPACE' && prev.uiState.selectedRoomId === roomId) {
          return {
            ...prev,
            uiState: { ...prev.uiState, mode: 'FURNISH_SELECT_ROOM', selectedRoomId: undefined }
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

  const handleSpaceClick = (spaceId: string) => {
    setGameState(prev => {
      const nextState = { ...prev, conversionHistory: [], uiState: { ...prev.uiState, hasInteractedWithChecklist: true }, cave: [...prev.cave], centralDisplay: [...prev.centralDisplay], goods: { ...prev.goods } };
      nextState.uiState.checklist = [...prev.uiState.checklist];

      if (prev.uiState.mode === 'EXCAVATE') {
        if (prev.uiState.excavationsLeft <= 0) return prev;

        const isUndermining = prev.uiState.activeActionTile === 'undermining';
        const accessible = getAccessibleSpaces(prev.cave, prev.walls, isUndermining);
        if (!accessible.includes(spaceId)) return prev;

        const spaceIndex = prev.cave.findIndex(s => s.id === spaceId);
        const space = prev.cave[spaceIndex];

        nextState.cave[spaceIndex] = { ...space, state: 'EMPTY', tile: undefined };

        if (space.tile) {
          nextState.centralDisplay.push(space.tile);
        }

        // Draw a new room tile from the deck and add to central display
        if (nextState.roomTileDeck.length > 0) {
          const drawnTile = nextState.roomTileDeck.shift();
          if (drawnTile) {
            nextState.centralDisplay.push(drawnTile);
          }
        }

        nextState.uiState.excavationsLeft -= 1;
        
        const itemIndex = nextState.uiState.checklist.findIndex(i => i.status === 'DOING' && i.actionType === 'EXCAVATE');
        if (itemIndex !== -1) {
          const doingItem = { ...nextState.uiState.checklist[itemIndex] };
          if (doingItem.data) {
            doingItem.data = { ...doingItem.data, count: nextState.uiState.excavationsLeft };
            
            // Add food bonus if space is (1,1) or (3,1)
            if ((space.row === 1 && space.col === 1) || (space.row === 3 && space.col === 1)) {
              doingItem.data.gainAfter = { 
                ...(doingItem.data.gainAfter || {}), 
                food: (doingItem.data.gainAfter?.food || 0) + 1 
              };
            }
          }
          nextState.uiState.checklist[itemIndex] = doingItem;
        }

        checkCompletion(nextState);
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
    if (gameState.uiState.mode !== 'BUILD_WALL' && gameState.uiState.mode !== 'REMOVE_WALL') return;

    setGameState(prev => {
      const nextState = { ...prev, conversionHistory: [], uiState: { ...prev.uiState, hasInteractedWithChecklist: true } };
      
      if (prev.uiState.mode === 'BUILD_WALL') {
        if (nextState.walls.includes(wallId)) return prev;
        
        if (nextState.walls.length >= 7) {
          showNotification("Maximum of 7 walls reached! You cannot build any more walls.", 'error');
          return prev;
        }

        nextState.walls = [...nextState.walls, wallId];
        
        if (nextState.walls.length === 7) {
          showNotification("You have built your 7th and final wall!", 'success');
        }

        nextState.uiState.wallsLeft -= 1;

        const checklist = [...nextState.uiState.checklist];
        const itemIndex = checklist.findIndex(i => i.actionType === 'BUILD_WALL' && i.status === 'DOING');
        
        if (itemIndex !== -1) {
          checklist[itemIndex] = { 
            ...checklist[itemIndex], 
            data: { ...checklist[itemIndex].data, count: nextState.uiState.wallsLeft } 
          };

          // Dungeon: Each time you build a wall, also gain 2 gold.
          const hasDungeon = nextState.cave.some(s => s.state === 'FURNISHED' && s.tile?.id === 'dungeon');
          if (hasDungeon) {
            const dungeonItem = {
              id: `dungeon_${Date.now()}_${wallId}`,
              text: 'Passive: Dungeon — Gain 2 gold',
              actionType: 'GAIN' as const,
              status: 'TODO' as const,
              optional: true,
              data: { goods: { gold: 2 } }
            };
            // Insert it right after the current BUILD_WALL item
            checklist.splice(itemIndex + 1, 0, dungeonItem);
          }
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

  const accessibleSpaces = gameState.uiState.mode === 'EXCAVATE' ? getAccessibleSpaces(gameState.cave, gameState.walls, gameState.uiState.activeActionTile === 'undermining') : [];

  const handleUndoAction = () => {
    if (gameState.uiState.undoSnapshot) {
      const nextState = JSON.parse(gameState.uiState.undoSnapshot);
      nextState.conversionHistory = [];
      setGameState(nextState);
    }
  };

  const handleExchange = (from: keyof GoodsState, to: keyof GoodsState) => {
    setGameState(prev => {
      if (prev.goods[from] <= 0) return prev;
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

  const isGameOver = gameState.uiState.mode === 'GAME_OVER';

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-8 font-sans flex flex-col overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full space-y-6 flex-1 flex flex-col overflow-hidden">
        {gameState.uiState.showScoreSummary && (
          <ScoreSummary 
            gameState={gameState} 
            onPlayAgain={startNewGame} 
            onClose={() => setGameState(prev => ({ ...prev, uiState: { ...prev.uiState, showScoreSummary: false } }))}
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
              <div className="flex items-center gap-2 text-stone-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                <div className="w-1.5 h-1.5 bg-stone-500 rounded-full"></div>
                Saving...
              </div>
            )}
            <button 
              onClick={() => setShowRestartConfirm(true)}
              className="text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded border border-stone-600 transition-colors"
            >
              Restart Game
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
                disabled={gameState.uiState.mode !== 'IDLE' || gameState.uiState.mode === 'GAME_OVER'}
                onTakeAction={handleTakeAction} 
              />
            </div>
          </section>

          {/* Bottom Area: Cave (Center) + Checklist (Middle) + Display (Right) */}
          <section className="flex flex-col xl:flex-row items-start flex-1 overflow-hidden gap-4">
            <div className="flex-1 overflow-auto pb-8 space-y-4">
              <GoodsTrack 
                goods={gameState.goods} 
                onExchange={handleExchange} 
                onUndoExchange={handleUndoConversion}
                canUndoExchange={gameState.conversionHistory.length > 0}
              />
              <CaveBoard 
                cave={gameState.cave} 
                walls={gameState.walls}
                isExcavating={gameState.uiState.mode === 'EXCAVATE'}
                isFurnishing={gameState.uiState.mode === 'FURNISH_SELECT_SPACE'}
                isRoomAction={gameState.uiState.mode === 'ROOM_ACTION'}
                isBuildingWall={gameState.uiState.mode === 'BUILD_WALL'}
                isRemovingWall={gameState.uiState.mode === 'REMOVE_WALL'}
                accessibleSpaces={accessibleSpaces}
                selectedRoomTile={selectedRoomTile}
                activatedRoomsThisTurn={gameState.uiState.activatedRoomsThisTurn}
                showIconicDescription={gameState.uiState.showIconicDescription}
                onSpaceClick={handleSpaceClick}
                onWallClick={handleWallClick}
              >
                <ChecklistUI 
                  checklist={gameState.uiState.checklist}
                  goods={gameState.goods}
                  showIconicDescription={gameState.uiState.showIconicDescription}
                  onExecute={handleExecuteChecklist}
                  onSkip={handleSkipChecklist}
                  onChoose={handleChooseChecklist}
                  onFinishTurn={handleFinishTurn}
                  onUndoAction={handleUndoAction}
                  canUndoAction={gameState.uiState.mode === 'RESOLVING_TURN' && !!gameState.uiState.undoSnapshot}
                  onCancel={
                    gameState.uiState.mode === 'FURNISH_SELECT_SPACE'
                      ? () => setGameState(prev => ({...prev, uiState: {...prev.uiState, mode: 'FURNISH_SELECT_ROOM', selectedRoomId: undefined}}))
                      : (['EXCAVATE', 'ROOM_ACTION', 'BUILD_WALL', 'REMOVE_WALL', 'PAY_DYNAMIC', 'FURNISH_SELECT_ROOM'].includes(gameState.uiState.mode) ? handleCancelItem : undefined)
                  }
                />
              </CaveBoard>
            </div>

            <div className="flex-none w-[620px] overflow-auto pb-8 h-full">
              <CentralDisplay 
                tiles={gameState.centralDisplay} 
                goods={gameState.goods}
                cave={gameState.cave}
                walls={gameState.walls}
                isSelectable={gameState.uiState.mode === 'FURNISH_SELECT_ROOM' || gameState.uiState.mode === 'FURNISH_SELECT_SPACE'}
                selectedRoomId={gameState.uiState.selectedRoomId}
                showIconicDescription={gameState.uiState.showIconicDescription}
                highlightFurnishable={gameState.uiState.highlightFurnishable}
                fixTileLocations={settingsState.fixTileLocations}
                onRoomClick={handleRoomClick}
                onToggleHighlight={handleToggleHighlight}
                onToggleFixTileLocations={() => setSettingsState(prev => ({ ...prev, fixTileLocations: !prev.fixTileLocations }))}
              />
            </div>
          </section>
        </main>
      </div>
      <SettingsPanel settingsState={settingsState} setSettingsState={setSettingsState} gameState={gameState} setGameState={setGameState} />
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-stone-800 border-2 border-orange-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-stone-100 mb-4">Restart Game?</h3>
            <p className="text-stone-400 mb-8">
              Are you sure you want to restart? All current progress will be lost and your save slot will be reset.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartGame}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
