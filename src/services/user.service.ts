import { db } from '../lib/firebase/config';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  runTransaction,
  collection,
  query,
  limit,
  getDocs
} from 'firebase/firestore';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  role: 'maman_sol' | 'member';
  language: 'creole' | 'french' | 'english';
  createdAt: string;
  updatedAt: string;
}

export const userService = {
  /**
   * Retrieves a user document by its unique UID, with automated retry.
   */
  async getUser(uid: string): Promise<FirestoreUser | null> {
    if (!uid) throw new Error('User UID is required.');
    
    return runWithRetry(async () => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as FirestoreUser;
      }
      return null;
    });
  },

  /**
   * Creates a new user in the system using an atomic transaction with retry.
   */
  async createUser(user: Omit<FirestoreUser, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!user.uid) throw new Error('User UID is required for creation.');
    const userRef = doc(db, 'users', user.uid);
    
    return runWithRetry(async () => {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          throw new Error(`User with UID ${user.uid} already exists.`);
        }
        
        const timestamp = new Date().toISOString();
        const newUserData: FirestoreUser = {
          ...user,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        transaction.set(userRef, newUserData);
      });
    });
  },

  /**
   * Updates an existing user's profile metadata and refreshes updatedAt, with retry.
   */
  async updateUser(uid: string, updates: Partial<Omit<FirestoreUser, 'uid' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!uid) throw new Error('User UID is required for updates.');
    const userRef = doc(db, 'users', uid);
    
    return runWithRetry(async () => {
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    });
  },

  /**
   * Deletes a user, with retry.
   */
  async deleteUser(uid: string): Promise<void> {
    if (!uid) throw new Error('User UID is required for deletion.');
    const userRef = doc(db, 'users', uid);
    
    return runWithRetry(async () => {
      await deleteDoc(userRef);
    });
  },

  /**
   * Paginated user list query. Useful for management panels.
   */
  async getUsersPaginated(options: PaginationOptions): Promise<PaginatedResult<FirestoreUser>> {
    return runWithRetry(async () => {
      const usersRef = collection(db, 'users');
      const baseQuery = query(usersRef);
      return getPaginatedQuery<FirestoreUser>(baseQuery, {
        ...options,
        collectionName: 'users'
      });
    });
  }
};
