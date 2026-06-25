import { db } from '../lib/firebase/config';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { Membership } from '../types';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export const membershipService = {
  /**
   * Generates a deterministic membership document ID
   */
  getMembershipId(userId: string, solId: string): string {
    if (!userId || !solId) throw new Error('Both userId and solId are required to generate a membership ID.');
    return `${userId}_${solId}`;
  },

  /**
   * Retrieves a membership by userId and solId using deterministic ID lookup (O(1) complexity)
   */
  async getMembership(userId: string, solId: string): Promise<Membership | null> {
    const docId = this.getMembershipId(userId, solId);
    return runWithRetry(async () => {
      const membershipRef = doc(db, 'memberships', docId);
      const docSnap = await getDoc(membershipRef);
      if (docSnap.exists()) {
        return docSnap.data() as Membership;
      }
      return null;
    });
  },

  /**
   * Creates a membership. Enforces deterministic ID.
   */
  async createMembership(membership: Omit<Membership, 'id'>): Promise<string> {
    const docId = this.getMembershipId(membership.userId, membership.solId);
    const membershipRef = doc(db, 'memberships', docId);
    
    const newMembership: Membership = {
      ...membership,
      id: docId
    };

    return runWithRetry(async () => {
      await setDoc(membershipRef, newMembership);
      return docId;
    });
  },

  /**
   * Updates an existing membership
   */
  async updateMembership(
    userId: string, 
    solId: string, 
    updates: Partial<Omit<Membership, 'id' | 'userId' | 'solId'>>
  ): Promise<void> {
    const docId = this.getMembershipId(userId, solId);
    const membershipRef = doc(db, 'memberships', docId);
    
    return runWithRetry(async () => {
      await updateDoc(membershipRef, updates);
    });
  },

  /**
   * Deletes a membership
   */
  async deleteMembership(userId: string, solId: string): Promise<void> {
    const docId = this.getMembershipId(userId, solId);
    const membershipRef = doc(db, 'memberships', docId);
    
    return runWithRetry(async () => {
      await deleteDoc(membershipRef);
    });
  },

  /**
   * Queries the database for all memberships in a specific Sòl group
   */
  async getMembershipsForSol(solId: string): Promise<Membership[]> {
    if (!solId) throw new Error('solId is required to query memberships.');
    return runWithRetry(async () => {
      const membershipsRef = collection(db, 'memberships');
      const q = query(membershipsRef, where('solId', '==', solId));
      const querySnap = await getDocs(q);
      
      const list: Membership[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Membership);
      });
      return list;
    });
  },

  /**
   * Queries the database for all memberships for a specific user
   */
  async getMembershipsForUser(userId: string): Promise<Membership[]> {
    if (!userId) throw new Error('userId is required to query memberships.');
    return runWithRetry(async () => {
      const membershipsRef = collection(db, 'memberships');
      const q = query(membershipsRef, where('userId', '==', userId));
      const querySnap = await getDocs(q);
      
      const list: Membership[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Membership);
      });
      return list;
    });
  },

  /**
   * Performs a batch write to add multiple memberships at once (e.g., during bulk import or group setup)
   */
  async bulkCreateMemberships(memberships: Omit<Membership, 'id'>[]): Promise<void> {
    if (memberships.length === 0) return;
    
    return runWithRetry(async () => {
      const batch = writeBatch(db);
      
      memberships.forEach((m) => {
        const docId = this.getMembershipId(m.userId, m.solId);
        const ref = doc(db, 'memberships', docId);
        const fullDoc: Membership = {
          ...m,
          id: docId
        };
        batch.set(ref, fullDoc);
      });

      await batch.commit();
    });
  },

  /**
   * Paginated retrieval of memberships for a Sòl group
   */
  async getMembershipsForSolPaginated(solId: string, options: PaginationOptions): Promise<PaginatedResult<Membership>> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const membershipsRef = collection(db, 'memberships');
      const baseQuery = query(membershipsRef, where('solId', '==', solId));
      return getPaginatedQuery<Membership>(baseQuery, {
        ...options,
        collectionName: 'memberships'
      });
    });
  }
};
