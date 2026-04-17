import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { GameState } from '../types/game';

import { calculateScore } from '../utils/scoring';

export interface GameSave {
  id: string;
  state: GameState;
  updatedAt: Timestamp;
  isGameOver: boolean;
  metadata: {
    round: number;
    turn: number;
    score: number;
  };
}

const SLOTS = ['slot1', 'slot2', 'slot3'];

export const saveService = {
  async saveGame(slotId: string, state: GameState): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const path = `users/${user.uid}/gameSaves/${slotId}`;
    try {
      const isGameOver = state.uiState.mode === 'GAME_OVER';
      // Calculate score if game is over using the central utility
      const scoreDetails = calculateScore(state);
      const score = isGameOver ? scoreDetails.totalVP : 0;

      // Firestore does not support 'undefined' values. 
      // We sanitize the state by stringifying and parsing it, which removes undefined keys.
      // We also explicitly remove undoSnapshot to keep the save size small.
      // We do this BEFORE stringifying to avoid memory issues and ensure it's removed.
      const { undoSnapshot, ...uiStateWithoutSnapshot } = state.uiState;
      const stateToSave = { 
        ...state, 
        uiState: uiStateWithoutSnapshot 
      };
      
      const sanitizedState = JSON.parse(JSON.stringify(stateToSave));

      await setDoc(doc(db, path), {
        state: sanitizedState,
        updatedAt: serverTimestamp(),
        isGameOver,
        metadata: {
          round: state.actionBoard.round,
          turn: state.actionBoard.turn,
          score,
          gameType: state.uiState.gameType || 'ERA_I'
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getSaves(): Promise<GameSave[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const path = `users/${user.uid}/gameSaves`;
    try {
      const snapshot = await getDocs(collection(db, path));
      const saves = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GameSave));
      
      // Sort in memory to avoid potential index issues with single-field orderBy on new collections
      return saves.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async getMostRecentUnfinishedSave(): Promise<GameSave | null> {
    const saves = await this.getSaves();
    return saves.find(s => !s.isGameOver) || null;
  },

  async findOpenSlot(): Promise<string> {
    const saves = await this.getSaves();
    
    // 1. Check for empty slots
    for (const slotId of SLOTS) {
      if (!saves.find(s => s.id === slotId)) {
        return slotId;
      }
    }

    // 2. Check for oldest finished game
    const finishedSaves = saves.filter(s => s.isGameOver).sort((a, b) => a.updatedAt.toMillis() - b.updatedAt.toMillis());
    if (finishedSaves.length > 0) {
      return finishedSaves[0].id;
    }

    // 3. Fallback: oldest unfinished game
    const allSaves = [...saves].sort((a, b) => a.updatedAt.toMillis() - b.updatedAt.toMillis());
    return allSaves[0].id;
  }
};
