import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export const userService = {
  async syncUserProfile(user: User): Promise<void> {
    const path = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, path);
      const userDoc = await getDoc(userDocRef);
      
      const userData: any = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      };

      // Only set the default role if the document doesn't exist yet
      if (!userDoc.exists()) {
        userData.role = 'user';
      }

      await setDoc(userDocRef, userData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserRole(uid: string): Promise<string | null> {
    const path = `users/${uid}`;
    try {
      const userDoc = await getDoc(doc(db, path));
      if (userDoc.exists()) {
        return userDoc.data().role || null;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }
};
