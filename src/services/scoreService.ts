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

export interface HighScoreEntry {
  id: string;
  userId: string;
  gameId: string;
  score: number;
  timestamp: any;
  cheatsUsed: boolean;
  gameState: GameState;
}

export const scoreService = {
  async saveHighScore(state: GameState): Promise<void> {
    const user = auth.currentUser;
    if (!user || state.uiState.mode !== 'GAME_OVER') return;

    const scoreDetails = calculateScore(state);
    const score = scoreDetails.totalVP;
    const gameId = state.gameId;

    try {
      const logRef = doc(db, 'game_logs', gameId);
      
      // Check if this gameId has already been recorded to avoid double-counting global stats
      const qSameGame = query(collection(db, 'game_logs'), where('gameId', '==', gameId));
      const sameGameSnapshot = await getDocs(qSameGame);
      const isNewGameId = sameGameSnapshot.empty;

      console.log(`Saving score for game ${gameId}: ${score}`);
      await setDoc(logRef, {
        userId: user.uid,
        gameId: gameId,
        score: score,
        gameState: JSON.parse(JSON.stringify(state)),
        timestamp: serverTimestamp(),
        cheatsUsed: state.cheatsUsed
      }, { merge: true });

      if (isNewGameId) {
        await incrementGamesFinished();
      }

      // Global Pruning: Ensure the player only has 10 total high score entries across all games
      const qAll = query(
        collection(db, 'game_logs'),
        where('userId', '==', user.uid),
        orderBy('score', 'desc')
      );
      
      const allSnapshot = await getDocs(qAll);
      if (allSnapshot.docs.length > 10) {
        const toDelete = allSnapshot.docs.slice(10);
        console.log(`Pruning ${toDelete.length} scores to maintain top 10 limit`);
        for (const entry of toDelete) {
          await deleteDoc(doc(db, 'game_logs', entry.id));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_logs');
    }
  }
};
