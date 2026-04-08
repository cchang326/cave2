import { doc, increment, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface GlobalStats {
  visits: number;
  gamesFinished: number;
}

const STATS_DOC_ID = 'global';
const statsDocRef = doc(db, 'stats', STATS_DOC_ID);

export const incrementVisits = async () => {
  try {
    // Use setDoc with merge to initialize if it doesn't exist
    await setDoc(statsDocRef, { 
      visits: increment(1),
      gamesFinished: increment(0) // Ensure field exists
    }, { merge: true });
  } catch (error) {
    // We don't want to crash the app if stats fail, but we should log it
    console.error('Failed to increment visits:', error);
  }
};

export const incrementGamesFinished = async () => {
  try {
    await setDoc(statsDocRef, { 
      gamesFinished: increment(1) 
    }, { merge: true });
  } catch (error) {
    console.error('Failed to increment games finished:', error);
  }
};

export const subscribeToGlobalStats = (onUpdate: (stats: GlobalStats) => void) => {
  return onSnapshot(statsDocRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as GlobalStats);
    } else {
      onUpdate({ visits: 0, gamesFinished: 0 });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'stats/global');
  });
};
