import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { GameState } from '../types/game';
import { calculateScore } from '../utils/scoring';
import { incrementGamesFinished } from './statsService';
import { userService } from './userService';

export interface HighScoreEntry {
  id: string;
  userId: string;
  gameId: string;
  score: number;
  timestamp: any;
  cheatsUsed: boolean;
  gameType: string;
}

export const scoreService = {
  async saveHighScore(state: GameState): Promise<void> {
    const user = auth.currentUser;
    if (!user || state.uiState.mode !== 'GAME_OVER') return;

    const scoreDetails = calculateScore(state);
    const score = scoreDetails.totalVP;
    const gameType = state.uiState.gameType || 'ERA_I';
    
    // Ensure we have a valid gameId
    let gameId = state.gameId;
    if (!gameId || gameId === '') {
      console.warn('Game finished with empty gameId. Generating one now.');
      gameId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    try {
      // Use a composite ID to allow both Era I and Era II scores for the same game session to be saved separately
      const entryId = `${gameId}_${gameType}`;
      const logRef = doc(db, 'game_logs', entryId);
      
      // Check if this gameId has already been recorded to avoid double-counting global stats
      const qSameGame = query(collection(db, 'game_logs'), where('gameId', '==', gameId));
      const sameGameSnapshot = await getDocs(qSameGame);
      const isNewGameId = sameGameSnapshot.empty;

      console.log(`Saving score for game ${gameId} (${gameType}): ${score} (New: ${isNewGameId})`);
      await setDoc(logRef, {
        userId: user.uid,
        gameId: gameId,
        score: score,
        gameType: gameType,
        timestamp: serverTimestamp(),
        cheatsUsed: state.cheatsUsed
      }, { merge: true });

      if (isNewGameId) {
        console.log('Incrementing global and user games finished count');
        await incrementGamesFinished();
        await userService.incrementGamesFinished(user.uid);
      }

      // Pruning: Ensure the player only has top 10 high score entries for THIS game type
      const qType = query(
        collection(db, 'game_logs'),
        where('userId', '==', user.uid),
        where('gameType', '==', gameType),
        orderBy('score', 'desc')
      );
      
      const typeSnapshot = await getDocs(qType);
      if (typeSnapshot.docs.length > 10) {
        const toDelete = typeSnapshot.docs.slice(10);
        console.log(`Pruning ${toDelete.length} scores for ${gameType} to maintain top 10 limit`);
        for (const entry of toDelete) {
          await deleteDoc(doc(db, 'game_logs', entry.id));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_logs');
    }
  }
};
